import { useSyncExternalStore } from "react";
import {
  getAllLedger,
  useLedger,
  type LedgerEntry,
} from "@/lib/credits-ledger";
import { addSuppression } from "@/lib/suppressions-store";

/* -------------------- Types -------------------- */

export type AiIntent =
  | "interested"
  | "quote"
  | "reject"
  | "ooo"
  | "unsubscribe"
  | "complaint"
  | "other";

export type ThreadStatus =
  | "pending" // 待跟进（有未读或 AI 标为意向/询价）
  | "waiting_reply" // 我方已回复，等对方
  | "in_cadence" // 已加入自动序列
  | "snoozed"
  | "handled"
  | "suppressed";

export const INTENT_LABEL: Record<AiIntent, string> = {
  interested: "意向",
  quote: "询价",
  reject: "拒绝",
  ooo: "自动回复",
  unsubscribe: "退订请求",
  complaint: "投诉",
  other: "其他",
};

export const INTENT_COLOR: Record<AiIntent, string> = {
  interested: "bg-emerald-100 text-emerald-700 border-emerald-200",
  quote: "bg-sky-100 text-sky-700 border-sky-200",
  reject: "bg-slate-100 text-slate-700 border-slate-200",
  ooo: "bg-amber-100 text-amber-700 border-amber-200",
  unsubscribe: "bg-orange-100 text-orange-700 border-orange-200",
  complaint: "bg-rose-100 text-rose-700 border-rose-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export const STATUS_LABEL: Record<ThreadStatus, string> = {
  pending: "待跟进",
  waiting_reply: "等待回复",
  in_cadence: "跟进中",
  snoozed: "已稍后处理",
  handled: "已处理",
  suppressed: "已抑制",
};

/** 一条会话消息（我方发出 或 对方回复） */
export interface ThreadMessage {
  id: string;
  direction: "outbound" | "inbound";
  createdAt: string;
  fromName: string;
  fromAddress: string;
  subject?: string;
  content: string;
  aiGenerated?: boolean;
  /** outbound 关联的 ledger id */
  ledgerId?: string;
  /** outbound 送达事件（模拟） */
  events?: Array<{ type: "delivered" | "opened" | "clicked"; at: string }>;
}

/** 会话的持久化元数据 */
interface ThreadMeta {
  threadId: string;
  status: ThreadStatus;
  snoozeUntil?: string;
  tags: string[];
  aiIntent?: AiIntent;
  assignee?: string;
  /** 是否被标为 star */
  starred?: boolean;
  /** 未读的 inbound 数量 */
  unread: number;
  /** 手动追加的跟进/回复 */
  extraMessages: ThreadMessage[];
  /** inbound 回复（含 seed 与后续追加） */
  inboundMessages: ThreadMessage[];
  /** 待办 */
  tasks: Array<{ id: string; title: string; dueAt?: string; done: boolean }>;
  /** 是否已加入跟进序列 */
  cadenceEnrolled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Thread {
  id: string;
  targetKind: "enterprise" | "contact";
  targetId: string;
  targetName: string;
  parentRef?: { id: string; name: string };
  /** 会话所属渠道 */
  channel: "email" | "sms";
  /** 对方地址（收件邮箱） */
  counterpartyAddress: string;
  /** 我方 sender */
  senderEmail?: string;
  messages: ThreadMessage[];
  meta: ThreadMeta;
  lastAt: string;
  lastPreview: string;
  lastDirection: "outbound" | "inbound";
}

/* -------------------- Storage -------------------- */

const META_KEY = "boo:inbox:meta:v1";
const SEED_FLAG = "boo:inbox:seed:v3";

function readMeta(): Record<string, ThreadMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return {};
    const j = JSON.parse(raw);
    if (j && typeof j === "object") return j as Record<string, ThreadMeta>;
  } catch {}
  return {};
}

function writeMeta(m: Record<string, ThreadMeta>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {}
}

let metaStore: Record<string, ThreadMeta> = readMeta();
let version = 0;
const listeners = new Set<() => void>();
function emit() {
  version++;
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getVersion() {
  return version;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === META_KEY) {
      metaStore = readMeta();
      emit();
    }
  });
}

