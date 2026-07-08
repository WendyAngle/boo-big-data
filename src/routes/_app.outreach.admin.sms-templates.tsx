import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, CheckCircle2, Clock, XCircle, Copy } from "lucide-react";
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

type Status = "approved" | "pending" | "rejected";

interface Tpl {
  id: string;
  name: string;
  channel: "marketing" | "otp" | "notification";
  locale: string;
  content: string;
  status: Status;
  updatedAt: string;
  submittedBy: string;
  reviewer?: string;
  rejectReason?: string;
}

const SEED: Tpl[] = [
  {
    id: "t1",
    name: "首触 · 产品介绍 EN",
    channel: "marketing",
    locale: "en-US",
    content:
      "Hi {{联系人名}}, this is {{我的姓名}} from {{我的公司}}. We help {{行业}} companies cut sourcing cost by 20%. Interested in a 15-min chat? Reply STOP to opt out.",
    status: "approved",
    updatedAt: "2026-07-01",
    submittedBy: "李经理",
    reviewer: "合规组",
  },
  {
    id: "t2",
    name: "跟进 · 报价请求 中文",
    channel: "marketing",
    locale: "zh-CN",
    content:
      "{{联系人名}}您好，我是{{我的公司}}的{{我的姓名}}。上次沟通提到的{{产品名}}报价已整理好，可否留个邮箱？回复T退订。",
    status: "approved",
    updatedAt: "2026-07-02",
    submittedBy: "王销售",
    reviewer: "合规组",
  },
  {
    id: "t3",
    name: "通知 · 订单发货",
    channel: "notification",
    locale: "zh-CN",
    content: "您的订单{{订单号}}已发货，物流单号：{{运单号}}，预计{{预计送达}}送达。",
    status: "approved",
    updatedAt: "2026-06-20",
    submittedBy: "系统",
    reviewer: "合规组",
  },
  {
    id: "t4",
    name: "验证码 · 登录",
    channel: "otp",
    locale: "multi",
    content: "【Boo】您的验证码是 {{code}}，5 分钟内有效，请勿泄露。",
    status: "approved",
    updatedAt: "2026-06-10",
    submittedBy: "系统",
    reviewer: "合规组",
  },
  {
    id: "t5",
    name: "促销 · 618 大促",
    channel: "marketing",
    locale: "zh-CN",
    content: "{{联系人名}}亲，618 全场 5 折起，速抢！点击 {{link}} 查看。回复 TD 退订。",
    status: "pending",
    updatedAt: "2026-07-06",
    submittedBy: "运营组",
  },
  {
    id: "t6",
    name: "催单 · 未回复",
    channel: "marketing",
    locale: "en-US",
    content:
      "Hey {{联系人名}}, just checking in on my last email — worth a quick call? --{{我的姓名}}",
    status: "rejected",
    updatedAt: "2026-07-05",
    submittedBy: "张销售",
    reviewer: "合规组",
    rejectReason: "缺少退订说明（STOP/退订字样）",
  },
];

function SmsTemplatesPage() {
  const [list, setList] = useState<Tpl[]>(SEED);
  const [tab, setTab] = useState<"all" | Status>("all");
  const [addOpen, setAddOpen] = useState(false);

  const counts = {
    all: list.length,
    approved: list.filter((t) => t.status === "approved").length,
    pending: list.filter((t) => t.status === "pending").length,
    rejected: list.filter((t) => t.status === "rejected").length,
  };

  const filtered = tab === "all" ? list : list.filter((t) => t.status === tab);

  function submitNew(t: Omit<Tpl, "id" | "status" | "updatedAt" | "submittedBy">) {
    const rec: Tpl = {
      ...t,
      id: `t_${Date.now().toString(36)}`,
      status: "pending",
      updatedAt: new Date().toISOString().slice(0, 10),
      submittedBy: "我",
    };
    setList((s) => [rec, ...s]);
    toast.success("已提交审核，预计 1 个工作日内反馈");
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
              <div className="flex flex-col gap-1 shrink-0">
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
              </div>
            </div>
          ))}
        </div>
      </Card>

      <NewTplDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={submitNew} />
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
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (t: Omit<Tpl, "id" | "status" | "updatedAt" | "submittedBy">) => void;
}) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Tpl["channel"]>("marketing");
  const [locale, setLocale] = useState("zh-CN");
  const [content, setContent] = useState("");

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
          <DialogTitle>新建短信模板</DialogTitle>
        </DialogHeader>
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
          <Button onClick={submit}>提交审核</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}