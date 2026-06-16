import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ChevronRight,
  Search,
  RotateCcw,
  Download,
  ShoppingBag,
  Gift,
  Wallet,
  TimerReset,
  HelpCircle,
  Calendar,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ListPagination } from "@/components/ListPagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/points/transactions/points-ledger")({
  head: () => ({ meta: [{ title: "业务交易 · 积分流水 | Boo数据平台" }] }),
  component: PointsLedgerPage,
});

type Action = "购买" | "赠送" | "支出" | "失效";
type PointType = "通用积分" | "专业积分";

interface LedgerRow {
  id: string; // 流水编号 LG...
  orderNo: string; // 订单编号 ORD...
  time: string;
  tenant: string;
  app: string;
  category: string;
  product: string;
  action: Action;
  pointType: PointType;
  amount: number; // 充值金额(元) 仅 购买/赠送 有意义
  before: number;
  delta: number; // 正负
  after: number;
}

const TENANTS = [
  "字节跳动",
  "蚂蚁集团",
  "美团点评",
  "京东物流",
  "宁德时代",
  "比亚迪汽车",
  "顺丰科技",
  "腾讯云",
  "阿里云",
  "网易严选",
];

const APPS = ["AI视频生成", "SIS", "AIMedia", "Hub"];

const CATALOG: Array<{ category: string; product: string; app: string }> = [
  { category: "AI视频制作", product: "AI文生图", app: "SIS" },
  { category: "AI视频制作", product: "AI图生视频", app: "AI视频生成" },
  { category: "AI视频制作", product: "AI视频消除", app: "AI视频生成" },
  { category: "AI智能获客", product: "Tiktok获客", app: "AIMedia" },
  { category: "AI内容创作", product: "AI写作助手", app: "Hub" },
  { category: "AI客服助手", product: "智能问答机器人", app: "Hub" },
  { category: "数据洞察", product: "经营看板", app: "Hub" },
  { category: "AI贸易数据", product: "海关数据查询", app: "Hub" },
];

