import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  Inbox as InboxIcon,
  Search,
  Sparkles,
  Send,
  Clock,
  CheckCheck,
  Ban,
  Repeat,
  Star,
  MoreHorizontal,
  Tag,
  ListTodo,
  UserPlus,
  ChevronRight,
  Building2,
  UserRound,
  Eye,
  MailOpen,
  MousePointerClick,
  Loader2,
  RefreshCw,
  MessageCircleReply,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format-date";
import {
  useThreads,
  useInboxCounts,
  markThreadRead,
  snoozeThread,
  markHandled,
  toggleStar,
  enrollCadence,
  suppressThread,
  addTag,
  addTaskForThread,
  updateIntent,
  sendReply,
  SNOOZE_PRESETS,
  INTENT_LABEL,
  INTENT_COLOR,
  STATUS_LABEL,
  type Thread,
  type AiIntent,
} from "@/lib/inbox-store";
import { generateAiContent } from "@/lib/api/ai-compose.functions";

const searchSchema = z.object({
  view: z
    .enum([
      "unread",
      "pending",
      "all",
      "hasReply",
      "noReply",
      "handled",
      "snoozed",
      "suppressed",
    ])
    .optional(),
  ch: z.enum(["all", "email", "sms"]).optional(),
  tid: z.string().optional(),
  q: z.string().optional(),
  // 从"最新沟通"胶囊中的"AI 回复"进入时，自动生成一条 AI 草稿。
  action: z.enum(["ai"]).optional(),
});

type ViewKey = NonNullable<z.infer<typeof searchSchema>["view"]>;

