import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  ChevronRight,
  Search,
  RotateCcw,
  Download,
  Plus,
  Calendar,
  Info,
  ShoppingBag,
  Gift,
  Coins,
  Receipt,
  Eye,
  X,
  ArrowLeftRight,
  User,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListPagination } from "@/components/ListPagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/points/transactions/recharge")({
  head: () => ({ meta: [{ title: "业务交易 · 充值管理 | Boo数据平台" }] }),
  component: RechargePage,
});

type RechargeType = "积分充值" | "套餐购买";

export interface AppRef {
  name: string;
  appId: string;
}

interface RechargeRow {
  id: string; // 订单编号 ORD...
  tenant: string;
  apps: AppRef[];
  product: string; // 产品名称
  type: RechargeType;
  amount: number; // 充值金额(元)
  basicPoints: number;
  giftPoints: number;
  expireAt: string; // YYYY-MM-DD
  createdAt: string; // YYYY-MM-DD HH:mm:ss
  operator: string;
}

// 与「积分管理系统 · 租户管理」保持一致的租户名称
export const TENANT_NAMES = [
  "星火短剧工作室F",
  "星火短剧工作室E",
  "星火短剧工作室D",
  "星火短剧工作室C",
  "星火短剧工作室B",
  "蚂蚁集团",
  "字节跳动",
  "美团点评",
  "京东物流",
  "顺丰科技",
  "腾讯云",
  "阿里云",
  "网易严选",
];

export const APPS: AppRef[] = [
  { name: "AI视频生成", appId: "ai_0004" },
  { name: "SIS", appId: "sea_0004" },
  { name: "AIMedia", appId: "aim_0007" },
  { name: "Hub", appId: "hub_0012" },
];

const PRODUCTS_RECHARGE = ["10 元充值包", "100 元充值包", "500 元充值包", "1000 元充值包"];
const PRODUCTS_BUNDLE = ["入门版", "标准版", "拓界版", "旗舰版", "test"];

// === 套餐产品库(数据对齐「套餐产品管理 · 启用中」)===
export interface BundleProduct {
  id: string;
  name: string;
  description: string;
  amount: number; // 套餐现金价(元)
  basicPoints: number; // 基础积分(通用+专业)
  giftPoints: number; // 赠送积分(通用+专业)
}
export const BUNDLE_PRODUCTS: BundleProduct[] = [
  { id: "PP00000008", name: "全域旗舰版", description: "覆盖内容创作、获客、视频与数据洞察的全域旗舰套餐,通用+专业积分混合发放。", amount: 29800, basicPoints: 130000, giftPoints: 26000 },
  { id: "PP00000007", name: "拓界版", description: "SIS升级包+AI视频制作(30000) 等多模块组合,适合中大型团队。", amount: 109800, basicPoints: 110000, giftPoints: 16100 },
  { id: "PP00000006", name: "视频专业版", description: "仅 AI 视频制作分类内可用的专业积分套餐。", amount: 9800, basicPoints: 20000, giftPoints: 4000 },
  { id: "PP00000005", name: "基石版", description: "SIS基础包+AI视频制作(10000) 入门组合,覆盖核心场景。", amount: 69800, basicPoints: 20000, giftPoints: 4000 },
  { id: "PP00000003", name: "通用积分包·标准版", description: "面向全平台的通用积分,锁定 AI 图生视频销售入口。", amount: 1999, basicPoints: 10000, giftPoints: 1500 },
  { id: "PP00000002", name: "数据洞察季度通用包", description: "面向数据团队的通用积分季度包,可在全平台已启用产品消费。", amount: 5999, basicPoints: 30000, giftPoints: 6000 },
];

