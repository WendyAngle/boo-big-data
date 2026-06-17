import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Footprints,
  ChevronRight,
  Calendar as CalendarIcon,
  Building2,
  Package,
  FileText,
  X,
  Clock,
  MapPin,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ENTERPRISES } from "@/data/enterprises";
import { CATALOG, findByHs } from "@/data/products-catalog";

export const Route = createFileRoute("/_app/outreach/footprints")({
  head: () => ({ meta: [{ title: "触达客户管理 · 足迹 | Boo数据平台" }] }),
  component: FootprintsPage,
});

type FootprintModule = "enterprise" | "product" | "bill";

interface FootprintItem {
  id: string;
  module: FootprintModule;
  viewedAt: string;
  enterpriseId?: string;
  enterpriseName?: string;
  enterpriseCountry?: string;
  enterpriseIndustry?: string;
  enterpriseRole?: string;
  hs?: string;
  productName?: string;
  productEn?: string;
  productCategory?: string;
  billNo?: string;
  billDate?: string;
  exporter?: string;
  importer?: string;
  fromPort?: string;
  toPort?: string;
  desc?: string;
}

function h(s: string) {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(x);
}

// Build HS pool from actual catalog so detail routes always resolve.
const HS_POOL: string[] = (() => {
  const codes: string[] = [];
  for (const l1 of CATALOG) {
    for (const l2 of l1.l2) {
      for (const l3 of l2.l3) {
        for (const l4 of l3.l4) {
          codes.push(l4.hs);
        }
      }
    }
  }
  return codes;
})();

const BILL_DESCS = [
  "POLYESTER CURTAIN FABRIC 100% POLY",
  "FROZEN BLACKBERRIES IQF 10KG BULK",
  "STAINLESS STEEL KITCHEN SINK 304",
  "LED COB DOWNLIGHT 12W WARM WHITE",
  "PORTLAND CEMENT GREY TYPE I 50KG",
  "CNC PRECISION MACHINED ALUMINUM PART",
];
const PORTS_FROM = ["SHANGHAI", "NINGBO", "YANTIAN", "QINGDAO", "GENOA", "HAMBURG"];
const PORTS_TO = [
  "LOS ANGELES, CA",
  "LONG BEACH, CA",
  "NEW YORK/NEWARK, NJ",
  "HOUSTON, TX",
  "SAVANNAH, GA",
];

