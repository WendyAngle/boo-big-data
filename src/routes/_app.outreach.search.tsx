import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Search,
  Lightbulb,
  Package,
  Building2,
  ArrowRight,
  Globe2,
  Users2,
  X as XIcon,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/outreach/search")({
  head: () => ({ meta: [{ title: "出海大数据平台 · 搜索 | Boo数据平台" }] }),
  component: SearchPage,
});

/* ------------------------------- 本地最近搜索 ------------------------------- */
const RECENT_KEY = "boo:global-search:recent";
const RECENT_MAX = 8;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return ["铝材", "钢材", "铝合金门窗", "apple", "疏浚船、灯船、消防船及起重船等特种工程船舶"];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function pushRecent(kw: string) {
  if (typeof window === "undefined") return;
  const k = kw.trim();
  if (!k) return;
  const cur = loadRecent().filter((x) => x !== k);
  cur.unshift(k);
  localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, RECENT_MAX)));
}
function removeRecent(kw: string) {
  if (typeof window === "undefined") return;
  const cur = loadRecent().filter((x) => x !== kw);
  localStorage.setItem(RECENT_KEY, JSON.stringify(cur));
}
function clearRecent() {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECENT_KEY, JSON.stringify([]));
}

/* ------------------------------- 热门搜索（mock） ------------------------------- */
const HOT_SEARCHES = ["花岗岩", "光伏组件", "新能源汽车", "锂电池", "680100", "germany"];

/* ------------------------------- 搜索类型 ------------------------------- */
type SearchScope = "leads" | "products" | "enterprise";

type ScopeDef = {
  key: SearchScope;
  label: string;
  desc: string;
  icon: typeof Lightbulb;
  iconBg: string;
  iconColor: string;
};

