import { useSyncExternalStore } from "react";

export type SuppressionKind = "email" | "phone";

export interface SuppressionRecord {
  id: string;
  kind: SuppressionKind;
  value: string; // 邮箱或手机号（已去空白）
  reason: string;
  createdAt: string;
  source?: string; // 来源：STOP 关键字 / 硬退信 / 手动 / 投诉
  note?: string;
}

const KEY = "boo:suppressions:v1";
const SEED_KEY = "boo:suppressions:seed:v1";

function read(): SuppressionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j as SuppressionRecord[];
  } catch {}
  return [];
}

function write(list: SuppressionRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

let store: SuppressionRecord[] = read();
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
    if (e.key === KEY) {
      store = read();
      emit();
    }
  });
  // 一次性种子数据，用于演示
  if (!window.localStorage.getItem(SEED_KEY)) {
    const now = Date.now();
    const seed: SuppressionRecord[] = [
      { id: "sup_s1", kind: "email", value: "no-reply@example.com", reason: "退订请求", source: "退订链接", createdAt: new Date(now - 5 * 86400_000).toISOString() },
      { id: "sup_s2", kind: "email", value: "bounced@invalid.io", reason: "硬退信", source: "SMTP 550", createdAt: new Date(now - 3 * 86400_000).toISOString() },
      { id: "sup_s3", kind: "phone", value: "+8613800001111", reason: "STOP 关键字", source: "MO 消息", createdAt: new Date(now - 2 * 86400_000).toISOString() },
    ];
    write(seed);
    store = seed;
    window.localStorage.setItem(SEED_KEY, "1");
  }
}

function makeId() {
  return `sup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function normalizeValue(kind: SuppressionKind, v: string) {
  const s = v.trim();
  return kind === "email" ? s.toLowerCase() : s.replace(/\s+/g, "");
}

export function isSuppressed(kind: SuppressionKind, v: string): boolean {
  const key = normalizeValue(kind, v);
  return store.some((r) => r.kind === kind && r.value === key);
}

export function addSuppression(kind: SuppressionKind, value: string, reason: string, source?: string, note?: string) {
  const key = normalizeValue(kind, value);
  if (!key) return;
  if (store.some((r) => r.kind === kind && r.value === key)) return;
  const rec: SuppressionRecord = {
    id: makeId(),
    kind,
    value: key,
    reason,
    source,
    note,
    createdAt: new Date().toISOString(),
  };
  store = [rec, ...store];
  write(store);
  emit();
}

export function removeSuppression(id: string) {
  store = store.filter((r) => r.id !== id);
  write(store);
  emit();
}

export function useSuppressions(): SuppressionRecord[] {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return store;
}

export function getSuppressionsSnapshot(): SuppressionRecord[] {
  return store;
}