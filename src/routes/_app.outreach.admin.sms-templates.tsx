import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, CheckCircle2, Clock, XCircle, Copy, Pencil, Undo2, Eye, Sparkles, AlertTriangle, Send, Radio, ShieldCheck, ThumbsUp, ThumbsDown } from "lucide-react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useSmsTemplates,
  addSmsTemplate,
  updateSmsTemplate,
  withdrawSmsTemplate,
  type SmsTemplate as Tpl,
  type SmsTplStatus as Status,
  useSmsFilings,
  useSmsApplications,
  upsertFiling,
  approveApplication,
  rejectApplication,
  getFilingsByTemplate,
  FILING_CHANNELS,
  type FilingChannel,
  type FilingStatus,
  type TemplateFiling,
  type TemplateApplication,
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
  const applications = useSmsApplications();
  const filings = useSmsFilings();
  const [tab, setTab] = useState<"all" | Status>("all");
  const [topTab, setTopTab] = useState<"library" | "applications" | "filings">("library");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [previewing, setPreviewing] = useState<Tpl | null>(null);
  const [filingCtx, setFilingCtx] = useState<{ tpl: Tpl; channel: FilingChannel } | null>(null);
  const [reviewingApp, setReviewingApp] = useState<TemplateApplication | null>(null);

  const counts = {
    all: list.length,
    approved: list.filter((t) => t.status === "approved").length,
    pending: list.filter((t) => t.status === "pending").length,
    rejected: list.filter((t) => t.status === "rejected").length,
  };
  const appCounts = {
    submitted: applications.filter((a) => a.status === "submitted").length,
    total: applications.length,
  };
  const filingCounts = {
    approved: filings.filter((f) => f.status === "approved").length,
    submitted: filings.filter((f) => f.status === "submitted").length,
    rejected: filings.filter((f) => f.status === "rejected").length,
    expiring: filings.filter((f) => f.status === "approved" && f.expireAt && daysUntil(f.expireAt) <= 30).length,
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
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 lg:p-7 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">短信模板</h1>
              <p className="text-white/85 text-sm mt-0.5 max-w-2xl">
                营销类模板需通过合规审批后方可用于批量发送；验证码/通知类模板走独立审批流程。模板必须包含退订提示（STOP / 退订 / TD 等）。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6 text-white shrink-0">
            <MetricBlock label="模板总数" value={counts.all} suffix="个" />
            <MetricBlock label="已通过" value={counts.approved} suffix="个" />
            <MetricBlock label="待审申请" value={appCounts.submitted} suffix="个" warn={appCounts.submitted > 0} />
            <MetricBlock label="即将过期" value={filingCounts.expiring} suffix="条" warn={filingCounts.expiring > 0} hint="30 天内到期报备" />
          </div>
        </div>
      </section>

      {/* 顶部 Tab：模板库 / 用户申请 / 报备记录 */}
      <div className="flex items-center justify-between gap-2 border-b">
        <div className="flex items-center gap-1">
          {(
            [
              { k: "library", label: "模板库", n: counts.all },
              { k: "applications", label: "用户申请", n: appCounts.submitted, warn: appCounts.submitted > 0 },
              { k: "filings", label: "渠道报备", n: filingCounts.approved },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTopTab(t.k)}
              className={cn(
                "px-4 py-2 text-sm border-b-2 -mb-px transition-colors flex items-center gap-1.5",
                topTab === t.k ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] tabular-nums", "warn" in t && t.warn && "bg-amber-50 text-amber-700 border-amber-200")}>{t.n}</Badge>
            </button>
          ))}
        </div>
        {topTab === "library" && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            新建模板
          </Button>
        )}
      </div>

      {topTab === "library" && (
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
                {t.status === "approved" && (
                  <FilingMatrix template={t} onPick={(ch) => setFilingCtx({ tpl: t, channel: ch })} />
                )}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewing(t)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  预览
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
      )}

      {topTab === "applications" && (
        <ApplicationsPanel apps={applications} onReview={setReviewingApp} />
      )}

      {topTab === "filings" && (
        <FilingsPanel filings={filings} templates={list} onEdit={(tpl, ch) => setFilingCtx({ tpl, channel: ch })} />
      )}

      <NewTplDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={submitNew} />
      <NewTplDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSubmit={submitEdit}
        initial={editing}
      />
      <PreviewDialog
        template={previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
      />
      <FilingDialog ctx={filingCtx} onOpenChange={(o) => !o && setFilingCtx(null)} />
      <ReviewAppDialog app={reviewingApp} onOpenChange={(o) => !o && setReviewingApp(null)} />
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return _renderStatus(status);
}

