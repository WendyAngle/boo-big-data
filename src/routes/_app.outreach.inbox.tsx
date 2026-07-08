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
  Mail,
  MessageSquare,
  MessageCircle,
  Facebook,
  Music2,
  Send as SendIcon,
  ShieldAlert,
  UserCheck,
  Hand,
  Zap,
  Pin,
  AlarmClock,
  ChevronDown as ChevronDownIcon,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type Channel,
  type GroupKind,
  CHANNEL_LABEL,
  CHANNEL_COLOR,
  WINDOW_HOURS,
  GROUP_LABEL,
  TEAM_MEMBERS,
  memberById,
  threadGroup,
  assignThread,
  previousAssigneeIds,
  slaInfo,
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
      "unassigned",
      "mine",
      "my_todo",
      "due_soon",
    ])
    .optional(),
  ch: z
    .enum(["all", "email", "sms", "whatsapp", "telegram", "facebook", "tiktok"])
    .optional(),
  group: z.enum(["all", "enterprise", "contact"]).optional(),
  tid: z.string().optional(),
  q: z.string().optional(),
  // 从"最新沟通"胶囊中的"AI 回复"进入时，自动生成一条 AI 草稿。
  action: z.enum(["ai"]).optional(),
});

/** 演示环境的"当前登录员工"（Phase 1 mock，见 TEAM_MEMBERS） */
const CURRENT_TEAM_USER_ID = "u_zhang";

function channelIcon(ch: Channel) {
  switch (ch) {
    case "email":
      return Mail;
    case "sms":
      return MessageSquare;
    case "whatsapp":
      return MessageCircle;
    case "telegram":
      return SendIcon;
    case "facebook":
      return Facebook;
    case "tiktok":
      return Music2;
  }
}

