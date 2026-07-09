import { useMemo } from "react";
import {
  useLedger,
  type LedgerEntry,
  type TargetKind,
} from "@/lib/credits-ledger";
import { findEnterprise } from "@/data/enterprises";

/**
 * 解锁记录 · 派生自 credits-ledger 中 kind==="view" 且字段为
 * email/phone/social 的条目。同一 (owner, contact_type, value)
 * 仅保留首次解锁记录（时间最早），unlock_cost 与 unlock_time 取自该条。
 */
export type ContactType = "email" | "phone" | "social_media";
export type OwnerType = "enterprise" | "person";

export interface UnlockedContact {
  id: string;
  contact_type: ContactType;
  contact_value: string;
  owner_type: OwnerType;
  owner_id: string;
  owner_name: string;
  parent_ref?: { id: string; name: string };
  platform?: string;
  unlock_time: number;
  unlock_cost: number;
  is_unlocked: boolean;
}

function toContactType(field: string): ContactType | null {
  if (field === "email") return "email";
  if (field === "phone") return "phone";
  if (field === "social") return "social_media";
  return null;
}

function toOwnerType(k: TargetKind): OwnerType {
  return k === "enterprise" ? "enterprise" : "person";
}

/** social 平台推断：先看 ledger.platform；再从 URL/handle 猜测 */
function inferPlatform(value: string, hint?: string): string | undefined {
  if (hint) return hint;
  const v = value.toLowerCase();
  if (v.includes("linkedin.com")) return "LinkedIn";
  if (v.includes("facebook.com") || v.includes("fb.com")) return "Facebook";
  if (v.includes("twitter.com") || v.startsWith("@")) return "Twitter";
  if (v.includes("tiktok.com")) return "TikTok";
  if (v.includes("wa.me") || /^\+?\d[\d\s-]{6,}$/.test(value)) return "WhatsApp";
  return undefined;
}

function resolveParentRef(
  targetKind: TargetKind,
  targetId: string,
  existing?: { id: string; name: string },
): { id: string; name: string } | undefined {
  if (existing) return existing;
  if (targetKind !== "contact") return undefined;
  const [entId] = targetId.split(":");
  const ent = entId ? findEnterprise(entId) : undefined;
  return ent ? { id: ent.id, name: ent.name } : undefined;
}

export function deriveUnlockedContacts(entries: LedgerEntry[]): UnlockedContact[] {
  // 时间正序遍历，保留首次解锁；用 map 去重
  const sorted = [...entries]
    .filter((e) => e.kind === "view" && e.field && e.detail)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const map = new Map<string, UnlockedContact>();
  for (const e of sorted) {
    const ct = toContactType(e.field as string);
    if (!ct) continue;
    const value = (e.detail as string).trim();
    if (!value) continue;
    const key = `${e.targetKind}:${e.targetId}:${ct}:${value}`;
    if (map.has(key)) continue;
    const platform = ct === "social_media" ? inferPlatform(value, e.platform) : undefined;
    map.set(key, {
      id: e.id,
      contact_type: ct,
      contact_value: value,
      owner_type: toOwnerType(e.targetKind),
      owner_id: e.targetId,
      owner_name: e.targetName,
      parent_ref: resolveParentRef(e.targetKind, e.targetId, e.parentRef),
      platform,
      unlock_time: new Date(e.createdAt).getTime(),
      unlock_cost: e.cost,
      is_unlocked: true,
    });
  }
  // 展示按解锁时间倒序
  return [...map.values()].sort((a, b) => b.unlock_time - a.unlock_time);
}

export function useUnlockedContacts(): UnlockedContact[] {
  const ledger = useLedger();
  return useMemo(() => deriveUnlockedContacts(ledger), [ledger]);
}

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  email: "邮箱",
  phone: "电话",
  social_media: "社媒",
};

/** 按企业分组：contact 记录挂到其 parent_ref 下，enterprise 记录自成一组的锚点 */
export interface UnlockedGroup {
  key: string;
  name: string;
  items: UnlockedContact[];
  totalCost: number;
}

export function groupByEnterprise(list: UnlockedContact[]): UnlockedGroup[] {
  const buckets = new Map<string, UnlockedGroup>();
  for (const c of list) {
    const key =
      c.owner_type === "enterprise"
        ? c.owner_id
        : c.parent_ref?.id ?? c.owner_id;
    const name =
      c.owner_type === "enterprise"
        ? c.owner_name
        : c.parent_ref?.name ?? "未归属企业";
    if (!buckets.has(key)) {
      buckets.set(key, { key, name, items: [], totalCost: 0 });
    }
    const g = buckets.get(key)!;
    g.items.push(c);
    g.totalCost += c.unlock_cost;
  }
  return [...buckets.values()].sort(
    (a, b) =>
      Math.max(...b.items.map((x) => x.unlock_time)) -
      Math.max(...a.items.map((x) => x.unlock_time)),
  );
}

/** 按天分组 */
export function groupByDay(list: UnlockedContact[]): UnlockedGroup[] {
  const buckets = new Map<string, UnlockedGroup>();
  for (const c of list) {
    const d = new Date(c.unlock_time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!buckets.has(key)) {
      buckets.set(key, { key, name: key, items: [], totalCost: 0 });
    }
    const g = buckets.get(key)!;
    g.items.push(c);
    g.totalCost += c.unlock_cost;
  }
  return [...buckets.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}