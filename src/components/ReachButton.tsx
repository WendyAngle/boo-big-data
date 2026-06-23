import { useMemo, useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle, Clock, MailWarning, Mailbox as MailboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useUsableMailboxes, getDefaultUsableMailbox } from "@/lib/mailboxes";
import {
  createReach,
  useLedger,
  getReachStatus,
  type ReachChannel,
  type TargetKind,
  COST_REACH,
} from "@/lib/credits-ledger";

interface Props {
  targetKind: TargetKind;
  targetId: string;
  targetName: string;
  parentRef?: { id: string; name: string };
  channel: ReachChannel;
  platform?: string;
  detail: string;
  disabled?: boolean;
  size?: "sm" | "xs";
  className?: string;
}

export function ReachButton({
  targetKind,
  targetId,
  targetName,
  parentRef,
  channel,
  platform,
  detail,
  disabled,
  size = "xs",
  className,
}: Props) {
  const ledger = useLedger();
  const [open, setOpen] = useState(false);
  const [noMailboxOpen, setNoMailboxOpen] = useState(false);
  const [senderId, setSenderId] = useState<string>("");
  const navigate = useNavigate();
  const mailboxes = useUsableMailboxes();
  const isEmail = channel === "email";
  const sender = useMemo(
    () => mailboxes.find((m) => m.id === senderId) ?? getDefaultUsableMailbox(mailboxes),
    [mailboxes, senderId],
  );

  // 找 (target, channel, platform) 最近一次未结束的触达
  const active = useMemo(() => {
    const found = ledger.find(
      (e) =>
        e.kind === "reach" &&
        e.targetKind === targetKind &&
        e.targetId === targetId &&
        e.channel === channel &&
        (platform ? e.platform === platform : true),
    );
    if (!found) return null;
    const st = getReachStatus(found);
    return { entry: found, status: st };
  }, [ledger, targetKind, targetId, channel, platform]);

  const inFlight = active && (active.status === "pending" || active.status === "in_progress");
  const channelLabel = { email: "邮件", phone: "电话", social: "社媒" }[channel];

  const confirm = () => {
    if (isEmail && !sender) {
      toast.error("请先选择发件邮箱");
      return;
    }
    createReach({
      targetKind,
      targetId,
      targetName,
      parentRef,
      channel,
      platform,
      detail,
      senderEmail: isEmail ? sender?.email : undefined,
    });
    setOpen(false);
    toast.success(
      isEmail
        ? `邮件已加入发送队列，扣除 ${COST_REACH} 积分`
        : `已加入触达队列，扣除 ${COST_REACH} 积分`,
      {
        description: isEmail
          ? `通过 ${sender?.email} 发送邮件至 ${targetName}，可在「触达」模块查看进度`
          : `通过${channelLabel}触达 ${targetName}，可在「触达」模块查看进度`,
      },
    );
  };

  const verb = isEmail ? "发送邮件" : "触达";
  let label: React.ReactNode = (
    <>
      <Send className="h-3 w-3" />
      {verb}
    </>
  );
  let tone =
    "border-primary/30 text-primary hover:bg-primary/10 bg-primary/5";
  if (inFlight) {
    label =
      active!.status === "pending" ? (
        <>
          <Clock className="h-3 w-3" />
          {isEmail ? "待发送" : "待触达"}
        </>
      ) : (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          {isEmail ? "发送中" : "触达中"}
        </>
      );
    tone = "border-amber-200 text-amber-700 bg-amber-50";
  } else if (active?.status === "success") {
    label = (
      <>
        <CheckCircle2 className="h-3 w-3" />
        {isEmail ? "再次发送" : "再次触达"}
      </>
    );
    tone = "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100";
  } else if (active?.status === "failed") {
    label = (
      <>
        <XCircle className="h-3 w-3" />
        {isEmail ? "重新发送" : "重新触达"}
      </>
    );
    tone = "border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100";
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || !!inFlight}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isEmail && mailboxes.length === 0) {
            setNoMailboxOpen(true);
            return;
          }
          if (isEmail) {
            setSenderId(getDefaultUsableMailbox(mailboxes)?.id ?? "");
          }
          setOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
          size === "sm" ? "h-7 px-2.5 text-sm" : "h-6",
          tone,
          className,
        )}
      >
        {label}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              {isEmail
                ? "发送邮件"
                : `通过${channelLabel}${platform ? `（${platform}）` : ""}触达`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                  本次触达将消耗 <span className="font-semibold text-rose-600">{COST_REACH} 积分</span>，并记录到「触达」与「账单」模块。
                </div>
                <div className="rounded-md bg-muted/60 p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">触达对象</span>
                    <span className="font-medium text-foreground">{targetName}</span>
                  </div>
                  {parentRef && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">所属企业</span>
                      <span className="font-medium text-foreground">{parentRef.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">渠道</span>
                    <span className="font-medium text-foreground">
                      {channelLabel}
                      {platform ? ` · ${platform}` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">明细</span>
                    <span className="font-mono text-foreground truncate max-w-[260px]">{detail}</span>
                  </div>
                </div>
                {isEmail && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <MailboxIcon className="h-3.5 w-3.5" />
                      发件邮箱
                    </div>
                    {mailboxes.length === 1 ? (
                      <div className="text-xs">
                        <span className="font-mono">{mailboxes[0].email}</span>
                        <span className="text-muted-foreground ml-2">
                          · {mailboxes[0].displayName}
                        </span>
                      </div>
                    ) : (
                      <Select value={sender?.id ?? ""} onValueChange={setSenderId}>
                        <SelectTrigger className="h-9 bg-background">
                          <SelectValue placeholder="选择发件邮箱" />
                        </SelectTrigger>
                        <SelectContent>
                          {mailboxes.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <span className="font-mono">{m.email}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                · {m.displayName}
                                {m.isDefault ? " · 默认" : ""}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm}
              disabled={isEmail && !sender}
              className="bg-primary"
            >
              {isEmail ? `确认发送（-${COST_REACH}）` : `确认触达（-${COST_REACH}）`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={noMailboxOpen} onOpenChange={setNoMailboxOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <MailWarning className="h-5 w-5" />
              未配置发件邮箱
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  邮件触达需要先在「邮箱」模块配置至少一个状态为「正常」的发件邮箱，用于发送本次邮件。
                </p>
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  请先前往「系统管理 · 邮箱」新增邮箱并完成连接测试。
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary"
              onClick={() => {
                setNoMailboxOpen(false);
                navigate({ to: "/outreach/mailboxes" });
              }}
            >
              去设置邮箱
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}