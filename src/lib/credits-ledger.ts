import { useSyncExternalStore } from "react";

export type LedgerKind = "view" | "reach" | "refund";
export type ViewField =
  | "email"
  | "phone"
  | "social"
  | "address"
  | "title"
  | "seniority";
export type ReachChannel = "email" | "phone" | "social";
export type ReachStatus = "pending" | "in_progress" | "success" | "failed";
export type TargetKind = "enterprise" | "contact";

export const COST_VIEW = 5;
export const COST_REACH = 10;

export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  cost: number;
  createdAt: string;
  targetKind: TargetKind;
  targetId: string; // enterprise: ent.id ; contact: `${ent.id}:${idx}`
  targetName: string;
  parentRef?: { id: string; name: string };
  // view-only
  field?: ViewField;
  // reach-only
  channel?: ReachChannel;
  platform?: string; // e.g. "LinkedIn"
  detail?: string; // masked or partial; e.g. email/phone/handle
  // demo / override: when set, getReachStatus returns this value directly
  forcedStatus?: ReachStatus;
  // reach-only: populated when status is failed
  failReason?: string;
  // refund-only: id of the related reach entry being refunded
  relatedReachId?: string;
}

const LEDGER_KEY = "boo:ledger:v1";
const LEDGER_SEED_FLAG = "boo:ledger:v3:seeded";
const REVEAL_KEY = "boo:reveal:v1";

/* -------------------- ledger store -------------------- */

function readLedger(): LedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

function writeLedger(arr: LedgerEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(arr));
  } catch {}
}

let ledger: LedgerEntry[] = readLedger();
let ledgerVersion = 0;
const ledgerListeners = new Set<() => void>();

function emitLedger() {
  ledgerVersion++;
  ledgerListeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LEDGER_KEY) {
      ledger = readLedger();
      emitLedger();
    }
  });
}

function subscribeLedger(cb: () => void) {
  ledgerListeners.add(cb);
  return () => ledgerListeners.delete(cb);
}

function getLedgerVersion() {
  return ledgerVersion;
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function chargeView(input: {
  targetKind: TargetKind;
  targetId: string;
  targetName: string;
  parentRef?: { id: string; name: string };
  field: ViewField;
  detail?: string;
}): LedgerEntry {
  const entry: LedgerEntry = {
    id: makeId("v"),
    kind: "view",
    cost: COST_VIEW,
    createdAt: new Date().toISOString(),
    ...input,
  };
  ledger = [entry, ...ledger];
  writeLedger(ledger);
  emitLedger();
  return entry;
}

export function createReach(input: {
  targetKind: TargetKind;
  targetId: string;
  targetName: string;
  parentRef?: { id: string; name: string };
  channel: ReachChannel;
  platform?: string;
  detail: string;
}): LedgerEntry {
  const entry: LedgerEntry = {
    id: makeId("r"),
    kind: "reach",
    cost: COST_REACH,
    createdAt: new Date().toISOString(),
    ...input,
  };
  ledger = [entry, ...ledger];
  writeLedger(ledger);
  emitLedger();
  return entry;
}

export function useLedger(): LedgerEntry[] {
  useSyncExternalStore(subscribeLedger, getLedgerVersion, getLedgerVersion);
  return ledger;
}

export function getAllLedger(): LedgerEntry[] {
  return ledger;
}

/* -------------------- reach status -------------------- */

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getReachStatus(r: LedgerEntry, now = Date.now()): ReachStatus {
  if (r.kind !== "reach") return "success";
  if (r.forcedStatus) return r.forcedStatus;
  const t = new Date(r.createdAt).getTime();
  const elapsedSec = (now - t) / 1000;
  if (elapsedSec < 30) return "pending";
  if (elapsedSec < 180) return "in_progress";
  // terminal — deterministic by id, ~85% success
  return hashStr(r.id) % 100 < 85 ? "success" : "failed";
}

export const REACH_STATUS_LABEL: Record<ReachStatus, string> = {
  pending: "待触达",
  in_progress: "触达中",
  success: "已触达",
  failed: "触达失败",
};

export const REACH_STATUS_COLOR: Record<ReachStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  failed: "bg-rose-100 text-rose-700 border-rose-200",
};

export const REACH_CHANNEL_LABEL: Record<ReachChannel, string> = {
  email: "邮件",
  phone: "电话",
  social: "社媒",
};

