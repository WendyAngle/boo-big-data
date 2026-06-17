import { useSyncExternalStore } from "react";

export type LedgerKind = "view" | "reach" | "refund";
export type ViewField = "email" | "phone" | "social" | "address";
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

export const VIEW_FIELD_LABEL: Record<ViewField, string> = {
  email: "联系邮箱",
  phone: "联系电话",
  social: "社媒账号",
  address: "详细地址",
};

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