/** WhatsApp / Facebook HSM 演示模板 */
const HSM_TEMPLATES: Record<string, { id: string; name: string; body: string }[]> = {
  whatsapp: [
    { id: "wa_hello", name: "welcome_intro", body: "Hi {{1}}, thanks for reaching out to us earlier. Would this be a good time to continue our conversation?" },
    { id: "wa_quote", name: "quote_followup", body: "Hi {{1}}, following up on the quote we shared for {{2}}. Let me know if you'd like to schedule a call." },
  ],
  facebook: [
    { id: "fb_update", name: "CONFIRMED_EVENT_UPDATE", body: "Reminder: your appointment on {{1}} is confirmed." },
  ],
};

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
  // 智能视图计数（前端派生，避免修改 store）
  const smartCounts = useMemo(() => {
    let myTodo = 0;
    let dueSoon = 0;
    let mine = 0;
    for (const t of threads) {
      if (t.meta.assigneeId === CURRENT_TEAM_USER_ID) {
        mine++;
        if (t.meta.status === "pending" || t.meta.status === "snoozed") myTodo++;
      }
      const s = slaInfo(t);
      if (s && (s.overdue || s.approaching)) dueSoon++;
    }
    return { myTodo, dueSoon, mine };
  }, [threads]);
  // 从企业/联系人详情等入口带 tid 直接进入时，默认使用 “全部” 视图，
  // 避免出现「右侧展示了会话，中间列表却提示"该视图下暂无会话"」的错位。
  const view: ViewKey = search.view ?? (search.tid ? "all" : "my_todo");
  const [moreOpen, setMoreOpen] = useState(false);
  const q = search.q ?? "";
  const ch = search.ch ?? "all";
  const group = search.group ?? "all";

  const filtered = useMemo(() => {
    let list = threads;
    if (ch !== "all") list = list.filter((t) => t.channel === ch);
    if (group !== "all") list = list.filter((t) => threadGroup(t) === group);
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
    else if (view === "unassigned")
      list = list.filter((t) => !t.meta.assigneeId);
    else if (view === "mine")
      list = list.filter((t) => t.meta.assigneeId === CURRENT_TEAM_USER_ID);
    else if (view === "my_todo")
      list = list.filter(
        (t) =>
          t.meta.assigneeId === CURRENT_TEAM_USER_ID &&
          (t.meta.status === "pending" || t.meta.status === "snoozed"),
      );
    else if (view === "due_soon")
      list = list.filter((t) => {
        const s = slaInfo(t);
        return !!s && (s.overdue || s.approaching);
      });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  void group;

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
      <div className="h-12 px-4 border-b flex items-center gap-2 shrink-0">
        <InboxIcon className="h-4 w-4 text-primary shrink-0" />
        <div className="font-semibold text-sm shrink-0">触达收件箱</div>
        <Badge variant="outline" className="text-[11px] h-5 px-1.5 shrink-0">
          {counts.all}
        </Badge>
        <div className="flex-1 min-w-0 max-w-xs relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => goto({ q: e.target.value })}
            placeholder="搜索企业 / 联系人 / 内容"
            className="pl-7 h-8 text-xs"
          />
        </div>
        {/* 渠道切换：图标 tabs，节省横向空间 */}
        <div className="ml-1 flex items-center rounded-md border overflow-hidden shrink-0">
          <button
            onClick={() => goto({ ch: "all", tid: undefined })}
            className={cn(
              "px-2 h-8 text-[11px] transition-colors border-r",
              ch === "all" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
            )}
          >
            全部
          </button>
          {([
            { k: "email", label: "邮件" },
            { k: "sms", label: "短信" },
            { k: "whatsapp", label: "WhatsApp" },
            { k: "telegram", label: "Telegram" },
            { k: "facebook", label: "Facebook" },
            { k: "tiktok", label: "TikTok" },
          ] as const).map((c) => {
            const CI = channelIcon(c.k);
            return (
              <button
                key={c.k}
                title={c.label}
                onClick={() => goto({ ch: c.k, tid: undefined })}
                className={cn(
                  "px-2 h-8 flex items-center justify-center transition-colors border-l first:border-l-0",
                  ch === c.k
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                <CI className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
        {/* 分组切换（企业 / 人物） */}
        <div className="ml-1 flex items-center rounded-md border overflow-hidden shrink-0">
          {([
            { k: "all", label: "全部" },
            { k: "enterprise", label: "企业" },
            { k: "contact", label: "人物" },
          ] as const).map((g) => (
            <button
              key={g.k}
              onClick={() => goto({ group: g.k, tid: undefined })}
              className={cn(
                "px-2 h-8 text-[11px] transition-colors border-l first:border-l-0",
                group === g.k
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        {/* 左栏：视图侧栏 —— 分「分派」「状态」两段，窄屏（<1280px）折叠为列表顶部下拉 */}
        <aside className="hidden xl:block w-52 shrink-0 border-r bg-muted/20 py-3 overflow-y-auto">
          <div className="px-3 text-[11px] text-muted-foreground mb-1 font-medium tracking-wide">
            智能视图
          </div>
          <FilterItem
            active={view === "my_todo"}
            label="我的待办"
            icon={Pin}
            count={smartCounts.myTodo}
            onClick={() => goto({ view: "my_todo", tid: undefined })}
          />
          <FilterItem
            active={view === "due_soon"}
            label="即将超时"
            icon={AlarmClock}
            count={smartCounts.dueSoon}
            onClick={() => goto({ view: "due_soon", tid: undefined })}
            dot={smartCounts.dueSoon > 0 ? "rose" : undefined}
          />
          <FilterItem
            active={view === "unassigned"}
            label="未分配"
            count={counts.unassigned}
            onClick={() => goto({ view: "unassigned", tid: undefined })}
            dot="amber"
          />
          <FilterItem
            active={view === "unread"}
            label="未读"
            count={counts.unread}
            onClick={() => goto({ view: "unread", tid: undefined })}
            dot="rose"
          />
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="w-full mt-3 px-3 flex items-center justify-between text-[11px] text-muted-foreground font-medium tracking-wide hover:text-foreground"
          >
            <span>更多视图</span>
            <ChevronDownIcon
              className={cn("h-3 w-3 transition-transform", moreOpen && "rotate-180")}
            />
          </button>
          {moreOpen && (
            <div className="mt-1">
              <FilterItem
                active={view === "mine"}
                label="我的全部"
                count={smartCounts.mine}
                onClick={() => goto({ view: "mine", tid: undefined })}
              />
              <FilterItem
                active={view === "pending"}
                label="待跟进"
                count={counts.pending}
                onClick={() => goto({ view: "pending", tid: undefined })}
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
                active={view === "all"}
                label="全部"
                count={counts.all}
                onClick={() => goto({ view: "all", tid: undefined })}
              />
            </div>
          )}
        </aside>

        {/* 中栏：会话列表 */}
        <div className="w-[300px] xl:w-[340px] shrink-0 border-r flex flex-col min-h-0">
          {/* 窄屏下的视图下拉（xl 及以上由侧栏承担） */}
          <div className="xl:hidden px-2 py-2 border-b bg-muted/20 shrink-0 flex items-center gap-2">
            {/* 快捷 chip：分派维度 */}
            <div className="flex items-center rounded-md border overflow-hidden">
              {([
                { k: "my_todo", label: "我的待办", n: smartCounts.myTodo },
                { k: "due_soon", label: "即将超时", n: smartCounts.dueSoon },
                { k: "unassigned", label: "未分配", n: counts.unassigned },
                { k: "unread", label: "未读", n: counts.unread },
              ] as const).map((c) => (
                <button
                  key={c.k}
                  onClick={() => goto({ view: c.k, tid: undefined })}
                  className={cn(
                    "px-2 h-8 text-[11px] transition-colors border-l first:border-l-0",
                    view === c.k ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                  )}
                >
                  {c.label}
                  {c.n > 0 && <span className="ml-1 opacity-70">{c.n}</span>}
                </button>
              ))}
            </div>
            {/* 状态下拉 */}
            <Select
              value={view}
              onValueChange={(v) => goto({ view: v as ViewKey, tid: undefined })}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>智能视图</SelectLabel>
                  <SelectItem value="my_todo">我的待办 · {smartCounts.myTodo}</SelectItem>
                  <SelectItem value="due_soon">即将超时 · {smartCounts.dueSoon}</SelectItem>
                  <SelectItem value="unassigned">未分配 · {counts.unassigned}</SelectItem>
                  <SelectItem value="unread">未读 · {counts.unread}</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>更多视图</SelectLabel>
                  <SelectItem value="mine">我的全部 · {smartCounts.mine}</SelectItem>
                  <SelectItem value="pending">待跟进 · {counts.pending}</SelectItem>
                  <SelectItem value="snoozed">稍后处理 · {counts.snoozed}</SelectItem>
                  <SelectItem value="handled">已处理 · {counts.handled}</SelectItem>
                  <SelectItem value="suppressed">已抑制 · {counts.suppressed}</SelectItem>
                  <SelectItem value="hasReply">有回复 · {counts.hasReply}</SelectItem>
                  <SelectItem value="noReply">未回复 · {counts.noReply}</SelectItem>
                  <SelectItem value="all">全部 · {counts.all}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto">
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
  icon: Icon,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  dot?: "rose" | "amber";
  icon?: React.ComponentType<{ className?: string }>;
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
      {Icon && <Icon className="h-3.5 w-3.5" />}
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
  const sla = slaInfo(thread);
  const woken =
    thread.meta.wokenAt &&
    Date.now() - new Date(thread.meta.wokenAt).getTime() < 24 * 3600_000;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b hover:bg-muted/40 transition-colors block",
        active && "bg-primary/5 border-l-2 border-l-primary",
        !active && isUnread && "border-l-2 border-l-rose-400 bg-rose-50/30",
        woken && "bg-amber-50/60",
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
            {woken && (
              <Badge className="text-[10px] py-0 px-1 h-4 bg-amber-500 hover:bg-amber-500">
                已唤醒
              </Badge>
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
                CHANNEL_COLOR[thread.channel],
              )}
            >
              {CHANNEL_LABEL[thread.channel]}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 h-5 gap-0.5"
              title={GROUP_LABEL[threadGroup(thread)]}
            >
              {threadGroup(thread) === "enterprise" ? (
                <Building2 className="h-2.5 w-2.5" />
              ) : (
                <UserRound className="h-2.5 w-2.5" />
              )}
              {threadGroup(thread) === "enterprise" ? "企业" : "人物"}
            </Badge>
            {thread.meta.assigneeId ? (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5 h-5 bg-primary/5 text-primary border-primary/20"
              >
                <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                {memberById(thread.meta.assigneeId)?.name ?? "已分配"}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5 h-5 bg-amber-50 text-amber-700 border-amber-200"
              >
                未分配
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 h-5"
            >
              {STATUS_LABEL[thread.meta.status]}
            </Badge>
            {sla && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] py-0 px-1.5 h-5",
                  sla.overdue
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : sla.approaching
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200",
                )}
              >
                <Clock className="h-2.5 w-2.5 mr-0.5" />
                {sla.overdue
                  ? `逾期 ${formatShort(-sla.leftMs)}`
                  : sla.approaching
                    ? `即将超时 ${formatShort(sla.leftMs)}`
                    : `SLA ${formatShort(sla.leftMs)}`}
              </Badge>
            )}
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
  const [selectedTpl, setSelectedTpl] = useState<string>("");
  const lastInbound = [...thread.messages]
    .reverse()
    .find((m) => m.direction === "inbound");

  // 窗口计算（WA/FB/TT）
  const winInfo = useMemo(() => {
    const winH = WINDOW_HOURS[thread.channel];
    if (winH === undefined) return null;
    const exp = thread.meta.windowExpiresAt
      ? new Date(thread.meta.windowExpiresAt).getTime()
      : null;
    if (!exp) return { winH, leftMs: winH * 3600_000, closed: false };
    const leftMs = exp - Date.now();
    return { winH, leftMs, closed: leftMs <= 0 };
  }, [thread.channel, thread.meta.windowExpiresAt]);

  const templates = HSM_TEMPLATES[thread.channel] ?? [];

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
    const content = winInfo?.closed && templates.length
      ? templates.find((t) => t.id === selectedTpl)?.body ?? reply
      : reply;
    if (!content.trim()) {
      toast.error("请输入回复内容");
      return;
    }
    setSending(true);
    setTimeout(() => {
      sendReply({
        threadId: thread.id,
        content: content.trim(),
        fromAddress: thread.senderEmail || "outreach@bytetech.cn",
        subject: thread.messages[0]?.subject
          ? `Re: ${thread.messages[0].subject.replace(/^Re:\s*/i, "")}`
          : undefined,
        aiGenerated: aiGen,
      });
      setReply("");
      setSelectedTpl("");
      setSending(false);
      toast.success(winInfo?.closed ? "已通过 HSM 模板发送" : "回复已发送");
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
          {thread.messages.some((m) => m.direction === "outbound" && m.ledgerId) && (
              <Link
                to="/outreach/reach"
                className="ml-2 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
                title="查看来源触达任务"
              >
                <Zap className="h-3 w-3" />
                来自触达
              </Link>
            )}
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
              {(() => {
                const sla = slaInfo(thread);
                if (!sla) return null;
                return (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px]",
                      sla.overdue
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : sla.approaching
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200",
                    )}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {sla.overdue
                      ? `SLA 逾期 ${formatShort(-sla.leftMs)}`
                      : sla.approaching
                        ? `SLA 即将超时 ${formatShort(sla.leftMs)}`
                        : `SLA 剩 ${formatShort(sla.leftMs)}`}
                  </Badge>
                );
              })()}
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
        {(thread.meta.assignmentEvents ?? []).map((ev) => (
          <div
            key={ev.id}
            className="flex items-center gap-2 text-[11px] text-muted-foreground border-l-2 border-primary/30 pl-3 py-1"
          >
            <UserCheck className="h-3 w-3 text-primary" />
            <span>
              {ev.from ? memberById(ev.from)?.name ?? "未知" : "未分配"} →{" "}
              {ev.to ? memberById(ev.to)?.name ?? "未知" : "未分配"}
            </span>
            {ev.crossGroup && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200">
                跨组
              </Badge>
            )}
            {ev.greetingSent && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                已发切换招呼
              </Badge>
            )}
            {ev.reason && <span className="text-foreground/70">· {ev.reason}</span>}
            <span className="ml-auto">{formatDateTime(ev.at)}</span>
          </div>
        ))}
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
        {winInfo && (
          <div
            className={cn(
              "mb-3 rounded-md border px-3 py-2 text-xs flex items-center gap-2",
              winInfo.closed
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : winInfo.leftMs < 2 * 3600_000
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800",
            )}
          >
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            {winInfo.closed ? (
              <span>
                {CHANNEL_LABEL[thread.channel]} 客服窗口已关闭，
                {thread.channel === "whatsapp"
                  ? "请从下方选择已审核的 HSM 模板发送。"
                  : thread.channel === "facebook"
                    ? "需附合规消息标签（如 CONFIRMED_EVENT_UPDATE）。"
                    : "窗口外禁止外发消息。"}
              </span>
            ) : (
              <span>
                {CHANNEL_LABEL[thread.channel]} 客服窗口剩余{" "}
                <b>{formatHm(winInfo.leftMs)}</b>，窗口内可自由文本回复。
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <MessageCircleReply className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">回复</span>
          <span className="text-xs text-muted-foreground">
            {thread.channel === "email"
              ? `将以 ${thread.senderEmail || "outreach@bytetech.cn"} 发出`
              : thread.channel === "whatsapp"
                ? "由公司共享 WhatsApp 商号发出（对客户显示同一号码）"
                : `将以 ${CHANNEL_LABEL[thread.channel]} 渠道发出`}
            ，保持在同一会话内
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1 h-7"
            onClick={aiGenerate}
            disabled={aiLoading || winInfo?.closed}
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI 生成回复
          </Button>
        </div>
        {winInfo?.closed && templates.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTpl(t.id)}
                  className={cn(
                    "text-left rounded-md border bg-background p-3 hover:border-primary transition-colors",
                    selectedTpl === t.id && "border-primary ring-1 ring-primary/40",
                  )}
                >
                  <div className="text-xs font-medium mb-1">{t.name}</div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{t.body}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder='写点什么，或点击"AI 生成回复"由 AI 起草…'
            rows={4}
            className="resize-none bg-background"
            disabled={winInfo?.closed}
          />
        )}
        <div className="mt-2 flex items-center gap-2">
          <Button
            onClick={() => doSend(false)}
            disabled={
              sending ||
              (winInfo?.closed && templates.length > 0 && !selectedTpl) ||
              (winInfo?.closed && templates.length === 0)
            }
            className="gap-1.5"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {winInfo?.closed && templates.length > 0 ? "发送模板消息" : "发送回复"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setReply("");
              setSelectedTpl("");
            }}
            disabled={(!reply && !selectedTpl) || sending}
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

function formatHm(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

function formatShort(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60000));
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ActionBar({ thread }: { thread: Thread }) {
  const [tagInput, setTagInput] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  return (
    <div className="flex items-center gap-1 shrink-0">
      <AssignMenu thread={thread} />
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

function AssignMenu({ thread }: { thread: Thread }) {
  const group = threadGroup(thread);
  const cur = memberById(thread.meta.assigneeId);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(cur?.id ?? null);
  const [reason, setReason] = useState("");
  const [crossGroup, setCrossGroup] = useState(false);
  const [sendGreeting, setSendGreeting] = useState(false);

  const prevIds = previousAssigneeIds(thread.id);
  const inGroup = TEAM_MEMBERS.filter((m) => m.groups.includes(group));
  const outGroup = TEAM_MEMBERS.filter((m) => !m.groups.includes(group));
  const eligible = crossGroup ? [...inGroup, ...outGroup] : inGroup;
  // 排序：上次跟进人 → 组内 → 组外
  const sorted = [...eligible].sort((a, b) => {
    const ai = prevIds.indexOf(a.id);
    const bi = prevIds.indexOf(b.id);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return 0;
  });

  const isReassign = !!cur && selectedId !== cur.id;
  const canSubmit = selectedId && (!isReassign || reason.trim().length > 0);

  function reset() {
    setSelectedId(cur?.id ?? null);
    setReason("");
    setCrossGroup(false);
    setSendGreeting(false);
  }
  function submit() {
    if (!canSubmit) return;
    const target = TEAM_MEMBERS.find((m) => m.id === selectedId!);
    const isCross = !!target && !target.groups.includes(group);
    assignThread(thread.id, selectedId, {
      reason: reason.trim() || undefined,
      crossGroup: isCross,
      sendGreeting,
    });
    toast.success(cur ? `已转派给 ${target?.name}` : `已分配给 ${target?.name}`);
    setOpen(false);
    reset();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant={cur ? "outline" : "default"}
          size="sm"
          className={cn("gap-1 h-8", !cur && "bg-amber-500 hover:bg-amber-600 text-white")}
        >
          {cur ? (
            <>
              <UserCheck className="h-3.5 w-3.5" />
              {cur.name}
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" />
              分配
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b flex items-center gap-2">
          <span className="text-sm font-medium">
            {cur ? "转派会话" : "分配会话"} · {GROUP_LABEL[group]}
          </span>
          {!cur && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 gap-1 text-xs"
              onClick={() => {
                assignThread(thread.id, CURRENT_TEAM_USER_ID);
                toast.success("我来跟：会话已分配给我");
                setOpen(false);
              }}
            >
              <Hand className="h-3 w-3" /> 我来跟
            </Button>
          )}
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {sorted.map((m) => {
            const isPrev = prevIds[0] === m.id;
            const isCross = !m.groups.includes(group);
            return (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted",
                  selectedId === m.id && "bg-primary/5",
                )}
              >
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] flex items-center justify-center">
                  {m.avatarLetter}
                </span>
                <span className="font-medium">{m.name}</span>
                {m.role === "lead" && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    组长
                  </Badge>
                )}
                {isPrev && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                    上次跟进人
                  </Badge>
                )}
                {isCross && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200">
                    跨组
                  </Badge>
                )}
                {selectedId === m.id && (
                  <CheckCheck className="ml-auto h-3.5 w-3.5 text-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t space-y-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={crossGroup}
              onChange={(e) => setCrossGroup(e.target.checked)}
            />
            允许跨分组转派（管理员）
          </label>
          {isReassign && (
            <div>
              <Label className="text-xs">转派原因 <span className="text-rose-500">*</span></Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder='例如："客户在我休假期"'
                rows={2}
                className="mt-1 resize-none text-xs"
              />
            </div>
          )}
          {thread.channel === "whatsapp" && isReassign && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={sendGreeting}
                onChange={(e) => setSendGreeting(e.target.checked)}
              />
              向客户发送一条切换招呼语（共享号需要）
            </label>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={submit} disabled={!canSubmit} className="flex-1">
              {cur ? "确认转派" : "确认分配"}
            </Button>
            {cur && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  assignThread(thread.id, null, { reason: reason.trim() || "退回池" });
                  toast.success("已回退到未分配池");
                  setOpen(false);
                  reset();
                }}
              >
                退回池
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