/* -------------------- fail reasons -------------------- */

export const FAIL_REASONS: Record<ReachChannel, string[]> = {
  email: ["邮箱无效（地址不存在）", "对方邮件服务器退信", "对方拒收 / 标记为垃圾邮件"],
  phone: ["对方手机关机或无信号", "多次拨打无人接听", "对方主动拒接"],
  social: ["账号已失效或停用", "私信发送后长期无响应", "消息被平台拦截"],
};

/**
 * 永久性失败原因：联系方式本身存在问题或对方明确拒绝，重新触达基本无意义。
 * 其余原因视为临时性失败，允许重新触达。
 */
const NON_RETRYABLE_FAIL_REASONS: ReadonlySet<string> = new Set([
  "邮箱无效（地址不存在）",
  "对方拒收 / 标记为垃圾邮件",
  "对方主动拒接",
  "账号已失效或停用",
  "消息被平台拦截",
]);

export function isRetryableFailReason(reason?: string): boolean {
  if (!reason) return true;
  return !NON_RETRYABLE_FAIL_REASONS.has(reason);
}

function pickFailReason(channel: ReachChannel | undefined, seed: string): string {
  const ch: ReachChannel = channel ?? "email";
  const list = FAIL_REASONS[ch];
  return list[hashStr(seed) % list.length];
}

function persistLedger() {
  writeLedger(ledger);
  emitLedger();
}

export const VIEW_FIELD_LABEL: Record<ViewField, string> = {
  email: "联系邮箱",
  phone: "联系电话",
  social: "社媒账号",
  address: "详细地址",
  title: "职位信息",
  seniority: "职级信息",
};

/* -------------------- refunds for failed reaches -------------------- */

/**
 * Scan all reach entries: if a reach is currently `failed` and no refund
 * record exists yet for it, append a refund entry that returns COST_REACH.
 * Idempotent — safe to call on a timer.
 */
export function syncFailedRefunds(now = Date.now()): number {
  if (typeof window === "undefined") return 0;
  const refundedIds = new Set(
    ledger
      .filter((e) => e.kind === "refund" && e.relatedReachId)
      .map((e) => e.relatedReachId as string),
  );
  const newRefunds: LedgerEntry[] = [];
  let reasonsChanged = false;
  for (const r of ledger) {
    if (r.kind !== "reach") continue;
    if (getReachStatus(r, now) !== "failed") continue;
    // backfill fail reason on any failed reach lacking one
    if (!r.failReason) {
      r.failReason = pickFailReason(r.channel, r.id);
      reasonsChanged = true;
    }
    if (refundedIds.has(r.id)) continue;
    newRefunds.push({
      id: makeId("rf"),
      kind: "refund",
      cost: COST_REACH,
      // refund is recorded slightly after the failed reach time
      createdAt: new Date(
        new Date(r.createdAt).getTime() + 1000,
      ).toISOString(),
      targetKind: r.targetKind,
      targetId: r.targetId,
      targetName: r.targetName,
      parentRef: r.parentRef,
      channel: r.channel,
      platform: r.platform,
      detail: r.detail,
      relatedReachId: r.id,
    });
  }
  if (newRefunds.length === 0 && !reasonsChanged) return 0;
  if (newRefunds.length > 0) ledger = [...newRefunds, ...ledger];
  persistLedger();
  return newRefunds.length;
}

/* -------------------- reach actions -------------------- */

/**
 * Immediately advance a pending reach to in_progress.
 * Clears any forcedStatus override and resets createdAt to now so the
 * natural status timeline (in_progress -> success/failed) takes effect.
 */
export function triggerReachNow(reachId: string): boolean {
  const idx = ledger.findIndex((e) => e.id === reachId && e.kind === "reach");
  if (idx < 0) return false;
  const r = ledger[idx];
  const status = getReachStatus(r);
  if (status !== "pending") return false;
  const updated: LedgerEntry = {
    ...r,
    // Backdate so getReachStatus() returns in_progress (30s..180s window)
    createdAt: new Date(Date.now() - 31_000).toISOString(),
    forcedStatus: undefined,
  };
  ledger = [...ledger.slice(0, idx), updated, ...ledger.slice(idx + 1)];
  persistLedger();
  return true;
}

