import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, CheckCircle2, Clock, XCircle, Copy, Pencil, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useSmsTemplates,
  addSmsTemplate,
  updateSmsTemplate,
  withdrawSmsTemplate,
  type SmsTemplate as Tpl,
  type SmsTplStatus as Status,
} from "@/lib/sms-templates-store";

export const Route = createFileRoute("/_app/outreach/admin/sms-templates")({
  head: () => ({
    meta: [
      { title: "短信模板 · 系统管理 | Boo数据平台" },
      {
        name: "description",
        content: "维护并送审营销/通知/验证码短信模板，仅审批通过的模板可用于批量发送。",
      },
    ],
  }),
  component: SmsTemplatesPage,
});

function SmsTemplatesPage() {
  const list = useSmsTemplates();
  const [tab, setTab] = useState<"all" | Status>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Tpl | null>(null);

  const counts = {
    all: list.length,
    approved: list.filter((t) => t.status === "approved").length,
    pending: list.filter((t) => t.status === "pending").length,
    rejected: list.filter((t) => t.status === "rejected").length,
  };

  const filtered = tab === "all" ? list : list.filter((t) => t.status === tab);

  function submitNew(t: Omit<Tpl, "id" | "status" | "updatedAt" | "submittedBy">) {
    addSmsTemplate(t);
    toast.success("已提交审核，预计 1 个工作日内反馈");
  }

  function submitEdit(patch: Omit<Tpl, "id" | "status" | "updatedAt" | "submittedBy">) {
    if (!editing) return;
    updateSmsTemplate(editing.id, patch);
    toast.success(
      editing.status === "rejected" ? "已重新提交审核" : "已保存并重新提交审核",
    );
    setEditing(null);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            短信模板
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            营销类模板需通过合规审批后方可用于批量发送；验证码/通知类模板走独立审批流程。
            模板必须包含退订提示（STOP / 退订 / TD 等）。
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          新建模板
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-1 border-b bg-muted/40 px-4 py-2">
          {(
            [
              { k: "all", label: "全部" },
              { k: "approved", label: "已通过" },
              { k: "pending", label: "待审核" },
              { k: "rejected", label: "未通过" },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                tab === t.k
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
              <span className="ml-1 text-[10px] opacity-70">
                ({counts[t.k as keyof typeof counts]})
              </span>
            </button>
          ))}
        </div>
        <div className="divide-y">
          {filtered.map((t) => (
            <div key={t.id} className="p-4 flex gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{t.name}</span>
                  <StatusBadge status={t.status} />
                  <Badge variant="outline" className="text-[10px]">
                    {t.channel === "otp" ? "验证码" : t.channel === "marketing" ? "营销" : "通知"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {t.locale}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-foreground/80 bg-muted/50 rounded p-2 font-mono whitespace-pre-wrap">
                  {t.content}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span>提交人：{t.submittedBy}</span>
                  {t.reviewer && <span>审核：{t.reviewer}</span>}
                  <span>更新：{t.updatedAt}</span>
                  {t.rejectReason && (
                    <span className="text-rose-600">拒因：{t.rejectReason}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0 w-24">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(t.content);
                    toast.success("已复制模板内容");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  复制
                </Button>
                {t.status === "rejected" && (
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground"
                    onClick={() => setEditing(t)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    修改重提
                  </Button>
                )}
                {t.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      修改
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => {
                        withdrawSmsTemplate(t.id);
                        toast.success("已撤回");
                      }}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      撤回
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <NewTplDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={submitNew} />
      <NewTplDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSubmit={submitEdit}
        initial={editing}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "approved")
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle2 className="h-3 w-3" /> 已通过
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <Clock className="h-3 w-3" /> 待审核
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1">
      <XCircle className="h-3 w-3" /> 未通过
    </Badge>
  );
}

function NewTplDialog({
  open,
  onOpenChange,
  onSubmit,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (t: Omit<Tpl, "id" | "status" | "updatedAt" | "submittedBy">) => void;
  initial?: Tpl | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [channel, setChannel] = useState<Tpl["channel"]>(initial?.channel ?? "marketing");
  const [locale, setLocale] = useState(initial?.locale ?? "zh-CN");
  const [content, setContent] = useState(initial?.content ?? "");
  const isEdit = !!initial;

  // 每次打开时用最新 initial 重置字段
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setChannel(initial?.channel ?? "marketing");
    setLocale(initial?.locale ?? "zh-CN");
    setContent(initial?.content ?? "");
  }, [open, initial]);

  function submit() {
    if (!name.trim() || !content.trim()) {
      toast.error("请填写名称与内容");
      return;
    }
    if (channel === "marketing" && !/STOP|退订|TD/i.test(content)) {
      toast.error("营销类模板必须包含退订提示（STOP / 退订 / TD）");
      return;
    }
    onSubmit({ name: name.trim(), channel, locale, content: content.trim() });
    setName("");
    setContent("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? initial?.status === "rejected"
                ? "修改并重提审核"
                : "修改待审模板"
              : "新建短信模板"}
          </DialogTitle>
        </DialogHeader>
        {isEdit && initial?.status === "rejected" && initial.rejectReason && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            上次未通过原因：{initial.rejectReason}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">模板名称</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">渠道类型</label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Tpl["channel"])}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">营销</SelectItem>
                  <SelectItem value="notification">通知</SelectItem>
                  <SelectItem value="otp">验证码</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">语言 / 地区</label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">中文</SelectItem>
                  <SelectItem value="en-US">英文</SelectItem>
                  <SelectItem value="multi">多语言</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">内容（可插入变量 {"{{...}}"}）</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="mt-1 font-mono text-xs"
              placeholder="Hi {{联系人名}}, ... Reply STOP to opt out."
            />
            <div className="mt-1 text-[11px] text-muted-foreground">
              长度：{content.length} 字符 · 预计 {Math.max(1, Math.ceil(content.length / 70))} 段
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>{isEdit ? "重新提交审核" : "提交审核"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}