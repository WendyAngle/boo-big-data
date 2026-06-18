import { useSyncExternalStore } from "react";

export interface LeadProfile {
  companyName: string;
  uscc: string;
  industries: string[];
  mainProducts: string[];
  hsCodes: string[];
  scale: string;
  revenue: string;
  targetCountries: string[];
  targetIndustries: string[];
  targetScale: string;
  competitors: string[];
  advantage: string;
  website: string;
  brandStory: string;
  certifications: string[];
  exportQualifications: string[];
}

const KEY = "boo:lead:profile:v1";

export const EMPTY_PROFILE: LeadProfile = {
  companyName: "Boo 数据科技有限公司",
  uscc: "91330000MA2XXXXXX0",
  industries: ["跨境数据服务", "外贸 SaaS"],
  mainProducts: ["海关提单数据", "全球企业图谱", "AI 触达助手"],
  hsCodes: ["8471.30", "8517.62"],
  scale: "100-499 人",
  revenue: "5000 万 - 1 亿",
  targetCountries: ["美国", "德国", "越南", "墨西哥"],
  targetIndustries: ["消费电子", "家居家纺", "工业制造"],
  targetScale: "",
  competitors: ["ImportYeti", "Volza", "Panjiva"],
  advantage: "",
  website: "",
  brandStory: "",
  certifications: [],
  exportQualifications: [],
};

function readProfile(): LeadProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROFILE;
    const obj = JSON.parse(raw);
    return { ...EMPTY_PROFILE, ...obj };
  } catch {
    return EMPTY_PROFILE;
  }
}

let profile: LeadProfile = readProfile();
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export function saveProfile(next: LeadProfile) {
  profile = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }
  emit();
}

export function useLeadProfile(): LeadProfile {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => version,
  );
  return profile;
}

/** 0-100 整数完整度 */
export function profileCompleteness(p: LeadProfile): number {
  const weights: Array<[boolean, number]> = [
    [p.industries.length > 0, 12],
    [p.mainProducts.length > 0, 14],
    [p.hsCodes.length > 0, 10],
    [!!p.scale, 6],
    [!!p.revenue, 6],
    [p.targetCountries.length > 0, 14],
    [p.targetIndustries.length > 0, 10],
    [!!p.targetScale, 6],
    [p.competitors.length > 0, 10],
    [!!p.advantage, 4],
    [!!p.website, 2],
    [!!p.brandStory, 2],
    [p.certifications.length > 0, 2],
    [p.exportQualifications.length > 0, 2],
  ];
  return weights.reduce((s, [ok, w]) => s + (ok ? w : 0), 0);
}