function genFootprints(): FootprintItem[] {
  const items: FootprintItem[] = [];
  const today = new Date(2026, 5, 17);
  for (let d = 0; d < 14; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${day}`;
    const seed = h(dateStr);
    const count = 2 + (seed % 4);
    for (let i = 0; i < count; i++) {
      const s = h(`${dateStr}-${i}`);
      const moduleIdx = s % 3;
      const moduleKey: FootprintModule =
        moduleIdx === 0 ? "enterprise" : moduleIdx === 1 ? "product" : "bill";
      const hh = String(8 + ((s >> 3) % 12)).padStart(2, "0");
      const mm = String((s >> 5) % 60).padStart(2, "0");
      const viewedAt = `${dateStr} ${hh}:${mm}`;
      if (moduleKey === "enterprise") {
        const ent = ENTERPRISES[s % ENTERPRISES.length];
        items.push({
          id: `f-${dateStr}-${i}`,
          module: moduleKey,
          viewedAt,
          enterpriseId: ent.id,
          enterpriseName: ent.name,
          enterpriseCountry: ent.country,
          enterpriseIndustry: ent.industry,
          enterpriseRole: ent.tradeRole,
        });
      } else if (moduleKey === "product") {
        const hs = HS_POOL[s % HS_POOL.length];
        const lk = findByHs(hs);
        items.push({
          id: `f-${dateStr}-${i}`,
          module: moduleKey,
          viewedAt,
          hs,
          productName: lk?.l4.name ?? hs,
          productEn: lk?.l4.en,
          productCategory: lk ? `${lk.l1.name} / ${lk.l2.name}` : undefined,
        });
      } else {
        const exp = ENTERPRISES[s % ENTERPRISES.length];
        const imp = ENTERPRISES[(s >> 4) % ENTERPRISES.length];
        items.push({
          id: `f-${dateStr}-${i}`,
          module: moduleKey,
          viewedAt,
          billNo: `BL${(10000000 + (s % 90000000)).toString()}`,
          billDate: dateStr,
          exporter: exp.name,
          importer: imp.name,
          fromPort: PORTS_FROM[s % PORTS_FROM.length],
          toPort: PORTS_TO[(s >> 2) % PORTS_TO.length],
          desc: BILL_DESCS[s % BILL_DESCS.length],
          hs: HS_POOL[(s >> 6) % HS_POOL.length],
        });
      }
    }
  }
  return items;
}

const ALL_FOOTPRINTS = genFootprints();

type ModuleFilter = "all" | FootprintModule;

function formatDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekdayCN(dateStr: string) {
  const d = new Date(dateStr);
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
}

function FootprintsPage() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [mod, setMod] = useState<ModuleFilter>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return ALL_FOOTPRINTS.filter((it) => {
      if (mod !== "all" && it.module !== mod) return false;
      if (date) {
        const key = formatDateKey(date);
        if (!it.viewedAt.startsWith(key)) return false;
      }
      return true;
    });
  }, [date, mod]);

  const grouped = useMemo(() => {
    const map = new Map<string, FootprintItem[]>();
    for (const it of filtered) {
      const key = it.viewedAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(
        ([k, list]) =>
          [k, list.sort((a, b) => (a.viewedAt < b.viewedAt ? 1 : -1))] as const,
      );
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, enterprise: 0, product: 0, bill: 0 };
    for (const it of ALL_FOOTPRINTS) {
      if (date && !it.viewedAt.startsWith(formatDateKey(date))) continue;
      c.all++;
      c[it.module]++;
    }
    return c;
  }, [date]);

  const moduleOptions: { key: ModuleFilter; label: string; icon: typeof Building2 }[] = [
    { key: "all", label: "全部", icon: Footprints },
    { key: "enterprise", label: "企业", icon: Building2 },
    { key: "product", label: "商品", icon: Package },
    { key: "bill", label: "提单", icon: FileText },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>触达客户管理</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">足迹</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Footprints className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">足迹</h1>
            <p className="text-white/85 text-sm mt-0.5">
              记录您在企业、商品与提单页面的浏览轨迹，便于回溯与快速跟进
            </p>
          </div>
          <div className="ml-auto hidden md:flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold">{ALL_FOOTPRINTS.length}</div>
              <div className="text-white/70 text-xs">累计浏览</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-bold">
                {new Set(ALL_FOOTPRINTS.map((i) => i.viewedAt.slice(0, 10))).size}
              </div>
              <div className="text-white/70 text-xs">活跃天数</div>
            </div>
          </div>
        </div>
      </section>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">浏览时间</span>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 justify-start text-left font-normal min-w-[200px]",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {date ? formatDateKey(date) : "全部日期"}
                  {date && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDate(undefined);
                      }}
                      className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setOpen(false);
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="h-6 w-px bg-border mx-1" />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">模块</span>
            {moduleOptions.map((opt) => {
              const active = mod === opt.key;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => setMod(opt.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {opt.label}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-1 h-5 px-1.5 text-[11px]",
                      active && "bg-primary-foreground/20 text-primary-foreground",
                    )}
                  >
                    {counts[opt.key] ?? 0}
                  </Badge>
                </button>
              );
            })}
          </div>

          {(date || mod !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setDate(undefined);
                setMod("all");
              }}
            >
              <X className="h-4 w-4 mr-1" />
              清除筛选
            </Button>
          )}
        </div>
      </Card>

      {grouped.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center gap-3 border-dashed">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Footprints className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-base font-medium">暂无浏览记录</div>
          <div className="text-sm text-muted-foreground max-w-md">
            当前筛选条件下没有匹配的足迹，试试调整日期或模块筛选
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateKey, list]) => (
            <div key={dateKey} className="space-y-3">
              <div className="flex items-center gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur py-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <CalendarIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{dateKey}</div>
                    <div className="text-xs text-muted-foreground">{weekdayCN(dateKey)}</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {list.length} 条记录
                </Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.map((it) => (
                  <FootprintCard key={it.id} item={it} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FootprintCard({ item }: { item: FootprintItem }) {
  if (item.module === "enterprise") {
    return (
      <Link
        to="/outreach/enterprise/$id"
        params={{ id: item.enterpriseId! }}
        className="group block"
      >
        <Card className="p-4 h-full hover:shadow-md hover:border-primary/40 transition-all">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 text-primary border-primary/40"
                >
                  企业
                </Badge>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.viewedAt.slice(11)}
                </span>
              </div>
              <div className="font-medium text-sm truncate group-hover:text-primary">
                {item.enterpriseName}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.enterpriseCountry}
                </span>
                <span>·</span>
                <span className="truncate">{item.enterpriseIndustry}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {item.enterpriseRole}
                </Badge>
                <span className="ml-auto text-[11px] text-primary opacity-0 group-hover:opacity-100 inline-flex items-center gap-0.5">
                  查看详情 <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  if (item.module === "product") {
    return (
      <Link to="/outreach/products/$hs" params={{ hs: item.hs! }} className="group block">
        <Card className="p-4 h-full hover:shadow-md hover:border-primary/40 transition-all">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 text-amber-600 border-amber-300"
                >
                  商品
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  HS {item.hs}
                </Badge>
                <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.viewedAt.slice(11)}
                </span>
              </div>
              <div className="font-medium text-sm truncate group-hover:text-primary">
                {item.productName}
              </div>
              {item.productEn && (
                <div className="text-xs text-muted-foreground truncate italic">
                  {item.productEn}
                </div>
              )}
              {item.productCategory && (
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {item.productCategory}
                </div>
              )}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link to="/outreach/bills" className="group block">
      <Card className="p-4 h-full hover:shadow-md hover:border-primary/40 transition-all">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 text-emerald-600 border-emerald-300"
              >
                提单
              </Badge>
              <span className="text-[11px] text-muted-foreground font-mono">{item.billNo}</span>
              <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.viewedAt.slice(11)}
              </span>
            </div>
            <div className="font-medium text-sm truncate group-hover:text-primary">
              {item.desc}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              <span className="text-foreground/80">{item.exporter}</span>
              <ArrowRight className="inline h-3 w-3 mx-1" />
              <span className="text-foreground/80">{item.importer}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
              <MapPin className="h-3 w-3" />
              {item.fromPort}
              <ArrowRight className="h-3 w-3" />
              {item.toPort}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}