// === 充值产品库(数据对齐「充值产品管理 · 启用中」)===
export type RechargeTargetType = "category" | "basic";
export type RechargePointsMode = "general" | "professional" | "mixed";
export interface RechargeTier {
  min: number;
  max: number;
  generalRate: number; // 1元=N通用积分
  generalBonus: number; // 通用赠送%
  proRate: number; // 1元=N专业积分
  proBonus: number; // 专业赠送%
}
export interface RechargeProductDef {
  id: string;
  name: string;
  targetType: RechargeTargetType;
  targetKey: string;
  pointsMode: RechargePointsMode;
  remark: string;
  tiers: RechargeTier[];
}
export const RECHARGE_PRODUCTS: RechargeProductDef[] = [
  { id: "RP000008", name: "数据洞察季度通用充值", targetType: "category", targetKey: "数据洞察", pointsMode: "general", remark: "面向数据分析团队的通用积分充值,平台内任意产品可用。", tiers: [
    { min: 200, max: 1000, generalRate: 8, generalBonus: 5, proRate: 0, proBonus: 0 },
    { min: 1000, max: 5000, generalRate: 8, generalBonus: 10, proRate: 0, proBonus: 0 },
    { min: 5000, max: 20000, generalRate: 8, generalBonus: 18, proRate: 0, proBonus: 0 },
  ]},
  { id: "RP000007", name: "AI内容创作专享充值", targetType: "category", targetKey: "AI内容创作", pointsMode: "professional", remark: "仅限 AI 内容创作分类内产品消费的专业积分。", tiers: [
    { min: 100, max: 500, generalRate: 0, generalBonus: 0, proRate: 12, proBonus: 5 },
    { min: 500, max: 3000, generalRate: 0, generalBonus: 0, proRate: 12, proBonus: 12 },
    { min: 3000, max: 10000, generalRate: 0, generalBonus: 0, proRate: 12, proBonus: 20 },
  ]},
  { id: "RP000005", name: "Tiktok获客单品通用充值", targetType: "basic", targetKey: "BP000032", pointsMode: "general", remark: "锁定 Tiktok 获客销售入口,发放可全平台使用的通用积分。", tiers: [
    { min: 80, max: 400, generalRate: 6, generalBonus: 3, proRate: 0, proBonus: 0 },
    { min: 400, max: 2000, generalRate: 6, generalBonus: 8, proRate: 0, proBonus: 0 },
  ]},
  { id: "RP000004", name: "AI图生视频混合充值", targetType: "basic", targetKey: "BP000030", pointsMode: "mixed", remark: "单品促销:同时发放通用积分与定向专业积分。", tiers: [
    { min: 100, max: 500, generalRate: 3, generalBonus: 5, proRate: 10, proBonus: 10 },
    { min: 500, max: 3000, generalRate: 3, generalBonus: 10, proRate: 10, proBonus: 20 },
    { min: 3000, max: 12000, generalRate: 3, generalBonus: 15, proRate: 10, proBonus: 30 },
  ]},
  { id: "RP000002", name: "AI视频制作充值套餐", targetType: "category", targetKey: "AI视频制作", pointsMode: "mixed", remark: "面向视频团队的阶梯充值方案,金额越大赠送越多。", tiers: [
    { min: 100, max: 500, generalRate: 5, generalBonus: 5, proRate: 10, proBonus: 10 },
    { min: 500, max: 2000, generalRate: 5, generalBonus: 8, proRate: 10, proBonus: 15 },
    { min: 2000, max: 10000, generalRate: 5, generalBonus: 12, proRate: 10, proBonus: 25 },
  ]},
  { id: "RP000001", name: "AI文生图体验充值", targetType: "basic", targetKey: "BP000043", pointsMode: "professional", remark: "针对单一基础产品的体验充值。", tiers: [
    { min: 50, max: 200, generalRate: 0, generalBonus: 0, proRate: 20, proBonus: 0 },
    { min: 200, max: 1000, generalRate: 0, generalBonus: 0, proRate: 20, proBonus: 8 },
  ]},
];
export const POINTS_MODE_LABEL: Record<RechargePointsMode, string> = {
  general: "仅通用积分",
  professional: "仅专业积分",
  mixed: "混合发放",
};
export function matchRechargeTier(p: RechargeProductDef, amount: number): RechargeTier | null {
  if (amount <= 0) return null;
  // 在 [min, max] 区间内匹配;若超过最大阶梯上限,沿用最后一阶梯
  for (const t of p.tiers) {
    if (amount >= t.min && amount <= t.max) return t;
  }
  const last = p.tiers[p.tiers.length - 1];
  if (last && amount > last.max) return last;
  return null;
}
export function calcRechargePoints(tier: RechargeTier | null, amount: number) {
  if (!tier || amount <= 0) return { basic: 0, gift: 0 };
  const basicGeneral = Math.round(amount * tier.generalRate);
  const basicPro = Math.round(amount * tier.proRate);
  const giftGeneral = Math.round((basicGeneral * tier.generalBonus) / 100);
  const giftPro = Math.round((basicPro * tier.proBonus) / 100);
  return { basic: basicGeneral + basicPro, gift: giftGeneral + giftPro };
}