const SCOPES: ScopeDef[] = [
  {
    key: "leads",
    label: "搜索线索",
    desc: "查找企业与关键联系人线索",
    icon: Lightbulb,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  {
    key: "products",
    label: "搜索商品",
    desc: "跳转商品目录并按关键词或 HS 编码过滤",
    icon: Package,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
  },
  {
    key: "enterprise",
    label: "搜索企业",
    desc: "在企业发现页按企业名搜索",
    icon: Building2,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-500",
  },
];

/* ============================== 页面 ============================== */
function SearchPage() {
  const navigate = useNavigate();
  const [kw, setKw] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(1); // 默认高亮"搜索商品"，与附图一致
  const [recentTick, setRecentTick] = useState(0);
  const recent = useMemo(() => loadRecent(), [recentTick]);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 点击页面其它区域收起下拉
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const trimmed = kw.trim();
  const hasKw = trimmed.length > 0;
  const showDropdown = focused && hasKw;

  const go = (scope: SearchScope, keyword: string) => {
    const k = keyword.trim();
    if (!k) {
      toast.error("请输入搜索关键词");
      return;
    }
    pushRecent(k);
    setRecentTick((n) => n + 1);
    setFocused(false);
    if (scope === "leads") {
      navigate({ to: "/outreach/leads" });
    } else if (scope === "enterprise") {
      navigate({ to: "/outreach/enterprise", search: { q: k } as never });
    } else {
      // 商品：纯数字（>=4位）按 HS 编码直达
      if (/^\d{4,}$/.test(k)) {
        navigate({ to: "/outreach/products/$hs", params: { hs: k } });
      } else {
        navigate({ to: "/outreach/products" });
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === "Enter") go(SCOPES[activeIdx].key, kw);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % SCOPES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + SCOPES.length) % SCOPES.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(SCOPES[activeIdx].key, kw);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-0px)] overflow-hidden bg-gradient-to-b from-cyan-50 via-sky-50/60 to-white">
      {/* 顶部光带装饰 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(56,189,248,0.18),transparent_70%)]" />
      <div className="pointer-events-none absolute -left-1/4 top-1/3 h-[480px] w-[120%] rotate-[-6deg] bg-[linear-gradient(90deg,transparent,rgba(186,230,253,0.55),transparent)] blur-2xl" />

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-24">
        {/* 面包屑 */}
        <div className="text-xs text-muted-foreground/80 mb-10">
          出海大数据平台 / <span className="text-foreground/80">搜索</span>
        </div>

        {/* 标题 */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            悦意出海大数据平台
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-500">
            从商品、市场到企业，发现全球贸易机会
          </p>
        </div>

        {/* 搜索框 */}
        <div ref={wrapRef} className="relative mx-auto mt-10 max-w-3xl">
          <div
            className={`flex items-center gap-3 rounded-2xl bg-white px-5 h-16 shadow-[0_18px_60px_-20px_rgba(56,189,248,0.45)] ring-1 transition-all ${
              focused ? "ring-primary/60" : "ring-white/80"
            }`}
          >
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              value={kw}
              onChange={(e) => {
                setKw(e.target.value);
                setActiveIdx(1);
              }}
              onFocus={() => setFocused(true)}
              onKeyDown={onKeyDown}
              placeholder="搜索线索、商品或企业关键词，支持 HS 编码"
              className="border-0 shadow-none focus-visible:ring-0 text-base h-12 px-0 placeholder:text-muted-foreground/70"
            />
            {hasKw && (
              <button
                onClick={() => {
                  setKw("");
                  setActiveIdx(1);
                }}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/60"
                aria-label="清空"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 类型联想下拉 */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-20 rounded-2xl bg-white p-2 shadow-[0_24px_70px_-20px_rgba(15,23,42,0.18)] ring-1 ring-slate-100">
              {SCOPES.map((s, i) => {
                const Icon = s.icon;
                const active = i === activeIdx;
                return (
                  <button
                    key={s.key}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => go(s.key, kw)}
                    className={`group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors ${
                      active ? "bg-slate-50" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.iconBg}`}
                    >
                      <Icon className={`h-5 w-5 ${s.iconColor}`} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800">
                        <span>{s.label} </span>
                        <span className="font-semibold text-slate-900">{trimmed}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                        {s.desc}
                      </div>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground" />
                  </button>
                );
              })}
            </div>
          )}

          {/* 最近搜索 / 热门 */}
          {!showDropdown && (
            <div className="mt-6 space-y-3">
              {recent.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">最近搜索：</span>
                  {recent.slice(0, 6).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setKw(r);
                        setFocused(true);
                      }}
                      className="group inline-flex max-w-[280px] items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm text-slate-700 ring-1 ring-slate-200 hover:ring-primary/50 hover:text-primary transition-colors"
                    >
                      <span className="truncate">{r}</span>
                      <XIcon
                        className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecent(r);
                          setRecentTick((n) => n + 1);
                        }}
                      />
                    </button>
                  ))}
                  {recent.length > 0 && (
                    <button
                      onClick={() => {
                        clearRecent();
                        setRecentTick((n) => n + 1);
                      }}
                      className="text-xs text-muted-foreground/70 hover:text-foreground ml-1"
                    >
                      清空
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  热门搜索：
                </span>
                {HOT_SEARCHES.map((h) => (
                  <button
                    key={h}
                    onClick={() => {
                      setKw(h);
                      setFocused(true);
                    }}
                    className="rounded-full bg-primary/8 px-3 py-1 text-sm text-primary/90 hover:bg-primary/12 transition-colors"
                    style={{ backgroundColor: "rgba(20,184,166,0.08)" }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 数据指标卡片 */}
        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          <StatCard
            icon={Globe2}
            tone="from-cyan-400 to-sky-500"
            kpi="239+"
            title="覆盖国家/地区"
            sub="全球主要贸易体"
          />
          <StatCard
            icon={Building2}
            tone="from-emerald-400 to-teal-500"
            kpi="2亿+"
            title="全球企业"
            sub="全球进出口企业"
          />
          <StatCard
            icon={Users2}
            tone="from-sky-400 to-indigo-500"
            kpi="10亿+"
            title="全球联系人"
            sub="全球联系人统计"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- 指标卡片 ------------------------------- */
function StatCard({
  icon: Icon,
  tone,
  kpi,
  title,
  sub,
}: {
  icon: typeof Globe2;
  tone: string;
  kpi: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-sm p-6 ring-1 ring-white/80 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)] transition-transform hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md shadow-sky-200/60`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-base font-medium text-slate-700">{title}</div>
      </div>
      <div className="mt-5 text-4xl font-bold tracking-tight text-slate-900">
        {kpi}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        {sub}
      </div>
      <div className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-br from-white/40 to-sky-200/30 blur-2xl opacity-70" />
    </div>
  );
}