/**
 * Cancel a pending reach and refund its cost. Removes the reach entry
 * and appends a refund record so the credit balance reconciles.
 */
export function cancelPendingReach(reachId: string): boolean {
  const r = ledger.find((e) => e.id === reachId && e.kind === "reach");
  if (!r) return false;
  if (getReachStatus(r) !== "pending") return false;
  const refund: LedgerEntry = {
    id: makeId("rf"),
    kind: "refund",
    cost: COST_REACH,
    createdAt: new Date().toISOString(),
    targetKind: r.targetKind,
    targetId: r.targetId,
    targetName: r.targetName,
    parentRef: r.parentRef,
    channel: r.channel,
    platform: r.platform,
    detail: r.detail,
    relatedReachId: r.id,
  };
  ledger = [refund, ...ledger.filter((e) => e.id !== reachId)];
  persistLedger();
  return true;
}

/**
 * Retry a failed reach by creating a fresh pending reach entry that
 * targets the same contact/enterprise via the same channel. Charges
 * COST_REACH again (the original failure was already refunded).
 */
export function retryFailedReach(reachId: string): LedgerEntry | null {
  const r = ledger.find((e) => e.id === reachId && e.kind === "reach");
  if (!r) return null;
  if (getReachStatus(r) !== "failed") return null;
  const fresh: LedgerEntry = {
    id: makeId("r"),
    kind: "reach",
    cost: COST_REACH,
    createdAt: new Date().toISOString(),
    targetKind: r.targetKind,
    targetId: r.targetId,
    targetName: r.targetName,
    parentRef: r.parentRef,
    channel: r.channel,
    platform: r.platform,
    detail: r.detail,
  };
  ledger = [fresh, ...ledger];
  persistLedger();
  return fresh;
}

/** True if a refund record already exists for the given reach entry id. */
export function isReachRefunded(reachId: string): boolean {
  return ledger.some(
    (e) => e.kind === "refund" && e.relatedReachId === reachId,
  );
}

/* -------------------- reveal cache (session) -------------------- */

function readReveal(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(REVEAL_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr as string[]);
  } catch {}
  return new Set();
}

function writeReveal(s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(REVEAL_KEY, JSON.stringify([...s]));
  } catch {}
}

let revealSet: Set<string> = readReveal();
let revealVersion = 0;
const revealListeners = new Set<() => void>();

function emitReveal() {
  revealVersion++;
  revealListeners.forEach((l) => l());
}

function subscribeReveal(cb: () => void) {
  revealListeners.add(cb);
  return () => revealListeners.delete(cb);
}

function getRevealVersion() {
  return revealVersion;
}

export function revealKey(
  targetKind: TargetKind,
  targetId: string,
  field: ViewField,
  subKey?: string,
) {
  return `${targetKind}:${targetId}:${field}${subKey ? `:${subKey}` : ""}`;
}

export function isRevealed(key: string): boolean {
  return revealSet.has(key);
}

export function setRevealed(key: string, value: boolean) {
  const next = new Set(revealSet);
  if (value) next.add(key);
  else next.delete(key);
  revealSet = next;
  writeReveal(revealSet);
  emitReveal();
}

export function useRevealed(key: string): boolean {
  useSyncExternalStore(subscribeReveal, getRevealVersion, getRevealVersion);
  return revealSet.has(key);
}

/* -------------------- masking helpers -------------------- */

export function maskEmail(_email: string) {
  return "****@****.com";
}

export function maskPhone(phone: string) {
  if (!phone) return "—";
  const digits = phone.replace(/[^+\d]/g, "");
  if (digits.length <= 5) return "***";
  const head = digits.slice(0, 3);
  const tail = digits.slice(-2);
  return `${head}****${tail}`;
}

export function maskHandle(handle: string) {
  if (!handle || handle === "—") return handle;
  const h = handle.replace(/^@/, "");
  const prefix = handle.startsWith("@") ? "@" : "";
  if (h.length <= 4) return `${prefix}${h[0] ?? ""}***`;
  return `${prefix}${h.slice(0, 2)}****${h.slice(-2)}`;
}

export function maskAddress(_address: string) {
  return "*** *** *** *** ***";
}

export function maskTitle(_title: string) {
  return "•••• ••••••";
}

export function maskSeniority(_seniority: string) {
  return "•••";
}