export function addYears(dateStr: string, years: number) {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return fmtDate(d);
}

export function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}
export function fmtTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildMock(): RechargeRow[] {
  const rows: RechargeRow[] = [];
  let seed = 20260313;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const base = new Date("2026-03-13T17:45:08");
  const total = 36;
  for (let i = 0; i < total; i++) {
    const t = new Date(base.getTime() - i * 1000 * 60 * 47 - Math.floor(rnd() * 60000));
    const type: RechargeType = rnd() < 0.45 ? "积分充值" : "套餐购买";
    const tenant = TENANT_NAMES[Math.floor(rnd() * TENANT_NAMES.length)];
    // 1-2 个关联应用
    const appCount = rnd() < 0.55 ? 2 : 1;
    const used = new Set<number>();
    const apps: AppRef[] = [];
    while (apps.length < appCount) {
      const idx = Math.floor(rnd() * APPS.length);
      if (used.has(idx)) continue;
      used.add(idx);
      apps.push(APPS[idx]);
    }
    let product: string;
    let amount: number;
    let basicPoints: number;
    let giftPoints: number;
    if (type === "积分充值") {
      product = PRODUCTS_RECHARGE[Math.floor(rnd() * PRODUCTS_RECHARGE.length)];
      const cash = parseInt(product) || 10;
      amount = cash;
      basicPoints = cash * 10;
      giftPoints = rnd() < 0.3 ? Math.round(basicPoints * 0.1) : 0;
    } else {
      product = PRODUCTS_BUNDLE[Math.floor(rnd() * PRODUCTS_BUNDLE.length)];
      const tier = [10, 1000, 10000, 109800, 50000][Math.floor(rnd() * 5)];
      amount = tier;
      basicPoints = Math.round(tier * (rnd() < 0.5 ? 1 : 0.9));
      giftPoints = Math.round(basicPoints * (0.05 + rnd() * 0.2));
    }
    const expire = new Date(t.getFullYear() + 1, t.getMonth(), t.getDate());
    rows.push({
      id: `ORD${fmtDate(t).replace(/-/g, "")}${pad(i + 1, 4)}`,
      tenant,
      apps,
      product,
      type,
      amount,
      basicPoints,
      giftPoints,
      expireAt: fmtDate(expire),
      createdAt: fmtTime(t),
      operator: "admin",
    });
  }
  return rows;
}

const MOCK = buildMock();

// === 新增充值 向导 · 租户模拟数据 ===
export interface WizardTenant {
  id: string;
  name: string;
  contact: string;
  contactPhone: string;
  apps: AppRef[];
  generalBalance: number;
  proBalance: number;
  partner: string;
  enabled: boolean;
}

const W_CONTACTS = ["li", "jack", "rose", "刘德华", "刘一", "张伟", "王芳", "陈晓"];
const W_PARTNERS = ["星火短剧工作室", "广东分公司总代", "华东渠道商", "西南渠道商", "直营"];
export function buildWizardTenants(): WizardTenant[] {
  return Array.from({ length: 22 }).map((_, i) => {
    const name = TENANT_NAMES[i % TENANT_NAMES.length] + (i >= TENANT_NAMES.length ? `(${i})` : "");
    const phone = "1" + String(38452487968 + i * 731).slice(0, 10);
    const appCount = (i % 3) + 1;
    const apps: AppRef[] = [];
    for (let k = 0; k < appCount; k++) apps.push(APPS[(i + k) % APPS.length]);
    const g = ((i * 1373) % 90 - 10) * 1000;
    const p = ((i * 911) % 50 + 2) * 1000;
    return {
      id: `PT${String(202600 + i + 1).padStart(6, "0")}`,
      name,
      contact: W_CONTACTS[i % W_CONTACTS.length],
      contactPhone: phone,
      apps,
      generalBalance: g,
      proBalance: p,
      partner: W_PARTNERS[i % W_PARTNERS.length],
      enabled: i % 7 !== 0,
    };
  });
}

