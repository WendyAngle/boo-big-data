import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Wallet,
  Gift,
  Flame,
  Users,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export const Route = createFileRoute("/_app/points/")({
  head: () => ({ meta: [{ title: "首页 · 积分管理系统 | Boo数据平台" }] }),
  component: PointsHome,
});

// ---------- Mock data (deterministic) ----------
const STATS = {
  todayIssued: 128_650,
  todayIssuedDelta: 8.4,
  todayConsumed: 96_420,
  todayConsumedDelta: -3.2,
  totalIssued: 28_456_700,
  totalConsumed: 19_872_340,
};
const totalRemaining = STATS.totalIssued - STATS.totalConsumed;

const TREND_7D = [
  { d: "06-24", issued: 110200, consumed: 84300 },
  { d: "06-25", issued: 118500, consumed: 91200 },
  { d: "06-26", issued: 102400, consumed: 88700 },
  { d: "06-27", issued: 134800, consumed: 99500 },
  { d: "06-28", issued: 121300, consumed: 95100 },
  { d: "06-29", issued: 127900, consumed: 101200 },
  { d: "06-30", issued: 128650, consumed: 96420 },
];

const PARTNERS = {
  total: 386,
  active30d: 248,
  newThisMonth: 21,
  top: [
    { name: "深圳启航科技有限公司", consumed: 1_284_500, app: "AI视频制作" },
    { name: "广州优品贸易股份有限公司", consumed: 982_300, app: "AI智能获客" },
    { name: "上海智云数字科技", consumed: 864_120, app: "AI客服助手" },
    { name: "宁波鼎力进出口", consumed: 712_800, app: "AI智能获客" },
    { name: "义乌环球商贸", consumed: 598_450, app: "AI文案助手" },
  ],
};

const PRODUCT_RANKING = [
  { name: "AI图生视频", category: "AI视频制作", consumed: 4_286_500, orders: 18420 },
  { name: "Tiktok获客", category: "AI智能获客", consumed: 3_124_300, orders: 9870 },
  { name: "AI文生图", category: "AI视频制作", consumed: 2_815_200, orders: 24310 },
  { name: "AI视频消除", category: "AI视频制作", consumed: 2_098_700, orders: 7640 },
  { name: "智能客服会话", category: "AI客服助手", consumed: 1_752_400, orders: 33120 },
  { name: "AI翻译", category: "AI文案助手", consumed: 1_289_300, orders: 41280 },
  { name: "邮件群发", category: "AI智能获客", consumed: 986_120, orders: 5230 },
  { name: "AI数字人形象", category: "AI视频制作", consumed: 742_580, orders: 1820 },
];

const fmt = (n: number) => n.toLocaleString("zh-CN");