export function maskUrl(url: string) {
  if (!url) return "";
  const parts = url.split("/");
  if (parts.length < 2) return "***";
  const last = parts[parts.length - 1];
  parts[parts.length - 1] = maskHandle(last);
  return parts.join("/");
}

/* -------------------- seeding -------------------- */

function isoMinutesAgo(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

export function seedDemoLedgerIfEmpty() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(LEDGER_SEED_FLAG)) return;
    // dynamic import to avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const seed: LedgerEntry[] = [
      // ---- reach (5) ----
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(60), // 终态
        targetKind: "enterprise",
        targetId: "ENT-0001",
        targetName: "Wenzhou Sunrise Textile Co Ltd",
        channel: "email",
        detail: "contact@sunrise-tex.com",
        forcedStatus: "success",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(20),
        targetKind: "contact",
        targetId: "ENT-0005:1",
        targetName: "Maria Lopez",
        parentRef: { id: "ENT-0005", name: "Fruticola Olmue S.A." },
        channel: "phone",
        detail: "+56 9 ****55",
        forcedStatus: "success",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(5), // 触达中
        targetKind: "enterprise",
        targetId: "ENT-0012",
        targetName: "Lotus Gourmet Foods JSC",
        channel: "social",
        platform: "LinkedIn",
        detail: "linkedin.com/company/lotusgourmet",
        forcedStatus: "in_progress",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(2), // 触达中
        targetKind: "contact",
        targetId: "ENT-0024:0",
        targetName: "Daniel Chen",
        parentRef: { id: "ENT-0024", name: "Ningbo Poly Hardware Trading" },
        channel: "email",
        detail: "daniel.chen@ningbopoly.com",
        forcedStatus: "in_progress",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(0.2), // 待触达
        targetKind: "enterprise",
        targetId: "ENT-0008",
        targetName: "Guangzhou Fortune Metal Co",
        channel: "phone",
        detail: "+86 20 ****88",
        forcedStatus: "pending",
      },
      // ---- 触达失败 (2) ----
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(180),
        targetKind: "enterprise",
        targetId: "ENT-0015",
        targetName: "Shanghai Hema Electronics Ltd",
        channel: "email",
        detail: "biz@shhema.com",
        forcedStatus: "failed",
        failReason: "邮箱无效（地址不存在）",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(95),
        targetKind: "contact",
        targetId: "ENT-0011:0",
        targetName: "Jorge Ramirez",
        parentRef: { id: "ENT-0011", name: "La Loma Del Valle Export" },
        channel: "social",
        platform: "LinkedIn",
        detail: "linkedin.com/in/jorge-ramirez",
        forcedStatus: "failed",
        failReason: "私信发送后长期无响应",
      },
      // ---- 再加 1 个待触达 ----
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(0.1),
        targetKind: "contact",
        targetId: "ENT-0001:0",
        targetName: "Alex Wang",
        parentRef: { id: "ENT-0001", name: "Wenzhou Sunrise Textile Co Ltd" },
        channel: "email",
        detail: "alex.wang@sunrise-tex.com",
        forcedStatus: "pending",
      },
      // ---- 更多待触达 ----
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(0.05),
        targetKind: "enterprise",
        targetId: "ENT-0019",
        targetName: "Hanoi Bright Garment JSC",
        channel: "email",
        detail: "sales@hanoibright.vn",
        forcedStatus: "pending",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(0.08),
        targetKind: "contact",
        targetId: "ENT-0022:1",
        targetName: "Priya Sharma",
        parentRef: { id: "ENT-0022", name: "Mumbai Spice & Foods Pvt Ltd" },
        channel: "phone",
        detail: "+91 22 ****41",
        forcedStatus: "pending",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(0.15),
        targetKind: "contact",
        targetId: "ENT-0007:0",
        targetName: "Sofia Rossi",
        parentRef: { id: "ENT-0007", name: "Milano Pasta Artigianale S.r.l." },
        channel: "social",
        platform: "LinkedIn",
        detail: "linkedin.com/in/sofia-rossi",
        forcedStatus: "pending",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(0.25),
        targetKind: "enterprise",
        targetId: "ENT-0031",
        targetName: "Bangkok Fresh Seafood Co Ltd",
        channel: "email",
        detail: "purchasing@bkkfresh.co.th",
        forcedStatus: "pending",
      },
      // ---- 更多触达失败（可重新触达）----
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(220),
        targetKind: "contact",
        targetId: "ENT-0008:0",
        targetName: "Kevin Liu",
        parentRef: { id: "ENT-0008", name: "Guangzhou Fortune Metal Co" },
        channel: "phone",
        detail: "+86 138 ****72",
        forcedStatus: "failed",
        failReason: "对方手机关机或无信号",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(260),
        targetKind: "enterprise",
        targetId: "ENT-0014",
        targetName: "Kuala Lumpur Rubber Trading Sdn",
        channel: "email",
        detail: "info@klrubber.com.my",
        forcedStatus: "failed",
        failReason: "对方邮件服务器退信",
      },
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(310),
        targetKind: "contact",
        targetId: "ENT-0027:0",
        targetName: "Ahmed Hassan",
        parentRef: { id: "ENT-0027", name: "Cairo Cotton Mills SAE" },
        channel: "phone",
        detail: "+20 2 ****19",
        forcedStatus: "failed",
        failReason: "多次拨打无人接听",
      },
      // ---- 更多触达失败（不可重新触达）----
      {
        id: makeId("r"),
        kind: "reach",
        cost: COST_REACH,
        createdAt: isoMinutesAgo(360),
        targetKind: "contact",
        targetId: "ENT-0033:0",
        targetName: "Carlos Mendoza",
        parentRef: { id: "ENT-0033", name: "Lima Andes Coffee Export SAC" },
        channel: "social",
        platform: "LinkedIn",
        detail: "linkedin.com/in/carlos-mendoza",
        forcedStatus: "failed",
        failReason: "账号已失效或停用",
      },
      // ---- view (6) ----
      {
        id: makeId("v"),
        kind: "view",
        cost: COST_VIEW,
        createdAt: isoMinutesAgo(120),
        targetKind: "enterprise",
        targetId: "ENT-0001",
        targetName: "Wenzhou Sunrise Textile Co Ltd",
        field: "email",
        detail: "contact@sunrise-tex.com",
      },
      {
        id: makeId("v"),
        kind: "view",
        cost: COST_VIEW,
        createdAt: isoMinutesAgo(118),
        targetKind: "enterprise",
        targetId: "ENT-0001",
        targetName: "Wenzhou Sunrise Textile Co Ltd",
        field: "phone",
        detail: "+86 577 ****99",
      },
      {
        id: makeId("v"),
        kind: "view",
        cost: COST_VIEW,
        createdAt: isoMinutesAgo(95),
        targetKind: "contact",
        targetId: "ENT-0005:1",
        targetName: "Maria Lopez",
        parentRef: { id: "ENT-0005", name: "Fruticola Olmue S.A." },
        field: "email",
        detail: "maria.lopez@olmue.cl",
      },
      {
        id: makeId("v"),
        kind: "view",
        cost: COST_VIEW,
        createdAt: isoMinutesAgo(48),
        targetKind: "enterprise",
        targetId: "ENT-0012",
        targetName: "Lotus Gourmet Foods JSC",
        field: "social",
        detail: "LinkedIn @lotusgourmet",
      },
      {
        id: makeId("v"),
        kind: "view",
        cost: COST_VIEW,
        createdAt: isoMinutesAgo(30),
        targetKind: "enterprise",
        targetId: "ENT-0008",
        targetName: "Guangzhou Fortune Metal Co",
        field: "address",
        detail: "No.88 Yuexiu Rd, Guangzhou",
      },
      {
        id: makeId("v"),
        kind: "view",
        cost: COST_VIEW,
        createdAt: isoMinutesAgo(15),
        targetKind: "contact",
        targetId: "ENT-0024:0",
        targetName: "Daniel Chen",
        parentRef: { id: "ENT-0024", name: "Ningbo Poly Hardware Trading" },
        field: "phone",
        detail: "+86 574 ****21",
      },
    ];
    ledger = [...seed, ...ledger];
    writeLedger(ledger);
    window.localStorage.setItem(LEDGER_SEED_FLAG, "1");
    emitLedger();
  } catch {}
}

export function resetDemoLedger() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEDGER_SEED_FLAG);
  } catch {}
  ledger = [];
  writeLedger(ledger);
  emitLedger();
  seedDemoLedgerIfEmpty();
}