export const Route = createFileRoute("/_app/outreach/inbox")({
  head: () => ({
    meta: [{ title: "触达收件箱 | Boo数据平台" }],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: InboxPage,
});

function InboxPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const threads = useThreads();
  const counts = useInboxCounts();
  // 从企业/联系人详情等入口带 tid 直接进入时，默认使用 “全部” 视图，
  // 避免出现「右侧展示了会话，中间列表却提示"该视图下暂无会话"」的错位。
  const view: ViewKey = search.view ?? (search.tid ? "all" : "unread");
  const q = search.q ?? "";
  const ch = search.ch ?? "all";

  const filtered = useMemo(() => {
    let list = threads;
    if (ch !== "all") list = list.filter((t) => t.channel === ch);
    if (view === "unread") list = list.filter((t) => t.meta.unread > 0);
    else if (view === "pending")
      list = list.filter((t) => t.meta.status === "pending");
    else if (view === "hasReply")
      list = list.filter((t) => t.meta.inboundMessages.length > 0);
    else if (view === "noReply")
      list = list.filter((t) => t.meta.inboundMessages.length === 0);
    else if (view === "handled")
      list = list.filter((t) => t.meta.status === "handled");
    else if (view === "snoozed")
      list = list.filter((t) => t.meta.status === "snoozed");
    else if (view === "suppressed")
      list = list.filter((t) => t.meta.status === "suppressed");
    if (q.trim()) {
      const kw = q.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.targetName.toLowerCase().includes(kw) ||
          t.counterpartyAddress.toLowerCase().includes(kw) ||
          t.messages.some(
            (m) =>
              m.subject?.toLowerCase().includes(kw) ||
              m.content.toLowerCase().includes(kw),
          ),
      );
    }
    return list;
  }, [threads, view, q, ch]);

  const currentId = search.tid ?? filtered[0]?.id;
  const current = threads.find((t) => t.id === currentId);

  // 保险：如果通过 tid 打开的会话不在当前筛选视图内，则把它并入中栏列表，
  // 保持右侧详情与左侧列表的一致性。
  const displayList = useMemo(() => {
    if (current && !filtered.some((t) => t.id === current.id)) {
      return [current, ...filtered];
    }
    return filtered;
  }, [filtered, current]);

  // 打开会话即标记已读
  useEffect(() => {
    if (current && current.meta.unread > 0) markThreadRead(current.id);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function goto(patch: Partial<z.infer<typeof searchSchema>>) {
    navigate({
      to: "/outreach/inbox",
      search: { ...search, ...patch },
      replace: true,
    });
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* 顶栏 */}
      <div className="h-14 px-6 border-b flex items-center gap-3 shrink-0">
        <InboxIcon className="h-5 w-5 text-primary" />
        <div className="font-semibold">触达收件箱</div>
        <Badge variant="outline" className="text-xs">
          {counts.all} 个会话
        </Badge>
        {counts.unread > 0 && (
          <Badge className="bg-rose-500 text-white text-xs">
            未读 {counts.unread}
          </Badge>
        )}
        <div className="flex-1 max-w-md ml-4 relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => goto({ q: e.target.value })}
            placeholder="搜索：企业 / 联系人 / 邮箱 / 主题 / 内容"
            className="pl-8 h-9"
          />
        </div>
        {/* 渠道切换 */}
        <div className="ml-2 flex items-center rounded-md border overflow-hidden shrink-0">
          {([
            { k: "all", label: "全部" },
            { k: "email", label: "邮件" },
            { k: "sms", label: "短信" },
          ] as const).map((c) => (
            <button
              key={c.k}
              onClick={() => goto({ ch: c.k, tid: undefined })}
              className={cn(
                "px-3 h-9 text-xs transition-colors",
                ch === c.k
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        {/* 左栏 */}
        <aside className="w-56 shrink-0 border-r bg-muted/20 py-3 overflow-y-auto">
          <div className="px-3 text-[11px] text-muted-foreground mb-1 font-medium tracking-wide">
            视图
          </div>
          <FilterItem
            active={view === "unread"}
            label="未读"
            count={counts.unread}
            onClick={() => goto({ view: "unread", tid: undefined })}
            dot="rose"
          />
          <FilterItem
            active={view === "pending"}
            label="待跟进"
            count={counts.pending}
            onClick={() => goto({ view: "pending", tid: undefined })}
            dot="amber"
          />
          <FilterItem
            active={view === "hasReply"}
            label="有回复"
            count={counts.hasReply}
            onClick={() => goto({ view: "hasReply", tid: undefined })}
          />
          <FilterItem
            active={view === "noReply"}
            label="未回复"
            count={counts.noReply}
            onClick={() => goto({ view: "noReply", tid: undefined })}
          />
          <FilterItem
            active={view === "snoozed"}
            label="稍后处理"
            count={counts.snoozed}
            onClick={() => goto({ view: "snoozed", tid: undefined })}
          />
          <FilterItem
            active={view === "handled"}
            label="已处理"
            count={counts.handled}
            onClick={() => goto({ view: "handled", tid: undefined })}
          />
          <FilterItem
            active={view === "suppressed"}
            label="已抑制"
            count={counts.suppressed}
            onClick={() => goto({ view: "suppressed", tid: undefined })}
          />
          <FilterItem
            active={view === "all"}
            label="全部"
            count={counts.all}
            onClick={() => goto({ view: "all", tid: undefined })}
          />
        </aside>

        {/* 中栏：会话列表 */}
        <div className="w-[380px] shrink-0 border-r overflow-y-auto">
          {displayList.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              该视图下暂无会话
            </div>
          ) : (
            displayList.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                active={t.id === currentId}
                onClick={() => goto({ tid: t.id })}
              />
            ))
          )}
        </div>

        {/* 右栏：会话详情 */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-background">
          {current ? (
            <ThreadDetail
              thread={current}
              autoAi={search.action === "ai"}
              onConsumeAction={() =>
                navigate({
                  to: "/outreach/inbox",
                  search: { ...search, action: undefined },
                  replace: true,
                })
              }
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              选择左侧一个会话查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterItem({
  active,
  label,
  count,
  onClick,
  dot,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  dot?: "rose" | "amber";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/80 hover:bg-muted",
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            dot === "rose" ? "bg-rose-500" : "bg-amber-500",
          )}
        />
      )}
      <span className="flex-1 text-left">{label}</span>
      <span
        className={cn(
          "text-xs",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "刚刚";
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(diff / 3_600_000);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(diff / 86_400_000);
  if (day < 30) return `${day} 天前`;
  return formatDateTime(iso).slice(0, 10);
}

function ThreadRow({
  thread,
  active,
  onClick,
}: {
  thread: Thread;
  active: boolean;
  onClick: () => void;
}) {
  const isUnread = thread.meta.unread > 0;
  const last = thread.messages[thread.messages.length - 1];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b hover:bg-muted/40 transition-colors block",
        active && "bg-primary/5 border-l-2 border-l-primary",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
            isUnread ? "bg-rose-500" : "bg-transparent",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm truncate",
                isUnread ? "font-semibold" : "font-medium",
              )}
            >
              {thread.targetName}
            </span>
            {thread.parentRef && (
              <span className="text-[11px] text-muted-foreground truncate">
                · {thread.parentRef.name}
              </span>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
              {relTime(thread.lastAt)}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground truncate">
            {last?.subject || "(无主题)"}
          </div>
          <div className="mt-1 text-xs text-foreground/70 line-clamp-2">
            <span
              className={cn(
                "inline mr-1 text-[10px] px-1 py-0.5 rounded border",
                thread.lastDirection === "outbound"
                  ? "bg-slate-50 text-slate-600 border-slate-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200",
              )}
            >
              {thread.lastDirection === "outbound" ? "我" : "TA"}
            </span>
            {thread.lastPreview}
          </div>
          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] py-0 px-1.5 h-5",
                thread.channel === "sms"
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : "bg-violet-50 text-violet-700 border-violet-200",
              )}
            >
              {thread.channel === "sms" ? "短信" : "邮件"}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 h-5"
            >
              {STATUS_LABEL[thread.meta.status]}
            </Badge>
            {thread.meta.aiIntent && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] py-0 px-1.5 h-5",
                  INTENT_COLOR[thread.meta.aiIntent],
                )}
              >
                {INTENT_LABEL[thread.meta.aiIntent]}
              </Badge>
            )}
            {thread.meta.tags.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="text-[10px] py-0 px-1.5 h-5"
              >
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function ThreadDetail({
  thread,
  autoAi,
  onConsumeAction,
}: {
  thread: Thread;
  autoAi?: boolean;
  onConsumeAction?: () => void;
}) {
  const [reply, setReply] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const lastInbound = [...thread.messages]
    .reverse()
    .find((m) => m.direction === "inbound");

  async function aiGenerate() {
    setAiLoading(true);
    try {
      const res = await generateAiContent({
        data: {
          channel: "email",
          scene: `跟进回复。对方姓名：${thread.parentRef?.name ?? thread.targetName}。对方最新原话：${
            lastInbound?.content ?? "(尚无对方回复)"
          }`,
          tone: "friendly",
          language: "en",
          sampleEnterprise: thread.targetName,
        },
      });
      setReply(res.content || "");
      toast.success("AI 已生成回复草稿，可继续编辑后发送");
    } catch (e) {
      toast.error(`AI 生成失败：${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  }

  // 当从企业/联系人详情胶囊上的"AI 回复"按钮进入时，自动触发一次生成，
  // 生成后清除 URL 上的 action 参数，避免切换会话或刷新时反复触发。
  useEffect(() => {
    if (!autoAi) return;
    aiGenerate();
    onConsumeAction?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAi, thread.id]);

  function doSend(aiGen = false) {
    if (!reply.trim()) {
      toast.error("请输入回复内容");
      return;
    }
    setSending(true);
    setTimeout(() => {
      sendReply({
        threadId: thread.id,
        content: reply.trim(),
        fromAddress: thread.senderEmail || "outreach@bytetech.cn",
        subject: thread.messages[0]?.subject
          ? `Re: ${thread.messages[0].subject.replace(/^Re:\s*/i, "")}`
          : undefined,
        aiGenerated: aiGen,
      });
      setReply("");
      setSending(false);
      toast.success("回复已发送");
    }, 400);
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶栏 */}
      <div className="px-6 py-4 border-b space-y-2 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {thread.targetKind === "enterprise" ? (
            <Building2 className="h-3.5 w-3.5" />
          ) : (
            <UserRound className="h-3.5 w-3.5" />
          )}
          <Link
            to={
              thread.targetKind === "enterprise"
                ? "/outreach/enterprise/$id"
                : "/outreach/enterprise/$id/contact/$idx"
            }
            params={
              thread.targetKind === "enterprise"
                ? { id: thread.targetId }
                : {
                    id: thread.targetId.split(":")[0],
                    idx: thread.targetId.split(":")[1] ?? "0",
                  }
            }
            className="hover:text-primary transition-colors"
          >
            {thread.targetName}
          </Link>
          {thread.parentRef && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span>{thread.parentRef.name}</span>
            </>
          )}
          <span className="ml-2">· {thread.counterpartyAddress}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">
              {thread.messages[0]?.subject || "(无主题)"}
            </div>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[11px]">
                {STATUS_LABEL[thread.meta.status]}
              </Badge>
              {thread.meta.aiIntent && (
                <Badge
                  variant="outline"
                  className={cn("text-[11px]", INTENT_COLOR[thread.meta.aiIntent])}
                >
                  {INTENT_LABEL[thread.meta.aiIntent]}
                </Badge>
              )}
              {thread.meta.cadenceEnrolled && (
                <Badge variant="outline" className="text-[11px]">
                  <Repeat className="h-3 w-3 mr-1" /> 已加入跟进序列
                </Badge>
              )}
              {thread.meta.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[11px]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <ActionBar thread={thread} />
        </div>
      </div>

      {/* 时间线 */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {thread.messages.map((m) => (
          <div key={m.id} className="flex gap-3">
            <div
              className={cn(
                "h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-medium",
                m.direction === "outbound"
                  ? "bg-primary/10 text-primary"
                  : "bg-emerald-100 text-emerald-700",
              )}
            >
              {m.direction === "outbound" ? "我" : "TA"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {m.direction === "outbound" ? "你发出" : "对方回复"}
                </span>
                <span>· {formatDateTime(m.createdAt)}</span>
                {m.aiGenerated && (
                  <Badge variant="outline" className="text-[10px] py-0 h-4">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    AI
                  </Badge>
                )}
              </div>
              {m.direction === "outbound" && m.events && m.events.length > 0 && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {m.events.map((ev, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5">
                      {ev.type === "delivered" && (
                        <>
                          <CheckCheck className="h-3 w-3 text-emerald-500" />
                          已送达
                        </>
                      )}
                      {ev.type === "opened" && (
                        <>
                          <MailOpen className="h-3 w-3 text-sky-500" />
                          已打开
                        </>
                      )}
                      {ev.type === "clicked" && (
                        <>
                          <MousePointerClick className="h-3 w-3 text-violet-500" />
                          已点击
                        </>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 rounded-md border bg-card p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {m.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 回复区 */}
      <div className="border-t bg-muted/20 p-4 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircleReply className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">回复</span>
          <span className="text-xs text-muted-foreground">
            将以 {thread.senderEmail || "outreach@bytetech.cn"} 发出，保持在同一会话内
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1 h-7"
            onClick={aiGenerate}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI 生成回复
          </Button>
        </div>
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder='写点什么，或点击"AI 生成回复"由 AI 起草…'
          rows={4}
          className="resize-none bg-background"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button onClick={() => doSend(false)} disabled={sending} className="gap-1.5">
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            发送回复
          </Button>
          <Button
            variant="outline"
            onClick={() => setReply("")}
            disabled={!reply || sending}
          >
            清空
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            回复后本会话状态自动切换为「等待回复」
          </span>
        </div>
      </div>
    </div>
  );
}

function ActionBar({ thread }: { thread: Thread }) {
  const [tagInput, setTagInput] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          toggleStar(thread.id);
        }}
        aria-label="加星"
      >
        <Star
          className={cn(
            "h-4 w-4",
            thread.meta.starred ? "fill-amber-400 text-amber-400" : "",
          )}
        />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 h-8">
            <Clock className="h-3.5 w-3.5" />
            稍后
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Snooze 到</DropdownMenuLabel>
          {SNOOZE_PRESETS.map((p) => (
            <DropdownMenuItem
              key={p.label}
              onClick={() => {
                snoozeThread(thread.id, p.ms);
                toast.success(`已 Snooze：${p.label}`);
              }}
            >
              {p.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        className="gap-1 h-8"
        onClick={() => {
          markHandled(thread.id, thread.meta.status !== "handled");
          toast.success(
            thread.meta.status === "handled" ? "已恢复为待跟进" : "已标记为已处理",
          );
        }}
      >
        <CheckCheck className="h-3.5 w-3.5" />
        {thread.meta.status === "handled" ? "撤销处理" : "标记已处理"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1 h-8"
        onClick={() => {
          enrollCadence(thread.id, !thread.meta.cadenceEnrolled);
          toast.success(
            thread.meta.cadenceEnrolled ? "已退出跟进序列" : "已加入 3/7/14 天跟进序列",
          );
        }}
      >
        <Repeat className="h-3.5 w-3.5" />
        {thread.meta.cadenceEnrolled ? "退出序列" : "加入序列"}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>标签 / 分类</DropdownMenuLabel>
          <div className="px-2 py-1.5 flex items-center gap-1">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="打标签"
              className="h-7"
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  addTag(thread.id, tagInput.trim());
                  setTagInput("");
                  toast.success("已加标签");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0"
              onClick={() => {
                if (tagInput.trim()) {
                  addTag(thread.id, tagInput.trim());
                  setTagInput("");
                  toast.success("已加标签");
                }
              }}
            >
              <Tag className="h-3 w-3" />
            </Button>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>修正 AI 分类</DropdownMenuLabel>
          {(
            ["interested", "quote", "ooo", "reject", "unsubscribe", "other"] as AiIntent[]
          ).map((i) => (
            <DropdownMenuItem
              key={i}
              onClick={() => {
                updateIntent(thread.id, i);
                toast.success(`已修正为「${INTENT_LABEL[i]}」`);
              }}
            >
              {INTENT_LABEL[i]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>任务</DropdownMenuLabel>
          <div className="px-2 py-1.5 flex items-center gap-1">
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="加待办"
              className="h-7"
              onKeyDown={(e) => {
                if (e.key === "Enter" && taskTitle.trim()) {
                  addTaskForThread(thread.id, taskTitle.trim());
                  setTaskTitle("");
                  toast.success("已创建待办");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0"
              onClick={() => {
                if (taskTitle.trim()) {
                  addTaskForThread(thread.id, taskTitle.trim());
                  setTaskTitle("");
                  toast.success("已创建待办");
                }
              }}
            >
              <ListTodo className="h-3 w-3" />
            </Button>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              toast.info("转派功能：已推送给「团队负责人」（演示）");
            }}
          >
            <UserPlus className="h-3.5 w-3.5 mr-2" /> 转派给同事
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-600 focus:text-rose-600"
            onClick={() => {
              suppressThread(thread.id);
              toast.success("已加入抑制名单，后续将不再向该地址发送");
            }}
          >
            <Ban className="h-3.5 w-3.5 mr-2" /> 加入抑制名单
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
