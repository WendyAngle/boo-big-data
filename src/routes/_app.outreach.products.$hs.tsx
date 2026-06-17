import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Box,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Info,
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  CheckCircle2,
  Circle,
  Anchor,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { findByHs } from "@/data/products-catalog";

export const Route = createFileRoute("/_app/outreach/products/$hs")({
  head: () => ({ meta: [{ title: "商品详情 | Boo数据平台" }] }),
  loader: ({ params }) => {
    const data = findByHs(params.hs);
    if (!data) throw notFound();
    return { data };
  },
  component: ProductDetailPage,
});

const COUNTRIES_IMPORTER = [
  { name: "STONE UNIVERSE INC", country: "united states", count: 542, matched: false },
  { name: "LIVING SPACES FURNITURE LLC", country: "united states", count: 278, matched: true },
  { name: "NATURAL STONE RESOURCES", country: "united states", count: 223, matched: true },
  { name: "FBR MARBLE INC", country: "united states", count: 106, matched: true },
  { name: "UNILOCK LTD", country: "united states", count: 94, matched: true },
  { name: "M STONE", country: "united states", count: 82, matched: true },
  { name: "FBR MARBLE INC", country: "united states", count: 81, matched: false },
];

const COUNTRIES_EXPORTER = [
  { name: "STONE SHIPPERS LIMITED", country: "india", count: 356, matched: true },
  { name: "YAMUNA SLATE INDUSTRIES PLOT", country: "india", count: 164, matched: false },
  { name: "YAMUNA SLATE INDUSTRIES PLOT", country: "india", count: 146, matched: false },
  { name: "SHRIYA MINING INDUSTRIES S", country: "india", count: 136, matched: false },
  { name: "STONE SHIPPER LIMITED", country: "united states", count: 119, matched: true },
  { name: "SOYLU TURIZM VE TIC LTD", country: "turkey", count: 104, matched: true },
  { name: "SOYLU TURIZM VE TIC LTD", country: "turkey", count: 73, matched: false },
  { name: "STONE UP MADENCILIK IC VE DIS TIC L", country: "turkey", count: 68, matched: false },
  { name: "GALAXY IMPEX", country: "india", count: 68, matched: true },
];