function commit() {
  writeMeta(metaStore);
  emit();
}

function makeId(p: string) {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* -------------------- Thread key -------------------- */

/** 会话 id：企业/联系人 + 对方邮箱地址 */
function threadKey(r: LedgerEntry): string | null {
  if (r.kind !== "reach" || !r.detail) return null;
  if (r.channel === "email")
    return `t:email:${r.targetKind}:${r.targetId}:${r.detail.toLowerCase()}`;
  if (r.channel === "phone")
    return `t:sms:${r.targetKind}:${r.targetId}:${r.detail}`;
  return null;
}

function ensureMeta(threadId: string, createdAt: string): ThreadMeta {
  let m = metaStore[threadId];
  if (!m) {
    m = {
      threadId,
      status: "pending",
      tags: [],
      unread: 0,
      extraMessages: [],
      inboundMessages: [],
      tasks: [],
      createdAt,
      updatedAt: createdAt,
    };
    metaStore[threadId] = m;
  }
  return m;
}

/* -------------------- Reply seed data -------------------- */

const INTENT_TEMPLATES: Array<{ intent: AiIntent; bodies: string[] }> = [
  {
    intent: "interested",
    bodies: [
      "Thanks for reaching out — this actually aligns with what we're evaluating this quarter. Could you share a short deck and pricing tiers?",
      "很感兴趣，方便本周内做个 30 分钟的电话会吗？也请把资料一并发一下。",
      "Sounds interesting. Please loop in our procurement lead — cc'd. What are the typical MOQs?",
    ],
  },
  {
    intent: "quote",
    bodies: [
      "Could you send a formal quote for 5,000 units, delivered CIF Rotterdam? Also, lead time please.",
      "麻烦按 20HQ 报个 FOB 深圳的价，含目录里 SKU-A 和 SKU-C，谢谢。",
    ],
  },
  {
    intent: "ooo",
    bodies: [
      "I'm out of office until Monday with limited email access. For urgent matters please contact my colleague.",
      "我正在休假，将于下周一回复邮件，紧急事项请联系同事 David。",
    ],
  },
  {
    intent: "reject",
    bodies: [
      "Thanks but we already work with an existing supplier and are not looking to switch this year.",
      "感谢来信，我们暂无相关采购计划，祝好。",
    ],
  },
  {
    intent: "unsubscribe",
    bodies: ["Please remove me from your list. Thanks."],
  },
  {
    intent: "complaint",
    bodies: [
      "This is the third email this week — please stop contacting us or I will report as spam.",
    ],
  },
];

/** SMS 场景下的短回复模板（比邮件更简短，含 STOP 关键字） */
const SMS_INTENT_TEMPLATES: Array<{ intent: AiIntent; bodies: string[] }> = [
  { intent: "interested", bodies: ["Interested — send details please.", "有兴趣，请发资料到我邮箱。", "Ok, share your catalog."] },
  { intent: "quote", bodies: ["Send price for 5k units.", "报个 FOB 深圳的价"] },
  { intent: "ooo", bodies: ["On leave, back Mon.", "在休假，下周一联系"] },
  { intent: "reject", bodies: ["No thanks.", "暂无采购计划"] },
  { intent: "unsubscribe", bodies: ["STOP", "退订"] },
  { intent: "complaint", bodies: ["Stop texting me!"] },
];

function pickSmsIntent(seed: number): { intent: AiIntent; body: string } {
  // SMS 权重：意向 20% / 询价 15% / OOO 10% / 拒绝 30% / 退订 20% / 投诉 5%
  const w = [20, 35, 45, 75, 95, 100];
  const kind = ["interested", "quote", "ooo", "reject", "unsubscribe", "complaint"] as const;
  const p = seed % 100;
  const idx = w.findIndex((x) => p < x);
  const intent = kind[Math.max(0, idx)];
  const tpl = SMS_INTENT_TEMPLATES.find((t) => t.intent === intent)!;
  const body = tpl.bodies[seed % tpl.bodies.length];
  return { intent, body };
}

function pickIntent(seed: number): { intent: AiIntent; body: string } {
  // 权重：意向 30% / 询价 25% / OOO 15% / 拒绝 20% / 退订 7% / 投诉 3%
  const w = [30, 55, 70, 90, 97, 100];
  const kind = ["interested", "quote", "ooo", "reject", "unsubscribe", "complaint"] as const;
  const p = seed % 100;
  const idx = w.findIndex((x) => p < x);
  const intent = kind[Math.max(0, idx)];
  const tpl = INTENT_TEMPLATES.find((t) => t.intent === intent)!;
  const body = tpl.bodies[seed % tpl.bodies.length];
  return { intent, body };
}

/** 首次访问收件箱时，对已有邮件触达按 ~40% 概率补上一条对方回复 */
function seedInboundIfNeeded(entries: LedgerEntry[]) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEED_FLAG)) return;
  let changed = false;
  for (const r of entries) {
    const key = threadKey(r);
    if (!key) continue;
    const m = ensureMeta(key, r.createdAt);
    if (m.inboundMessages.length > 0) continue;
    const h = hashStr(r.id);
    const isSms = r.channel === "phone";
    // SMS 回复率更低（~25%），邮件 ~40%
    const threshold = isSms ? 25 : 40;
    if (h % 100 < threshold) {
      const { intent, body } = isSms ? pickSmsIntent(h) : pickIntent(h);
      // 回复时间：发送后 4~72 小时
      const sentAt = new Date(r.createdAt).getTime();
      const delayH = 4 + (h % 68);
      const replyAt = new Date(sentAt + delayH * 3600_000).toISOString();
      if (new Date(replyAt).getTime() > Date.now()) continue;
      m.inboundMessages.push({
        id: makeId("in"),
        direction: "inbound",
        createdAt: replyAt,
        fromName: r.parentRef?.name
          ? `${r.targetName} · ${r.parentRef.name}`
          : r.targetName,
        fromAddress: r.detail || "",
        subject: r.subject ? `Re: ${r.subject}` : undefined,
        content: body,
      });
      m.aiIntent = intent;
      m.unread = 1;
      // 退订 / 投诉 → 自动抑制并加入退订名单；OOO → snooze 3 天；意向/询价 → 待跟进；拒绝 → 已处理
      if (intent === "unsubscribe" || intent === "complaint") {
        m.status = "suppressed";
        m.unread = 0;
        // SMS 场景 STOP 关键字 → 加入手机号退订名单
        if (isSms && r.detail) {
          addSuppression("phone", r.detail, intent === "unsubscribe" ? "STOP 关键字" : "投诉");
        } else if (!isSms && r.detail) {
          addSuppression("email", r.detail, intent === "unsubscribe" ? "退订请求" : "投诉");
        }
      } else if (intent === "ooo") {
        m.status = "snoozed";
        m.snoozeUntil = new Date(
          new Date(replyAt).getTime() + 3 * 24 * 3600_000,
        ).toISOString();
      } else if (intent === "reject") {
        m.status = "handled";
        m.unread = 0;
      } else {
        m.status = "pending";
      }
      m.updatedAt = replyAt;
      changed = true;
    }
  }
  if (changed) writeMeta(metaStore);
  window.localStorage.setItem(SEED_FLAG, "1");
}