const ACTION_META: Record<Action, { color: string; bg: string; border: string }> = {
  购买: { color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" },
  赠送: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  支出: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  失效: { color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
};

const POINT_TYPE_META: Record<PointType, { color: string; bg: string; border: string }> = {
  通用积分: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  专业积分: { color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
};

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}
function fmtTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 生成可复现的 mock 数据(种子化伪随机)
function buildMock(): LedgerRow[] {
  const rows: LedgerRow[] = [];
  let seed = 20260616;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // 每个企业维护两类积分余额,保证 before/after 自洽
  const balances: Record<string, Record<PointType, number>> = {};
  TENANTS.forEach((t) => (balances[t] = { 通用积分: 0, 专业积分: 0 }));

  const base = new Date("2026-06-09T08:30:00");
  const total = 64;
  for (let i = 0; i < total; i++) {
    const tenant = TENANTS[Math.floor(rnd() * TENANTS.length)];
    const item = CATALOG[Math.floor(rnd() * CATALOG.length)];
    const r = rnd();
    const action: Action = r < 0.45 ? "购买" : r < 0.62 ? "赠送" : r < 0.92 ? "支出" : "失效";
    const pointType: PointType = rnd() < 0.55 ? "通用积分" : "专业积分";

    let amount = 0;
    let delta = 0;
    if (action === "购买") {
      const cash = [100, 200, 500, 1000, 2000, 5000][Math.floor(rnd() * 6)];
      const rate = pointType === "通用积分" ? 5 : 10;
      amount = cash;
      delta = cash * rate;
    } else if (action === "赠送") {
      delta = [50, 100, 200, 500, 1000][Math.floor(rnd() * 5)];
      amount = 0;
    } else if (action === "支出") {
      delta = -([10, 20, 30, 50, 80, 120][Math.floor(rnd() * 6)]);
    } else {
      delta = -([100, 200, 500][Math.floor(rnd() * 3)]);
    }
    const before = balances[tenant][pointType];
    // 支出/失效在余额不足时强制改为购买,避免负值
    let finalAction = action;
    let finalDelta = delta;
    if (delta < 0 && before + delta < 0) {
      finalAction = "购买";
      const cash = 500;
      const rate = pointType === "通用积分" ? 5 : 10;
      amount = cash;
      finalDelta = cash * rate;
    }
    const after = before + finalDelta;
    balances[tenant][pointType] = after;

    const t = new Date(base.getTime() + i * 1000 * 60 * 73 + Math.floor(rnd() * 60000));
    rows.push({
      id: `LG${fmtDate(t).replace(/-/g, "")}${pad(i + 1, 4)}`,
      orderNo: finalAction === "购买" || finalAction === "赠送" ? `ORD${fmtDate(t).replace(/-/g, "")}${pad(i + 1, 4)}` : "-",
      time: fmtTime(t),
      tenant,
      app: item.app,
      category: item.category,
      product: item.product,
      action: finalAction,
      pointType,
      amount,
      before,
      delta: finalDelta,
      after,
    });
  }
  return rows.reverse(); // 最新在前
}

const MOCK: LedgerRow[] = buildMock();

const PRODUCT_OPTIONS = Array.from(new Set(CATALOG.map((c) => c.product)));

function PointsLedgerPage() {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  const [startDate, setStartDate] = useState(fmtDate(weekAgo) + " 00:00:00");
  const [endDate, setEndDate] = useState(fmtDate(today) + " 23:59:59");
  const [kw, setKw] = useState("");
  const [tenantF, setTenantF] = useState("all");
  const [productF, setProductF] = useState("all");
  const [actionF, setActionF] = useState("all");

  const [applied, setApplied] = useState({
    kw: "",
    tenant: "all",
    product: "all",
    action: "all",
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return MOCK.filter((r) => {
      if (applied.kw) {
        const k = applied.kw.toLowerCase();
        if (
          !r.id.toLowerCase().includes(k) &&
          !r.orderNo.toLowerCase().includes(k) &&
          !String(r.amount).includes(k)
        )
          return false;
      }
      if (applied.tenant !== "all" && r.tenant !== applied.tenant) return false;
      if (applied.product !== "all" && r.product !== applied.product) return false;
      if (applied.action !== "all" && r.action !== applied.action) return false;
      return true;
    });
  }, [applied]);

  const stats = useMemo(() => {
    let buy = 0,
      gift = 0,
      spend = 0,
      expire = 0;
    filtered.forEach((r) => {
      if (r.action === "购买") buy += r.delta;
      else if (r.action === "赠送") gift += r.delta;
      else if (r.action === "支出") spend += -r.delta;
      else if (r.action === "失效") expire += -r.delta;
    });
    return { buy, gift, spend, expire };
  }, [filtered]);

  const total = filtered.length;
  const pageData = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  const apply = () => {
    setApplied({ kw: kw.trim(), tenant: tenantF, product: productF, action: actionF });
    setPage(1);
  };
  const reset = () => {
    setStartDate(fmtDate(weekAgo) + " 00:00:00");
    setEndDate(fmtDate(today) + " 23:59:59");
    setKw("");
    setTenantF("all");
    setProductF("all");
    setActionF("all");
    setApplied({ kw: "", tenant: "all", product: "all", action: "all" });
    setPage(1);
  };
  const exportCsv = () => {
    toast.success(`已导出当前筛选下 ${total} 条明细`);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>业务交易</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">积分流水</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">积分流水</h1>
            <p className="text-white/85 text-sm mt-0.5">
              查询企业在各产品上的积分变动明细,支持按业务动作、积分类型与时间区间多维筛选
            </p>
          </div>
        </div>
      </section>

      {/* 筛选区 */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9 font-mono text-xs"
              />
            </div>
            <span className="text-sm text-muted-foreground shrink-0">至</span>
            <Input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 font-mono text-xs"
            />
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="shrink-0 gap-1 border-muted bg-muted/40 text-muted-foreground"
                  >
                    <Info className="h-3 w-3" /> 默认最近一周
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>未选择时间时,默认查询最近 7 天数据</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="请输入流水编号/订单编号/充值金额"
              className="pl-9"
            />
          </div>

          <Select value={tenantF} onValueChange={setTenantF}>
            <SelectTrigger>
              <SelectValue placeholder="全部企业" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部企业</SelectItem>
              {TENANTS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={productF} onValueChange={setProductF}>
            <SelectTrigger>
              <SelectValue placeholder="全部产品" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部产品</SelectItem>
              {PRODUCT_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionF} onValueChange={setActionF}>
            <SelectTrigger>
              <SelectValue placeholder="全部业务动作" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部业务动作</SelectItem>
              {(["购买", "赠送", "支出", "失效"] as Action[]).map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> 重置
          </Button>
          <Button onClick={apply}>
            <Search className="h-4 w-4" /> 查询
          </Button>
          <Button
            onClick={exportCsv}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="h-4 w-4" /> 导出明细
          </Button>
        </div>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="总购买"
          value={stats.buy}
          icon={ShoppingBag}
          gradient="from-sky-500 to-blue-600"
        />
        <StatCard
          label="总赠送"
          value={stats.gift}
          icon={Gift}
          gradient="from-emerald-500 to-green-600"
        />
        <StatCard
          label="总支出"
          value={stats.spend}
          icon={Wallet}
          gradient="from-amber-500 to-orange-500"
        />
        <StatCard
          label="总失效"
          value={stats.expire}
          icon={TimerReset}
          gradient="from-rose-500 to-red-600"
        />
      </div>

      {/* 列表 */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{total}</span> 条积分流水
          </div>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="whitespace-nowrap">操作时间</TableHead>
                <TableHead className="whitespace-nowrap">流水编号</TableHead>
                <TableHead className="whitespace-nowrap">订单编号</TableHead>
                <TableHead className="whitespace-nowrap">企业名称</TableHead>
                <TableHead className="whitespace-nowrap">关联应用</TableHead>
                <TableHead className="whitespace-nowrap">产品分类</TableHead>
                <TableHead className="whitespace-nowrap">产品名称</TableHead>
                <TableHead className="whitespace-nowrap">业务动作</TableHead>
                <TableHead className="whitespace-nowrap">积分类型</TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  <HeaderWithHelp text="变动前余额" tip="本次操作发生前该企业在该积分类型下的可用余额" />
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  <HeaderWithHelp text="变动后余额" tip="本次操作完成后该企业在该积分类型下的可用余额" />
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">积分动态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((r) => {
                  const am = ACTION_META[r.action];
                  const pm = POINT_TYPE_META[r.pointType];
                  const positive = r.delta > 0;
                  return (
                    <TableRow key={r.id} className="hover:bg-accent/30">
                      <TableCell className="font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {r.time}
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{r.id}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {r.orderNo}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{r.tenant}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="bg-accent/40 text-primary border-primary/20">
                          {r.app}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r.category}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.product}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className={`${am.bg} ${am.color} ${am.border}`}>
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className={`${pm.bg} ${pm.color} ${pm.border}`}>
                          {r.pointType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">
                        {r.before.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap font-medium">
                        {r.after.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums whitespace-nowrap font-semibold ${
                          positive ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {r.delta.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <ListPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: number;
  icon: typeof ShoppingBag;
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 text-white bg-gradient-to-br ${gradient} shadow-sm`}
    >
      <div className="relative z-10">
        <div className="text-3xl font-bold tabular-nums tracking-tight">
          {value.toLocaleString()}
        </div>
        <div className="text-sm text-white/85 mt-1">{label}</div>
      </div>
      <Icon className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 text-white/20" />
    </div>
  );
}

function HeaderWithHelp({ text, tip }: { text: string; tip: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {text}
            <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}