function ProductDetailPage() {
  const { data } = Route.useLoaderData();
  const { l1, l2, l3, l4 } = data;

  // 用 HS6 编码作 seed 生成稳定的示例数据
  const seed = useMemo(() => {
    let s = 0;
    for (const c of l4.hs) s = (s * 31 + c.charCodeAt(0)) % 100000;
    return s;
  }, [l4.hs]);

  const tradeAmount = (30 + (seed % 80)).toFixed(2); // $XX.XX 亿
  const yoy = ((((seed * 7) % 300) - 150) / 100).toFixed(2); // -1.5 ~ +1.5
  const yoyNum = Number(yoy);
  const coverCountries = 100 + (seed % 100);
  const topImporter = ["DEU", "USA", "JPN", "GBR", "FRA"][seed % 5];

  const trend = useMemo(() => {
    const arr: { m: string; v: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const month = String(((i + 11) % 12) + 1).padStart(2, "0");
      const base = 3000 + ((seed * (i + 3)) % 2500);
      arr.push({ m: month, v: base + Math.round(Math.sin(i / 1.5) * 800) });
    }
    return arr;
  }, [seed]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/outreach/products" className="hover:text-foreground">
          商品
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{l4.name}</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20">
            <Box className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{l4.name}</h1>
            <p className="text-muted-foreground mt-1">{l4.en}</p>
          </div>
        </div>
        <p className="mt-5 text-sm text-foreground/80 leading-relaxed max-w-4xl">
          已成型或加工、可直接用于道路、庭院、广场、台阶或边界安装的{l4.name}、路缘石和铺地石,不包括板岩;不包括未切割或仅初级加工的建筑石材、砂石骨料、石粉等 PC0206 原料、石材砖块及粒粉、板岩制品、混凝土铺装制品、陶瓷砖和金属建材。
        </p>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-4xl italic">
          {l4.en.charAt(0).toUpperCase() + l4.en.slice(1)} and related primary articles for direct
          installation in roads, patios, plazas, steps or edging; excludes uncut or merely
          primary-worked building stone, aggregates, and stone powder of PC0206 raw materials.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Badge className="bg-primary/10 text-primary border-0 font-mono">
            Atlas ATLAS-PC{l4.hs}01
          </Badge>
          <div className="text-muted-foreground">
            <span className="font-medium">L1</span> {l1.name}
            <span className="mx-2 text-border">›</span>
            <span className="font-medium">L2</span> {l2.name}
            <span className="mx-2 text-border">›</span>
            <span className="font-medium">L3</span> {l3.name}
            <span className="mx-2 text-border">›</span>
            <span className="font-medium">L4</span> {l4.name}
          </div>
        </div>
        <div className="mt-2">
          <Badge className="bg-primary/10 text-primary border-0 font-mono">HS6 {l4.hs}</Badge>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="全球贸易额" value={`$${tradeAmount}亿`} />
        <KPICard
          label="同比变化"
          value={
            <span
              className={`flex items-center gap-1.5 ${
                yoyNum >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {yoyNum >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {yoyNum >= 0 ? "+" : ""}
              {yoy}%
            </span>
          }
        />
        <KPICard label="覆盖国家/地区" value={coverCountries} />
        <KPICard label="最大进口市场" value={topImporter} />
      </div>

      {/* Trend chart */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-base font-semibold">贸易趋势</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          近 12 个月全球贸易额变化趋势 (来源: 贸易统计)
        </p>
        <div className="w-full overflow-x-auto">
          <AreaChart
            width={900}
            height={280}
            data={trend}
            margin={{ left: 10, right: 20, top: 10, bottom: 0 }}
          >
              <defs>
                <linearGradient id="grad-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(184 70% 42%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(184 70% 42%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="m" stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100).toFixed(0)}万+`} />
              <RTooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toLocaleString()}`, "贸易额"]}
                labelFormatter={(l) => `2026-${l}`}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="hsl(184 70% 42%)"
                strokeWidth={2}
                fill="url(#grad-trend)"
              />
          </AreaChart>
        </div>
      </Card>

      {/* Markets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarketCard
          title="重点进口市场"
          icon={<ArrowDownToLine className="h-5 w-5 text-blue-600" />}
          empty
        />
        <MarketCard
          title="重点出口市场"
          icon={<ArrowUpFromLine className="h-5 w-5 text-emerald-600" />}
          empty
        />
      </div>

      {/* Importers */}
      <TraderTable
        title="全球进口企业"
        icon={<ArrowDownToLine className="h-5 w-5 text-blue-600" />}
        subtitle={`共 ${COUNTRIES_IMPORTER.length} 家进口商`}
        rows={COUNTRIES_IMPORTER}
        hs={l4.hs}
        action="发现进口企业"
      />

      {/* Exporters */}
      <TraderTable
        title="全球出口企业"
        icon={<ArrowUpFromLine className="h-5 w-5 text-emerald-600" />}
        subtitle={`共 ${COUNTRIES_EXPORTER.length} 家出口商`}
        rows={COUNTRIES_EXPORTER}
        hs={l4.hs}
        action="发现出口企业"
      />
    </div>
  );
}

function KPICard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        {label}
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent>{label}指标说明</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}

function MarketCard({
  title,
  icon,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {empty ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          暂无{title.replace("重点", "")}数据
        </div>
      ) : null}
    </Card>
  );
}

function TraderTable({
  title,
  icon,
  subtitle,
  rows,
  hs,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  rows: { name: string; country: string; count: number; matched: boolean }[];
  hs: string;
  action: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <button className="text-primary hover:underline inline-flex items-center gap-1">
            {action} <ChevronRight className="h-4 w-4" />
          </button>
          <Link
            to="/outreach/enterprise"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            查看全部 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-8"></TableHead>
              <TableHead>企业名称</TableHead>
              <TableHead>所在国家</TableHead>
              <TableHead>关联 HS Code</TableHead>
              <TableHead className="text-right">提单数</TableHead>
              <TableHead>匹配状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.name}-${i}`} className="hover:bg-accent/30">
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <Link
                    to="/outreach/enterprise"
                    className="text-primary font-medium hover:underline inline-flex items-center gap-1.5"
                  >
                    {r.name}
                    {r.matched && (
                      <span className="text-primary/70 inline-flex items-center gap-0.5 text-xs">
                        <ExternalLink className="h-3 w-3" />
                        详情
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.country}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {hs}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {r.count}
                </TableCell>
                <TableCell>
                  {r.matched ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
                      <CheckCircle2 className="h-4 w-4" /> 已匹配
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                      <Circle className="h-4 w-4" /> 未匹配
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Anchor className="h-3.5 w-3.5" />
        来源: 全球贸易提单数据库
      </div>
    </Card>
  );
}