function PointsHome() {
  const maxConsumed = useMemo(
    () => Math.max(...PRODUCT_RANKING.map((p) => p.consumed)),
    [],
  );

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">首页</span>
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-8 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Coins className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">积分运营总览</h1>
            <p className="text-white/85 mt-1">
              实时监测积分发放、消耗与客户运营情况
            </p>
          </div>
          <div className="hidden md:flex items-end gap-8 pr-2">
            <div>
              <div className="text-xs text-white/70">总剩余积分</div>
              <div className="text-3xl font-bold mt-1">{fmt(totalRemaining)}</div>
            </div>
            <div>
              <div className="text-xs text-white/70">合作客户</div>
              <div className="text-3xl font-bold mt-1">{fmt(PARTNERS.total)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Today + totals KPI grid */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="今日发放积分"
          value={STATS.todayIssued}
          delta={STATS.todayIssuedDelta}
          icon={Gift}
          tone="emerald"
        />
        <KpiCard
          label="今日消耗积分"
          value={STATS.todayConsumed}
          delta={STATS.todayConsumedDelta}
          icon={Flame}
          tone="amber"
        />
        <KpiCard
          label="总发放积分"
          value={STATS.totalIssued}
          icon={TrendingUp}
          tone="sky"
        />
        <KpiCard
          label="总消耗积分"
          value={STATS.totalConsumed}
          icon={TrendingDown}
          tone="rose"
        />
        <KpiCard
          label="总剩余积分"
          value={totalRemaining}
          icon={Wallet}
          tone="violet"
          highlight
        />
      </section>

      {/* Trend + Partners */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">近 7 日积分趋势</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                发放 vs 消耗（单位：积分）
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <LegendDot className="bg-primary" /> 发放
              <LegendDot className="bg-orange-500" /> 消耗
            </div>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TREND_7D}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Line type="monotone" dataKey="issued" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--primary)" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="consumed" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: "#f97316" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">合作客户数据</h2>
              <p className="text-xs text-muted-foreground mt-0.5">客户规模与活跃</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <MiniStat label="合作客户" value={PARTNERS.total} />
            <MiniStat label="近30日活跃" value={PARTNERS.active30d} />
            <MiniStat label="本月新增" value={PARTNERS.newThisMonth} accent />
          </div>
          <div className="mt-5">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              消耗 TOP5 客户
            </div>
            <ul className="space-y-2.5">
              {PARTNERS.top.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span
                    className={`h-5 w-5 shrink-0 rounded-md text-[11px] font-bold flex items-center justify-center ${
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                          ? "bg-slate-200 text-slate-700"
                          : i === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate text-foreground">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.app}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground tabular-nums">
                    {fmt(p.consumed)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* Basic products ranking */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">基础产品累计消耗积分排序</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              按累计消耗积分由高到低排序
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            共 {PRODUCT_RANKING.length} 个产品
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mt-5">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PRODUCT_RANKING} layout="vertical" margin={{ left: 12, right: 16 }}>
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                  tickFormatter={(v) => `${(v / 10000).toFixed(0)}w`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={92}
                  tick={{ fontSize: 12, fill: "var(--foreground)" }}
                  stroke="var(--border)"
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Bar dataKey="consumed" fill="url(#barFill)" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium w-10">#</th>
                  <th className="px-3 py-2 text-left font-medium">产品</th>
                  <th className="px-3 py-2 text-right font-medium">消耗积分</th>
                  <th className="px-3 py-2 text-right font-medium">订单</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCT_RANKING.map((p, i) => (
                  <tr key={p.name} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">{p.category}</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-full"
                          style={{ width: `${(p.consumed / maxConsumed) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {fmt(p.consumed)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                      {fmt(p.orders)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------- helpers ----------
const TONE: Record<string, { bg: string; fg: string; ring: string }> = {
  emerald: { bg: "bg-emerald-50", fg: "text-emerald-600", ring: "ring-emerald-100" },
  amber: { bg: "bg-amber-50", fg: "text-amber-600", ring: "ring-amber-100" },
  sky: { bg: "bg-sky-50", fg: "text-sky-600", ring: "ring-sky-100" },
  rose: { bg: "bg-rose-50", fg: "text-rose-600", ring: "ring-rose-100" },
  violet: { bg: "bg-violet-50", fg: "text-violet-600", ring: "ring-violet-100" },
};

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  delta?: number;
  icon: typeof Coins;
  tone: keyof typeof TONE;
  highlight?: boolean;
}) {
  const t = TONE[tone];
  const up = (delta ?? 0) >= 0;
  return (
    <Card
      className={`p-5 relative overflow-hidden ${highlight ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`h-9 w-9 rounded-lg ${t.bg} ${t.fg} flex items-center justify-center ring-1 ${t.ring}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-foreground tabular-nums">
        {fmt(value)}
      </div>
      {typeof delta === "number" ? (
        <div
          className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
            up ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {up ? "+" : ""}
          {delta.toFixed(1)}% <span className="text-muted-foreground font-normal">vs 昨日</span>
        </div>
      ) : (
        <div className="mt-1.5 text-xs text-muted-foreground">截至今日累计</div>
      )}
    </Card>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>
        {fmt(value)}
      </div>
    </div>
  );
}

function LegendDot({ className }: { className: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${className}`} />;
}