function MetricBlock({ label, value, suffix, hint, warn }: {
  label: string; value: string | number; suffix?: string; hint?: string; warn?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-white/75">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {value}{suffix && <span className="text-sm font-medium text-white/80 ml-1">{suffix}</span>}
      </div>
      {hint && (
        <div className={cn("mt-0.5 text-[11px]", warn ? "text-amber-200" : "text-white/70")}>{hint}</div>
      )}
    </div>
  );
}

function _renderStatus(status: Status) {
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

/* ---------- 变量元数据 & 示例数据（ST-02 变量说明 / ST-03 预览） ---------- */

interface VarDef {
  key: string;
  desc: string;
  sample: string;
}

const VAR_GROUPS: Record<"system" | "contact" | "dynamic", { label: string; items: VarDef[] }> = {
  system: {
    label: "系统变量",
    items: [
      { key: "我的姓名", desc: "当前发送人姓名", sample: "John" },
      { key: "我的公司", desc: "当前发送人所属公司", sample: "TechCorp" },
      { key: "我的职位", desc: "当前发送人职位", sample: "Sales Manager" },
      { key: "我的邮箱", desc: "当前发送人的登录邮箱", sample: "john@techcorp.com" },
    ],
  },
  contact: {
    label: "联系人变量",
    items: [
      { key: "联系人名", desc: "收件联系人姓名（必填数据源）", sample: "Sarah" },
      { key: "联系人职位", desc: "联系人所在企业中的职位", sample: "Buyer" },
      { key: "联系人公司", desc: "联系人所属企业名称", sample: "Living Spaces LLC" },
      { key: "联系人国家", desc: "联系人所在国家（用于本地化）", sample: "United States" },
    ],
  },
  dynamic: {
    label: "动态变量",
    items: [
      { key: "行业", desc: "联系人所在行业类目", sample: "furniture" },
      { key: "产品名", desc: "本次推广的产品名称", sample: "Marble Countertop" },
      { key: "订单号", desc: "订单/运单编号（通知类）", sample: "BL20260112001" },
      { key: "验证码", desc: "OTP 场景一次性口令", sample: "482913" },
      { key: "折扣", desc: "促销活动优惠力度", sample: "20%" },
    ],
  },
};

function resolveSample(varName: string): string {
  for (const g of Object.values(VAR_GROUPS)) {
    const m = g.items.find((i) => i.key === varName);
    if (m) return m.sample;
  }
  return `{{${varName}}}`;
}

/** 渲染预览：{{变量}} 替换为示例值；未识别变量保留原样以便用户发现拼写错误 */
function renderPreview(content: string): { text: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const text = content.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, name: string) => {
    const key = name.trim();
    const sample = resolveSample(key);
    if (sample === `{{${key}}}`) unresolved.push(key);
    return sample;
  });
  return { text, unresolved: Array.from(new Set(unresolved)) };
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEdit = !!initial;

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setChannel(initial?.channel ?? "marketing");
    setLocale(initial?.locale ?? "zh-CN");
    setContent(initial?.content ?? "");
  }, [open, initial]);

  function insertVar(key: string) {
    const el = textareaRef.current;
    const token = `{{${key}}}`;
    if (!el) {
      setContent((c) => c + token);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + token + content.slice(end);
    setContent(next);
    // 恢复光标到插入尾
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const preview = useMemo(() => renderPreview(content), [content]);
  const hasOptOut = /STOP|退订|TD/i.test(content);

  function submit() {
    if (!name.trim() || !content.trim()) {
      toast.error("请填写名称与内容");
      return;
    }
    if (channel === "marketing" && !hasOptOut) {
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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? initial?.status === "rejected"
                ? "修改并重提审核"
                : "修改待审模板"
              : "新建短信模板"}
          </DialogTitle>
          <DialogDescription>
            使用 <code className="text-xs">{"{{变量名}}"}</code> 语法插入动态字段。右侧变量面板可直接点击插入到光标位置，下方预览区实时展示替换效果。
          </DialogDescription>
        </DialogHeader>
        {isEdit && initial?.status === "rejected" && initial.rejectReason && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            上次未通过原因：{initial.rejectReason}
          </div>
        )}

        <div className="grid grid-cols-5 gap-4">
          {/* 左：表单 */}
          <div className="col-span-3 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">模板名称</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="例：首触 · 产品介绍 EN"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">渠道类型</label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Tpl["channel"])}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">中文</SelectItem>
                    <SelectItem value="en-US">英文</SelectItem>
                    <SelectItem value="multi">多语言</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">
                  模板内容
                </label>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {content.length} 字符 · 预计 {Math.max(1, Math.ceil(content.length / 70))} 段
                </span>
              </div>
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="mt-1 font-mono text-xs"
                placeholder="Hi {{联系人名}}, this is {{我的姓名}} from {{我的公司}}. Reply STOP to opt out."
              />
              {channel === "marketing" && (
                <div className={cn(
                  "mt-1.5 text-[11px] flex items-start gap-1",
                  hasOptOut ? "text-emerald-600" : "text-rose-600",
                )}>
                  {hasOptOut ? <CheckCircle2 className="h-3 w-3 mt-0.5" /> : <AlertTriangle className="h-3 w-3 mt-0.5" />}
                  {hasOptOut ? "已包含退订提示（STOP / 退订 / TD）" : "营销类必须包含退订提示，否则无法保存"}
                </div>
              )}
            </div>

            {/* 预览面板（ST-03） */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                预览效果
                <span className="text-[10px] text-muted-foreground font-normal">
                  （示例数据）
                </span>
              </div>
              <div className="rounded bg-background border p-2.5 text-sm whitespace-pre-wrap font-mono min-h-[3rem]">
                {preview.text || <span className="text-muted-foreground">在上方输入模板内容即可预览…</span>}
              </div>
              {preview.unresolved.length > 0 && (
                <div className="text-[11px] text-amber-700 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5" />
                  未识别变量：{preview.unresolved.map((v) => `{{${v}}}`).join("、")}
                  <span className="text-muted-foreground">（发送时将保留原样）</span>
                </div>
              )}
            </div>
          </div>

          {/* 右：变量面板（ST-02） */}
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-1.5">可用变量（点击插入）</div>
            <Tabs defaultValue="contact" className="w-full">
              <TabsList className="grid grid-cols-3 h-8">
                <TabsTrigger value="system" className="text-xs">系统</TabsTrigger>
                <TabsTrigger value="contact" className="text-xs">联系人</TabsTrigger>
                <TabsTrigger value="dynamic" className="text-xs">动态</TabsTrigger>
              </TabsList>
              {(Object.keys(VAR_GROUPS) as Array<keyof typeof VAR_GROUPS>).map((k) => (
                <TabsContent key={k} value={k} className="mt-2 space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {VAR_GROUPS[k].items.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVar(v.key)}
                      className="w-full text-left rounded-md border bg-background hover:border-primary/50 hover:bg-primary/5 px-2.5 py-1.5 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-xs font-medium text-primary">{`{{${v.key}}}`}</code>
                        <span className="text-[10px] text-muted-foreground group-hover:text-primary">
                          插入 →
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {v.desc} · 示例：<span className="font-mono">{v.sample}</span>
                      </div>
                    </button>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit}>{isEdit ? "重新提交审核" : "提交审核"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 列表行独立的预览弹窗（ST-03 只读预览） */
function PreviewDialog({
  template,
  onOpenChange,
}: {
  template: Tpl | null;
  onOpenChange: (o: boolean) => void;
}) {
  const preview = useMemo(
    () => (template ? renderPreview(template.content) : { text: "", unresolved: [] }),
    [template],
  );
  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            模板预览
          </DialogTitle>
          <DialogDescription>
            使用示例数据替换 <code className="text-xs">{"{{变量}}"}</code> 后的实际发送效果。
          </DialogDescription>
        </DialogHeader>
        {template && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">原始模板</div>
              <div className="rounded border bg-muted/40 p-2.5 text-xs font-mono whitespace-pre-wrap">
                {template.content}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">预览效果</div>
              <div className="rounded border bg-emerald-50/50 border-emerald-200 p-2.5 text-sm whitespace-pre-wrap">
                {preview.text}
              </div>
              {preview.unresolved.length > 0 && (
                <div className="text-[11px] text-amber-700 mt-1.5 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5" />
                  未识别变量：{preview.unresolved.map((v) => `{{${v}}}`).join("、")}
                </div>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              长度：{template.content.length} 字符 · 预计 {Math.max(1, Math.ceil(template.content.length / 70))} 段
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}