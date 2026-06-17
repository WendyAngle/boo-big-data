import { useMemo, useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
    createReach({
      targetKind,
      targetId,
      targetName,
      parentRef,
      channel,
      platform,
      detail,
    });
    setOpen(false);
    toast.success(`已加入触达队列，扣除 ${COST_REACH} 积分`, {
      description: `通过${channelLabel}触达 ${targetName}，可在「触达」模块查看进度`,
    });
  };

  let label: React.ReactNode = (
    <>
      <Send className="h-3 w-3" />
      触达
    </>
  );
  let tone =
    "border-primary/30 text-primary hover:bg-primary/10 bg-primary/5";
  if (inFlight) {
    label =
      active!.status === "pending" ? (
        <>
          <Clock className="h-3 w-3" />
          待触达
        </>
      ) : (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          触达中
        </>
      );
    tone = "border-amber-200 text-amber-700 bg-amber-50";
  } else if (active?.status === "success") {
    label = (
      <>
        <CheckCircle2 className="h-3 w-3" />
        再次触达
      </>
    );
    tone = "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100";
  } else if (active?.status === "failed") {
    label = (
      <>
        <XCircle className="h-3 w-3" />
        重新触达
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
              通过{channelLabel}{platform ? `（${platform}）` : ""}触达
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
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} className="bg-primary">
              确认触达（-{COST_REACH}）
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}