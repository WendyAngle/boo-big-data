import { ENTERPRISES } from "@/data/enterprises";
import type { Enterprise } from "@/data/enterprises";
import type { LeadProfile } from "./lead-profile";

export type LeadSource = "ai" | "search";

export interface LeadItem {
  enterprise: Enterprise;
  source: LeadSource;
  matchScore: number; // 60-99
  matchReasons: string[];
  generatedAt: string;
}

const REASONS_AI = [
  "与主营产品高度匹配",
  "目标市场重合",
  "竞品同类客户",
  "近 90 天有同类品采购记录",
  "行业上下游高度相关",
  "员工规模匹配目标客户画像",
];

const REASONS_SEARCH_DEFAULT = [
  "贸易记录活跃",
  "联系方式完整",
  "近半年有同类品交易",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 基于画像生成 AI 推荐线索（mock，确定性 + seed 可变） */
export function generateAiLeads(
  profile: LeadProfile,
  seed: number,
  count = 9,
): LeadItem[] {
  const targetCountries = profile.targetCountries.map((c) => c.toLowerCase());
  const targetIndustries = profile.targetIndustries.map((c) => c.toLowerCase());

  const scored = ENTERPRISES.map((e) => {
    let score = 60 + (hash(e.id + seed) % 25);
    const reasons: string[] = [];
    if (targetCountries.length > 0 && targetCountries.includes(e.country)) {
      score += 10;
      reasons.push("目标市场重合");
    }
    if (
      targetIndustries.length > 0 &&
      targetIndustries.includes(e.industry)
    ) {
      score += 8;
      reasons.push("目标行业匹配");
    }
    if (
      profile.hsCodes.length > 0 &&
      e.hsCodes.some((h) => profile.hsCodes.includes(h))
    ) {
      score += 6;
      reasons.push("HS 编码匹配");
    }
    if (
      profile.mainProducts.length > 0 &&
      e.products.some((p) =>
        profile.mainProducts.some((mp) =>
          p.toLowerCase().includes(mp.toLowerCase()),
        ),
      )
    ) {
      score += 6;
      reasons.push("与主营产品高度匹配");
    }
    // 即使画像空，也补一个随机理由让用户体验完整
    if (reasons.length === 0) {
      reasons.push(REASONS_AI[hash(e.id) % REASONS_AI.length]);
    }
    if (e.tradeRole === "进口商" || e.tradeRole === "进出口商") {
      reasons.push("具备进口意向");
    }
    score = Math.min(99, score);
    return { enterprise: e, score, reasons: reasons.slice(0, 3) };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map((x) => ({
    enterprise: x.enterprise,
    source: "ai" as const,
    matchScore: x.score,
    matchReasons: x.reasons,
    generatedAt: new Date().toISOString(),
  }));
}

/** 主动搜索：根据关键词与类型在企业库中筛选并打分（mock） */
export type SearchType = "all" | "enterprise" | "product" | "hs";

export function searchLeads(
  keyword: string,
  type: SearchType,
  count = 12,
): LeadItem[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];

  const scored = ENTERPRISES.map((e) => {
    const reasons: string[] = [];
    let score = 0;
    const nameHit = e.name.toLowerCase().includes(kw);
    const industryHit = e.industry.toLowerCase().includes(kw);
    const productHit = e.products.some((p) => p.toLowerCase().includes(kw));
    const hsHit = e.hsCodes.some((h) => h.toLowerCase().includes(kw));
    const countryHit = e.country.toLowerCase().includes(kw);

    if (type === "hs") {
      if (hsHit) {
        score += 50;
        reasons.push(`命中 HS 编码 ${kw}`);
      } else return null;
    } else if (type === "product") {
      if (productHit) {
        score += 45;
        reasons.push("主营产品命中");
      } else if (industryHit) {
        score += 20;
        reasons.push("所属行业相关");
      } else return null;
    } else if (type === "enterprise") {
      if (nameHit) {
        score += 50;
        reasons.push("企业名称匹配");
      } else return null;
    } else {
      if (nameHit) {
        score += 40;
        reasons.push("企业名称匹配");
      }
      if (productHit) {
        score += 30;
        reasons.push("主营产品命中");
      }
      if (hsHit) {
        score += 25;
        reasons.push(`HS 编码命中 ${kw}`);
      }
      if (industryHit) {
        score += 15;
        reasons.push("行业相关");
      }
      if (countryHit) {
        score += 10;
        reasons.push("国家/地区匹配");
      }
      if (score === 0) return null;
    }

    if (e.tradeRole === "进口商" || e.tradeRole === "进出口商") {
      score += 4;
      reasons.push("具备进口意向");
    }
    // 用稳定 hash 给出 60-92 的基础匹配度，再叠加命中加分
    const base = 60 + (hash(e.id + kw) % 20);
    const matchScore = Math.min(99, base + Math.min(20, Math.floor(score / 3)));

    if (reasons.length === 0) {
      reasons.push(REASONS_SEARCH_DEFAULT[hash(e.id) % REASONS_SEARCH_DEFAULT.length]);
    }

    return { enterprise: e, score: matchScore, reasons: reasons.slice(0, 3) };
  }).filter(Boolean) as Array<{ enterprise: Enterprise; score: number; reasons: string[] }>;

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map((x) => ({
    enterprise: x.enterprise,
    source: "search" as const,
    matchScore: x.score,
    matchReasons: x.reasons,
    generatedAt: new Date().toISOString(),
  }));
}

/* -------- AI 免费生成次数（每日） -------- */

const QUOTA_KEY = "boo:lead:ai-quota:v1";
export const AI_DAILY_FREE = 5;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function getAiQuotaLeft(): number {
  if (typeof window === "undefined") return AI_DAILY_FREE;
  try {
    const raw = window.localStorage.getItem(QUOTA_KEY);
    if (!raw) return AI_DAILY_FREE;
    const obj = JSON.parse(raw) as { date: string; used: number };
    if (obj.date !== today()) return AI_DAILY_FREE;
    return Math.max(0, AI_DAILY_FREE - obj.used);
  } catch {
    return AI_DAILY_FREE;
  }
}

export function consumeAiQuota(): number {
  if (typeof window === "undefined") return AI_DAILY_FREE;
  let used = 0;
  try {
    const raw = window.localStorage.getItem(QUOTA_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as { date: string; used: number };
      if (obj.date === today()) used = obj.used;
    }
  } catch {}
  used += 1;
  window.localStorage.setItem(
    QUOTA_KEY,
    JSON.stringify({ date: today(), used }),
  );
  return Math.max(0, AI_DAILY_FREE - used);
}

/* -------- 搜索历史 -------- */

const HISTORY_KEY = "boo:lead:search-history:v1";

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

export function pushSearchHistory(kw: string) {
  const k = kw.trim();
  if (!k || typeof window === "undefined") return;
  const cur = getSearchHistory().filter((x) => x !== k);
  cur.unshift(k);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(cur.slice(0, 8)));
}