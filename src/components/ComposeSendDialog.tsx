import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  Mailbox as MailboxIcon,
  X,
  Loader2,
  Eye,
  Trash2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  MESSAGE_VARIABLES,
  renderTemplate,
  smsSegments,
  myContext,
  type Recipient,
  type VarContext,
} from "@/lib/message-vars";
import {
  useUsableMailboxes,
  getDefaultUsableMailbox,
  type Mailbox,
} from "@/lib/mailboxes";
import {
  createReach,
  chargeAiGeneration,
  costForChannel,
  COST_AI_EMAIL,
  COST_AI_SMS,
} from "@/lib/credits-ledger";
import { useLeadProfile } from "@/lib/lead-profile";
import { useCurrentUser } from "@/lib/current-user";
import { generateAiContent } from "@/lib/api/ai-compose.functions";

export type ComposeChannel = "email" | "phone";

export interface ComposeSendDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: ComposeChannel;
  recipients: Recipient[];
  /** 已知发件邮箱（来自上层），不传则内部使用默认邮箱 */
  initialSenderId?: string;
  /** 发送成功回调（已扣费、已生成触达记录） */
  onSent?: (count: number) => void;
}

export function ComposeSendDialog({
  open,
  onOpenChange,
  channel,
  recipients: incomingRecipients,
  initialSenderId,
  onSent,
}: ComposeSendDialogProps) {
  const isEmail = channel === "email";
  const mailboxes = useUsableMailboxes();
  const profile = useLeadProfile();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const my = myContext(profile, user);
  const callGenerate = useServerFn(generateAiContent);

  const [recipients, setRecipients] = useState<Recipient[]>(incomingRecipients);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [aiUsed, setAiUsed] = useState(false);
  const [aiCount, setAiCount] = useState(0);
  const [senderId, setSenderId] = useState<string>("");
  const [previewIdx, setPreviewIdx] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // 重置 state 每次打开
  useEffect(() => {
    if (!open) return;
    setRecipients(incomingRecipients);
    setPreviewIdx(0);
    setSubject("");
    setContent("");
    setAiUsed(false);
    setAiCount(0);
    if (isEmail) {
      setSenderId(
        initialSenderId ?? getDefaultUsableMailbox(mailboxes)?.id ?? mailboxes[0]?.id ?? "",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sender: Mailbox | undefined = useMemo(
    () => mailboxes.find((m) => m.id === senderId) ?? getDefaultUsableMailbox(mailboxes),
    [mailboxes, senderId],
  );

  const subjectRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [focusField, setFocusField] = useState<"subject" | "content">(
    isEmail ? "subject" : "content",
  );

  function insertVarAt(field: "subject" | "content", v: string) {
    const token = `{${v}}`;
    if (field === "subject") {
      const el = subjectRef.current;
      const s = subject;
      if (!el) return setSubject(s + token);
      const start = el.selectionStart ?? s.length;
      const end = el.selectionEnd ?? s.length;
      const next = s.slice(0, start) + token + s.slice(end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      const el = contentRef.current;
      const s = content;
      if (!el) return setContent(s + token);
      const start = el.selectionStart ?? s.length;
      const end = el.selectionEnd ?? s.length;
      const next = s.slice(0, start) + token + s.slice(end);
      setContent(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    }
  }

  const previewRecipient = recipients[Math.min(previewIdx, recipients.length - 1)];
  const previewSubject = previewRecipient
    ? renderTemplate(subject, previewRecipient.ctx)
    : "";
  const previewContent = previewRecipient
    ? renderTemplate(content, previewRecipient.ctx)
    : "";

  const missingContact = useMemo(
    () => recipients.filter((r) => !r.ctx.联系人名 || !r.ctx.联系人名.trim()).length,
    [recipients],
  );

  // 费用合计
  const unit = costForChannel(channel === "phone" ? "phone" : "email");
  const sendCostPerRecipient = isEmail
    ? unit
    : unit * smsSegments(content || ""); // 短信按字符拆分
  const sendTotal = recipients.length * sendCostPerRecipient;
  const aiCost = aiCount * (isEmail ? COST_AI_EMAIL : COST_AI_SMS);
  const grandTotal = sendTotal + aiCost;

  const canSend =
    recipients.length > 0 &&
    (!isEmail || !!sender) &&
    (!isEmail || subject.trim().length > 0) &&
    content.trim().length > 0;

  function handleSend() {
    if (!canSend) return;
    let n = 0;
    for (const r of recipients) {
      const finalSubject = isEmail ? renderTemplate(subject, r.ctx) : undefined;
      const finalContent = renderTemplate(content, r.ctx);
      createReach({
        targetKind: r.targetKind,
        targetId: r.targetId,
        targetName: r.name,
        parentRef: r.parentRef,
        channel: isEmail ? "email" : "phone",
        detail: r.address,
        senderEmail: isEmail ? sender?.email : undefined,
        subject: finalSubject,
        content: finalContent,
        aiGenerated: aiUsed,
      });
      n++;
    }
    onOpenChange(false);
    onSent?.(n);
    toast.success(
      isEmail
        ? `已加入发送队列：${n} 封邮件`
        : `已加入发送队列：${n} 条短信`,
      {
        description: `共扣除 ${grandTotal} 积分${
          aiCost > 0 ? `（含 AI 文案 ${aiCost} 积分）` : ""
        }，可在「触达」模块查看进度`,
      },
    );
  }

  async function handleAiGenerate(params: {
    scene: string;
    tone: "formal" | "friendly" | "concise";
    language: "zh" | "en";
    extra?: string;
  }) {
    setAiLoading(true);
    try {
      const sample = recipients[0];
      const res = await callGenerate({
        data: {
          channel: isEmail ? "email" : "sms",
          ...params,
          myCompany: profile.companyName,
          myName: user.name,
          sampleEnterprise: sample?.ctx.企业名,
        },
      });
      // 调用成功才扣 AI 费用
      chargeAiGeneration({
        channel: isEmail ? "email" : "phone",
        targetName: sample?.name ?? "AI 生成",
      });
      if (isEmail && res.subject) setSubject(res.subject);
      if (res.content) setContent(res.content);
      setAiUsed(true);
      setAiCount((c) => c + 1);
      setAiOpen(false);
      toast.success(`AI 已生成${isEmail ? "邮件" : "短信"}文案，扣除 ${
        isEmail ? COST_AI_EMAIL : COST_AI_SMS
      } 积分`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("AI 生成失败", { description: msg });
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            {isEmail ? "撰写并发送邮件" : "撰写并发送短信"}
            <Badge variant="secondary" className="ml-1 font-normal">
              {recipients.length === 1 ? "单条" : `批量 ${recipients.length} 条`}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">
            撰写发送内容并确认积分消耗
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* 收件人 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                收件人（{recipients.length}）
              </Label>
              {recipients.length === 0 && (
                <span className="text-xs text-rose-600">
                  无有效收件人，请关闭后重试
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-md border bg-muted/30 p-2 max-h-28 overflow-y-auto">
              {recipients.map((r) => (
                <span
                  key={r.key}
                  className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground font-mono">
                    · {r.address}
                  </span>
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRecipients((prev) => prev.filter((x) => x.key !== r.key))
                      }
                      className="ml-0.5 text-muted-foreground hover:text-rose-600"
                      aria-label="移除"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </section>

          {/* 发件人（邮件） */}
          {isEmail && (
            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MailboxIcon className="h-3.5 w-3.5" /> 发件邮箱
              </Label>
              {mailboxes.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  尚未配置发件邮箱。
                  <button
                    type="button"
                    className="underline ml-1"
                    onClick={() => {
                      onOpenChange(false);
                      navigate({ to: "/outreach/mailboxes" });
                    }}
                  >
                    去设置
                  </button>
                </div>
              ) : (
                <Select value={sender?.id ?? ""} onValueChange={setSenderId}>
                  <SelectTrigger className="h-9">
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
            </section>
          )}

          {/* 撰写内容 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                撰写内容
                {aiUsed && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                  >
                    <Sparkles className="h-3 w-3" />
                    AI 已生成 · 可手动调整
                  </Badge>
                )}
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAiOpen(true)}
                className="h-7 gap-1"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {aiUsed ? "AI 重新生成" : "AI 生成"}
                <span className="text-xs text-muted-foreground">
                  -{isEmail ? COST_AI_EMAIL : COST_AI_SMS} 积分/次
                </span>
              </Button>
            </div>

            {/* 变量插入 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                插入变量（光标处插入到{focusField === "subject" ? "主题" : "正文"}）：
              </span>
              {MESSAGE_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVarAt(focusField, v)}
                  className="rounded border bg-background px-1.5 py-0.5 text-[11px] font-mono text-primary hover:bg-primary/10"
                >
                  {`{${v}}`}
                </button>
              ))}
            </div>

            {isEmail && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">主题 *</Label>
                <Input
                  ref={subjectRef}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setFocusField("subject")}
                  maxLength={120}
                  placeholder="例：{企业名}，关于 {行业} 出口合作的提案"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {isEmail ? "正文 *" : "短信内容 *"}
              </Label>
              <Textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setFocusField("content")}
                rows={isEmail ? 8 : 5}
                maxLength={isEmail ? 5000 : 300}
                placeholder={
                  isEmail
                    ? "你好 {联系人名}，我是 {我的公司} 的 {我的姓名}……"
                    : "{联系人名}您好，我是{我的公司}的{我的姓名}……"
                }
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {content.length} / {isEmail ? 5000 : 300} 字
                  {!isEmail && content && (
                    <span className="ml-2">
                      · 拆分 {smsSegments(content)} 条
                    </span>
                  )}
                </span>
                {missingContact > 0 && (
                  <span className="text-amber-600">
                    {missingContact} 条记录缺少联系人名，将以「您好」代替
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* 预览 */}
          {recipients.length > 0 && (
            <section className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  预览（变量已替换）
                  <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-normal text-muted-foreground">
                    实时同步
                  </span>
                </Label>
                {recipients.length > 1 && (
                  <Select
                    value={String(previewIdx)}
                    onValueChange={(v) => setPreviewIdx(Number(v))}
                  >
                    <SelectTrigger className="h-7 w-[180px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map((r, i) => (
                        <SelectItem key={r.key} value={String(i)}>
                          第 {i + 1} 条 · {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {isEmail && (
                <div className="text-xs">
                  <span className="text-muted-foreground">主题：</span>
                  <span className="font-medium">{previewSubject || "—"}</span>
                </div>
              )}
              <div className="text-xs whitespace-pre-wrap text-foreground/90 max-h-40 overflow-y-auto">
                {previewContent || (
                  <span className="text-muted-foreground">（暂无内容）</span>
                )}
              </div>
            </section>
          )}

          {/* 费用 */}
          <section className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs space-y-1 dark:border-rose-900/50 dark:bg-rose-950/30">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                发送费用（{recipients.length} {isEmail ? "封" : "条"} ×{" "}
                {sendCostPerRecipient} 积分{
                  !isEmail && content ? `，按 ${smsSegments(content)} 条拆分` : ""
                }）
              </span>
              <span className="font-medium">{sendTotal} 积分</span>
            </div>
            {aiCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  AI 生成（{aiCount} 次 × {isEmail ? COST_AI_EMAIL : COST_AI_SMS}{" "}
                  积分）
                </span>
                <span className="font-medium">{aiCost} 积分</span>
              </div>
            )}
            <div className="flex justify-between border-t border-rose-200/70 pt-1 dark:border-rose-900/50">
              <span className="font-semibold text-rose-700 dark:text-rose-300">
                合计
              </span>
              <span className="font-semibold text-rose-700 dark:text-rose-300">
                {grandTotal} 积分
              </span>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="bg-primary"
          >
            <Send className="h-4 w-4" />
            确认发送（-{grandTotal}）
          </Button>
        </DialogFooter>
      </DialogContent>

      <AiComposeDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        channel={channel}
        loading={aiLoading}
        onGenerate={handleAiGenerate}
      />
    </Dialog>
  );
}

/* -------------------- AI 生成子弹窗 -------------------- */

function AiComposeDialog({
  open,
  onOpenChange,
  channel,
  loading,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: ComposeChannel;
  loading: boolean;
  onGenerate: (p: {
    scene: string;
    tone: "formal" | "friendly" | "concise";
    language: "zh" | "en";
    extra?: string;
  }) => void;
}) {
  const isEmail = channel === "email";
  const [scene, setScene] = useState("开发信");
  const [tone, setTone] = useState<"formal" | "friendly" | "concise">("friendly");
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const [extra, setExtra] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 生成{isEmail ? "邮件" : "短信"}文案
          </DialogTitle>
          <DialogDescription className="text-xs">
            生成成功即扣 {isEmail ? COST_AI_EMAIL : COST_AI_SMS} 积分；失败不扣费。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">场景</Label>
            <Select value={scene} onValueChange={setScene}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="开发信">开发信（首次接触）</SelectItem>
                <SelectItem value="跟进">跟进未回复客户</SelectItem>
                <SelectItem value="报价">报价 / 商品推荐</SelectItem>
                <SelectItem value="展会邀请">展会邀请</SelectItem>
                <SelectItem value="节日问候">节日问候</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">语气</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">正式商务</SelectItem>
                  <SelectItem value="friendly">友好诚恳</SelectItem>
                  <SelectItem value="concise">简洁直接</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">语言</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">英文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">补充要求（可选）</Label>
            <Textarea
              rows={3}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="如：突出我方价格优势、提及具体产品类目等"
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button
            disabled={loading}
            onClick={() => onGenerate({ scene, tone, language, extra: extra.trim() || undefined })}
            className={cn("bg-primary", loading && "opacity-80")}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "生成中…" : "生成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}