export function Stepper({
  current,
  steps,
}: {
  current: 1 | 2 | 3;
  steps: { label: string; icon: typeof User }[];
}) {
  return (
    <div className="flex items-center justify-center gap-2 max-w-[640px] mx-auto">
      {steps.map((s, idx) => {
        const stepNum = (idx + 1) as 1 | 2 | 3;
        const done = current > stepNum;
        const active = current === stepNum;
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/15"
                    : done
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={`text-xs ${
                  active ? "text-primary font-medium" : done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 -mt-5 ${
                  current > stepNum ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RechargePage() {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 3600 * 1000);
  const [startDate, setStartDate] = useState(fmtDate(monthAgo) + " 00:00:00");
  const [endDate, setEndDate] = useState(fmtDate(today) + " 23:59:59");
  const [kw, setKw] = useState("");
  const [typeF, setTypeF] = useState("all");

  const [applied, setApplied] = useState({ kw: "", type: "all" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [detailRow, setDetailRow] = useState<RechargeRow | null>(null);

  const filtered = useMemo(() => {
    return MOCK.filter((r) => {
      if (applied.kw) {
        const k = applied.kw.toLowerCase();
        if (!r.tenant.toLowerCase().includes(k) && !r.id.toLowerCase().includes(k)) return false;
      }
      if (applied.type !== "all" && r.type !== applied.type) return false;
      return true;
    });
  }, [applied]);

  const stats = useMemo(() => {
    let count = 0,
      amount = 0,
      basic = 0,
      gift = 0;
    filtered.forEach((r) => {
      count += 1;
      amount += r.amount;
      basic += r.basicPoints;
      gift += r.giftPoints;
    });
    return { count, amount, basic, gift };
  }, [filtered]);

  const total = filtered.length;
  const pageData = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  const apply = () => {
    setApplied({ kw: kw.trim(), type: typeF });
    setPage(1);
  };
  const reset = () => {
    setStartDate(fmtDate(monthAgo) + " 00:00:00");
    setEndDate(fmtDate(today) + " 23:59:59");
    setKw("");
    setTypeF("all");
    setApplied({ kw: "", type: "all" });
    setPage(1);
  };


  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>业务交易</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">充值管理</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">充值管理</h1>
            <p className="text-white/85 text-sm mt-0.5">
              管理客户在各关联应用上的积分充值与套餐购买订单,支持新增充值、按充值类型与时间区间筛选
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
                    <Info className="h-3 w-3" /> 默认近 30 天
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>未选择时间时,默认查询最近 30 天充值订单</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="请输入客户名称 / 订单编号"
              className="pl-9"
            />
          </div>

          <Select value={typeF} onValueChange={setTypeF}>
            <SelectTrigger>
              <SelectValue placeholder="全部充值类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部充值类型</SelectItem>
              <SelectItem value="积分充值">积分充值</SelectItem>
              <SelectItem value="套餐购买">套餐购买</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> 重置
          </Button>
          <Button onClick={apply}>
            <Search className="h-4 w-4" /> 搜索
          </Button>
          <Button
            onClick={() => toast.success(`已导出当前筛选下 ${total} 条充值订单`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="h-4 w-4" /> 导出
          </Button>
        </div>
      </Card>

      {/* 统计卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="充值订单数" value={stats.count} icon={Receipt} gradient="from-sky-500 to-blue-600" />
        <StatCard label="充值总金额 (元)" value={stats.amount} icon={ShoppingBag} gradient="from-violet-500 to-purple-600" prefix="¥" />
        <StatCard label="基础积分发放" value={stats.basic} icon={Coins} gradient="from-amber-500 to-orange-500" />
        <StatCard label="赠送积分发放" value={stats.gift} icon={Gift} gradient="from-emerald-500 to-green-600" prefix="+" />
      </div>

      {/* 列表 */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Button asChild>
            <Link to="/points/transactions/recharge/new">
              <Plus className="h-4 w-4" /> 新增充值
            </Link>
          </Button>
          <div className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{total}</span> 条充值订单
          </div>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="whitespace-nowrap">订单编号</TableHead>
                <TableHead className="whitespace-nowrap">客户名称</TableHead>
                <TableHead className="whitespace-nowrap">关联应用</TableHead>
                <TableHead className="whitespace-nowrap">产品名称</TableHead>
                <TableHead className="whitespace-nowrap">充值类型</TableHead>
                <TableHead className="text-right whitespace-nowrap">充值金额 (元)</TableHead>
                <TableHead className="text-right whitespace-nowrap">基础积分</TableHead>
                <TableHead className="text-right whitespace-nowrap">赠送积分</TableHead>
                <TableHead className="whitespace-nowrap">积分到期日</TableHead>
                <TableHead className="whitespace-nowrap">充值时间</TableHead>
                <TableHead className="whitespace-nowrap">操作人</TableHead>
                <TableHead className="text-right whitespace-nowrap">操作</TableHead>
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
                pageData.map((r) => (
                  <TableRow key={r.id} className="hover:bg-accent/30">
                    <TableCell className="font-mono text-xs whitespace-nowrap">{r.id}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{r.tenant}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {r.apps.map((a) => (
                          <Badge
                            key={a.appId}
                            variant="outline"
                            className="bg-accent/40 text-primary border-primary/20 w-fit font-mono text-[11px]"
                          >
                            {a.name} · {a.appId}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.product}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.type === "积分充值" ? (
                        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                          积分充值
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          套餐购买
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap font-semibold text-rose-600">
                      ¥{r.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      {r.basicPoints.toLocaleString()}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums whitespace-nowrap font-medium ${
                        r.giftPoints > 0 ? "text-emerald-600" : "text-muted-foreground"
                      }`}
                    >
                      {r.giftPoints > 0 ? `+${r.giftPoints.toLocaleString()}` : "+0"}
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{r.expireAt}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {r.createdAt}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary" className="font-normal">{r.operator}</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-primary"
                          onClick={() => setDetailRow(r)}
                        >
                          <Eye className="h-3.5 w-3.5" /> 详情
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                          <Link to="/points/transactions/points-ledger">
                            <ArrowLeftRight className="h-3.5 w-3.5" /> 流水
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <ListPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </Card>


      {/* 订单详情 */}
      <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>充值订单详情</DialogTitle>
            <DialogDescription className="font-mono text-xs">{detailRow?.id}</DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm py-2">
              <DetailItem label="租户名称" value={detailRow.tenant} />
              <DetailItem
                label="充值类型"
                value={
                  <Badge
                    variant="outline"
                    className={
                      detailRow.type === "积分充值"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {detailRow.type}
                  </Badge>
                }
              />
              <DetailItem label="产品名称" value={detailRow.product} />
              <DetailItem
                label="充值金额"
                value={<span className="font-semibold text-rose-600">¥{detailRow.amount.toLocaleString()}</span>}
              />
              <DetailItem label="基础积分" value={detailRow.basicPoints.toLocaleString()} />
              <DetailItem
                label="赠送积分"
                value={
                  <span className={detailRow.giftPoints > 0 ? "text-emerald-600 font-medium" : ""}>
                    +{detailRow.giftPoints.toLocaleString()}
                  </span>
                }
              />
              <DetailItem label="积分到期日" value={<span className="font-mono text-xs">{detailRow.expireAt}</span>} />
              <DetailItem label="充值时间" value={<span className="font-mono text-xs">{detailRow.createdAt}</span>} />
              <DetailItem label="操作人" value={detailRow.operator} />
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground mb-1">关联应用</div>
                <div className="flex flex-wrap gap-2">
                  {detailRow.apps.map((a) => (
                    <Badge
                      key={a.appId}
                      variant="outline"
                      className="bg-accent/40 text-primary border-primary/20 font-mono text-[11px]"
                    >
                      {a.name} · {a.appId}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailRow(null)}>
              <X className="h-4 w-4" /> 关闭
            </Button>
            <Button asChild>
              <Link to="/points/transactions/points-ledger">查看积分流水</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  prefix,
}: {
  label: string;
  value: number;
  icon: typeof Receipt;
  gradient: string;
  prefix?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 text-white bg-gradient-to-br ${gradient} shadow-sm`}
    >
      <div className="relative z-10">
        <div className="text-3xl font-bold tabular-nums tracking-tight">
          {prefix ?? ""}
          {value.toLocaleString()}
        </div>
        <div className="text-sm text-white/85 mt-1">{label}</div>
      </div>
      <Icon className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 text-white/20" />
    </div>
  );
}