/* -------------------- Derive threads -------------------- */

function buildThreads(entries: LedgerEntry[]): Thread[] {
  seedInboundIfNeeded(entries);
  const map = new Map<string, Thread>();
  // ledger 已按时间倒序，我们要按线索归并
  for (let i = entries.length - 1; i >= 0; i--) {
    const r = entries[i];
    const key = threadKey(r);
    if (!key) continue;
    const meta = ensureMeta(key, r.createdAt);
    let t = map.get(key);
    if (!t) {
      t = {
        id: key,
        targetKind: r.targetKind,
        targetId: r.targetId,
        targetName: r.targetName,
        parentRef: r.parentRef,
        channel: r.channel === "phone" ? "sms" : "email",
        counterpartyAddress: r.detail || "",
        senderEmail: r.senderEmail,
        messages: [],
        meta,
        lastAt: r.createdAt,
        lastPreview: "",
        lastDirection: "outbound",
      };
      map.set(key, t);
    }
    // outbound 事件（模拟）：15 分钟后 delivered；30% opened；10% clicked
    const sent = new Date(r.createdAt).getTime();
    const events: ThreadMessage["events"] = [];
    if (Date.now() - sent > 15 * 60_000)
      events.push({ type: "delivered", at: new Date(sent + 15 * 60_000).toISOString() });
    const h = hashStr(r.id);
    if (h % 100 < 55)
      events.push({ type: "opened", at: new Date(sent + 60 * 60_000).toISOString() });
    if (h % 100 < 18)
      events.push({ type: "clicked", at: new Date(sent + 90 * 60_000).toISOString() });
    t.messages.push({
      id: `ob_${r.id}`,
      direction: "outbound",
      createdAt: r.createdAt,
      fromName: "你",
      fromAddress: r.senderEmail || "",
      subject: r.subject,
      content: r.content || "(此邮件无正文快照)",
      aiGenerated: r.aiGenerated,
      ledgerId: r.id,
      events,
    });
    if (r.senderEmail && !t.senderEmail) t.senderEmail = r.senderEmail;
  }
  // 追加 inbound + extra
  for (const t of map.values()) {
    const meta = t.meta;
    for (const im of meta.inboundMessages) t.messages.push(im);
    for (const em of meta.extraMessages) t.messages.push(em);
    t.messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const last = t.messages[t.messages.length - 1];
    if (last) {
      t.lastAt = last.createdAt;
      t.lastDirection = last.direction;
      t.lastPreview = last.content.slice(0, 120);
    }
    // 到期解 snooze
    if (meta.status === "snoozed" && meta.snoozeUntil && new Date(meta.snoozeUntil).getTime() < Date.now()) {
      meta.status = "pending";
      meta.snoozeUntil = undefined;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/* -------------------- Hooks -------------------- */

function useMetaVersion() {
  useSyncExternalStore(subscribe, getVersion, getVersion);
}

export function useThreads(): Thread[] {
  useMetaVersion();
  const entries = useLedger();
  return buildThreads(entries);
}

export function useThread(id: string): Thread | undefined {
  const list = useThreads();
  return list.find((t) => t.id === id);
}

export function getThreadsSnapshot(): Thread[] {
  return buildThreads(getAllLedger());
}

export interface InboxCounts {
  all: number;
  unread: number;
  pending: number;
  waiting: number;
  handled: number;
  snoozed: number;
  suppressed: number;
  hasReply: number;
  noReply: number;
  bounced: number;
}

export function useInboxCounts(): InboxCounts {
  const list = useThreads();
  const c: InboxCounts = {
    all: list.length,
    unread: 0,
    pending: 0,
    waiting: 0,
    handled: 0,
    snoozed: 0,
    suppressed: 0,
    hasReply: 0,
    noReply: 0,
    bounced: 0,
  };
  for (const t of list) {
    if (t.meta.unread > 0) c.unread++;
    if (t.meta.status === "pending") c.pending++;
    if (t.meta.status === "waiting_reply") c.waiting++;
    if (t.meta.status === "handled") c.handled++;
    if (t.meta.status === "snoozed") c.snoozed++;
    if (t.meta.status === "suppressed") c.suppressed++;
    if (t.meta.inboundMessages.length > 0) c.hasReply++;
    else c.noReply++;
  }
  return c;
}

/** 供侧边栏轻量订阅未读 + 待跟进 徽标 */
export function useSidebarBadge(): { unread: number; pending: number } {
  const list = useThreads();
  let unread = 0;
  let pending = 0;
  for (const t of list) {
    if (t.meta.unread > 0) unread++;
    if (t.meta.status === "pending") pending++;
  }
  return { unread, pending };
}

/** 取某企业/联系人的最新会话（用于详情页胶囊卡） */
export function useLatestThreadFor(
  targetKind: "enterprise" | "contact",
  targetId: string,
): Thread | undefined {
  const list = useThreads();
  return list.find((t) => t.targetKind === targetKind && t.targetId === targetId);
}

/* -------------------- Actions -------------------- */

export function markThreadRead(id: string) {
  const m = metaStore[id];
  if (!m || m.unread === 0) return;
  m.unread = 0;
  m.updatedAt = new Date().toISOString();
  commit();
}

export function snoozeThread(id: string, ms: number) {
  const m = metaStore[id];
  if (!m) return;
  m.status = "snoozed";
  m.snoozeUntil = new Date(Date.now() + ms).toISOString();
  m.unread = 0;
  m.updatedAt = new Date().toISOString();
  commit();
}

export function markHandled(id: string, handled = true) {
  const m = metaStore[id];
  if (!m) return;
  m.status = handled ? "handled" : "pending";
  if (handled) m.unread = 0;
  m.updatedAt = new Date().toISOString();
  commit();
}

export function toggleStar(id: string) {
  const m = metaStore[id];
  if (!m) return;
  m.starred = !m.starred;
  commit();
}

export function updateIntent(id: string, intent: AiIntent) {
  const m = metaStore[id];
  if (!m) return;
  m.aiIntent = intent;
  m.updatedAt = new Date().toISOString();
  commit();
}

export function addTag(id: string, tag: string) {
  const m = metaStore[id];
  if (!m) return;
  if (!m.tags.includes(tag)) m.tags.push(tag);
  commit();
}

export function removeTag(id: string, tag: string) {
  const m = metaStore[id];
  if (!m) return;
  m.tags = m.tags.filter((t) => t !== tag);
  commit();
}

export function enrollCadence(id: string, enrolled = true) {
  const m = metaStore[id];
  if (!m) return;
  m.cadenceEnrolled = enrolled;
  m.status = enrolled ? "in_cadence" : "pending";
  m.updatedAt = new Date().toISOString();
  commit();
}

export function suppressThread(id: string) {
  const m = metaStore[id];
  if (!m) return;
  m.status = "suppressed";
  m.unread = 0;
  m.updatedAt = new Date().toISOString();
  commit();
}

export function addTaskForThread(
  id: string,
  title: string,
  dueAt?: string,
) {
  const m = metaStore[id];
  if (!m) return;
  m.tasks.push({ id: makeId("tk"), title, dueAt, done: false });
  m.updatedAt = new Date().toISOString();
  commit();
}

export function toggleTask(id: string, taskId: string) {
  const m = metaStore[id];
  if (!m) return;
  const t = m.tasks.find((x) => x.id === taskId);
  if (t) t.done = !t.done;
  commit();
}

export function sendReply(input: {
  threadId: string;
  content: string;
  fromAddress: string;
  fromName?: string;
  subject?: string;
  aiGenerated?: boolean;
}) {
  const m = metaStore[input.threadId];
  if (!m) return;
  const now = new Date().toISOString();
  m.extraMessages.push({
    id: makeId("ob"),
    direction: "outbound",
    createdAt: now,
    fromName: input.fromName || "你",
    fromAddress: input.fromAddress,
    subject: input.subject,
    content: input.content,
    aiGenerated: input.aiGenerated,
    events: [{ type: "delivered", at: now }],
  });
  m.status = "waiting_reply";
  m.unread = 0;
  m.updatedAt = now;
  commit();
}

/* -------------------- Snooze presets -------------------- */

export const SNOOZE_PRESETS: Array<{ label: string; ms: number }> = [
  { label: "1 小时后", ms: 60 * 60_000 },
  { label: "明早 9:00", ms: nextMorningMs() },
  { label: "3 天后", ms: 3 * 24 * 3600_000 },
  { label: "下周一 9:00", ms: nextMondayMs() },
];
function nextMorningMs() {
  const d = new Date();
  const n = new Date(d);
  n.setDate(d.getDate() + 1);
  n.setHours(9, 0, 0, 0);
  return n.getTime() - d.getTime();
}
function nextMondayMs() {
  const d = new Date();
  const n = new Date(d);
  const day = d.getDay();
  const add = ((8 - day) % 7) || 7;
  n.setDate(d.getDate() + add);
  n.setHours(9, 0, 0, 0);
  return n.getTime() - d.getTime();
}

/* -------------------- Reset for dev/demo -------------------- */

export function resetInboxMeta() {
  metaStore = {};
  writeMeta(metaStore);
  if (typeof window !== "undefined") window.localStorage.removeItem(SEED_FLAG);
  emit();
}