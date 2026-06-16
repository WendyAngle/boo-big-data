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
  ShoppingCart,
  CheckCircle2,
  Check,
  ChevronLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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

interface AppRef {
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
const TENANT_NAMES = [
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

const APPS: AppRef[] = [
  { name: "AI视频生成", appId: "ai_0004" },
  { name: "SIS", appId: "sea_0004" },
  { name: "AIMedia", appId: "aim_0007" },
  { name: "Hub", appId: "hub_0012" },
];

const PRODUCTS_RECHARGE = ["10 元充值包", "100 元充值包", "500 元充值包", "1000 元充值包"];
const PRODUCTS_BUNDLE = ["入门版", "标准版", "拓界版", "旗舰版", "test"];

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}
function fmtTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function fmtDate(d: Date) {
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
interface WizardTenant {
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
function buildWizardTenants(): WizardTenant[] {
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

function Stepper({
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

  const [createOpen, setCreateOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<RechargeRow | null>(null);

  // 新增充值 多步向导
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [pickedTenantId, setPickedTenantId] = useState<string>("");
  const [tenantKw, setTenantKw] = useState("");
  const [tenantStatusF, setTenantStatusF] = useState("all");
  const [tenantPage, setTenantPage] = useState(1);
  const TENANT_PAGE_SIZE = 5;
  const [wizardType, setWizardType] = useState<RechargeType>("积分充值");
  const [wizardProduct, setWizardProduct] = useState<string>(PRODUCTS_RECHARGE[0]);
  const [wizardAmount, setWizardAmount] = useState<number>(100);
  const [wizardRemark, setWizardRemark] = useState("");

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

  const productOptions = wizardType === "积分充值" ? PRODUCTS_RECHARGE : PRODUCTS_BUNDLE;

  // 模拟租户列表 (与「积分管理系统 · 租户管理」字段一致)
  const WIZARD_TENANTS = useMemo(() => buildWizardTenants(), []);

  const tenantFiltered = useMemo(() => {
    return WIZARD_TENANTS.filter((t) => {
      if (tenantKw) {
        const k = tenantKw.toLowerCase();
        if (
          !t.name.toLowerCase().includes(k) &&
          !t.id.toLowerCase().includes(k) &&
          !t.contactPhone.includes(k)
        )
          return false;
      }
      if (tenantStatusF !== "all") {
        const enabled = tenantStatusF === "enabled";
        if (t.enabled !== enabled) return false;
      }
      return true;
    });
  }, [WIZARD_TENANTS, tenantKw, tenantStatusF]);
  const tenantTotal = tenantFiltered.length;
  const tenantPageData = tenantFiltered.slice(
    (tenantPage - 1) * TENANT_PAGE_SIZE,
    tenantPage * TENANT_PAGE_SIZE,
  );
  const pickedTenant = WIZARD_TENANTS.find((t) => t.id === pickedTenantId) || null;

  const openCreate = () => {
    setWizardStep(1);
    setPickedTenantId("");
    setTenantKw("");
    setTenantStatusF("all");
    setTenantPage(1);
    setWizardType("积分充值");
    setWizardProduct(PRODUCTS_RECHARGE[0]);
    setWizardAmount(100);
    setWizardRemark("");
    setCreateOpen(true);
  };

  const nextStep = () => {
    if (wizardStep === 1) {
      if (!pickedTenantId) {
        toast.error("请选择一个租户");
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!wizardAmount || wizardAmount <= 0) {
        toast.error("请输入有效充值金额");
        return;
      }
      setWizardStep(3);
    }
  };
  const prevStep = () => {
    if (wizardStep === 2) setWizardStep(1);
    else if (wizardStep === 3) setWizardStep(2);
  };
  const submitCreate = () => {
    if (!pickedTenant) return;
    toast.success(
      `已为「${pickedTenant.name}」创建${wizardType}订单 ¥${wizardAmount.toLocaleString()}`,
    );
    setCreateOpen(false);
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
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> 新增充值
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

      {/* 新增充值 弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[960px] max-h-[88vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 border-b">
            <DialogTitle>新增充值</DialogTitle>
            <DialogDescription>
              依次完成「选择租户 → 选择产品 → 确认充值」三步,完成后将自动生成一条充值订单与积分流水。
            </DialogDescription>
          </DialogHeader>

          {/* 步骤指示器 */}
          <div className="px-8 py-6">
            <Stepper
              current={wizardStep}
              steps={[
                { label: "选择租户", icon: User },
                { label: "选择产品", icon: ShoppingCart },
                { label: "确认充值", icon: CheckCircle2 },
              ]}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-2">
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="text-base font-semibold">查找租户</div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[260px]">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={tenantKw}
                      onChange={(e) => {
                        setTenantKw(e.target.value);
                        setTenantPage(1);
                      }}
                      placeholder="输入租户名称 / 手机号 / 租户编号 搜索"
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={tenantStatusF}
                    onValueChange={(v) => {
                      setTenantStatusF(v);
                      setTenantPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有状态</SelectItem>
                      <SelectItem value="enabled">合作中</SelectItem>
                      <SelectItem value="disabled">已停用</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    <Search className="h-4 w-4" /> 搜索
                  </Button>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="whitespace-nowrap">租户编号</TableHead>
                        <TableHead className="whitespace-nowrap">租户名称</TableHead>
                        <TableHead className="whitespace-nowrap">联系信息</TableHead>
                        <TableHead className="whitespace-nowrap">关联应用</TableHead>
                        <TableHead className="text-right whitespace-nowrap">剩余积分</TableHead>
                        <TableHead className="whitespace-nowrap">所属合作伙伴</TableHead>
                        <TableHead className="whitespace-nowrap">状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantPageData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                            没有匹配的租户
                          </TableCell>
                        </TableRow>
                      ) : (
                        tenantPageData.map((t) => {
                          const picked = pickedTenantId === t.id;
                          const balance = t.generalBalance + t.proBalance;
                          return (
                            <TableRow
                              key={t.id}
                              onClick={() => setPickedTenantId(t.id)}
                              data-state={picked ? "selected" : undefined}
                              className={`cursor-pointer ${picked ? "bg-primary/5" : "hover:bg-accent/30"}`}
                            >
                              <TableCell>
                                <span
                                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                                    picked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                                  }`}
                                >
                                  {picked && <Check className="h-3 w-3" />}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono text-xs whitespace-nowrap">{t.id}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap">{t.name}</TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                <div>{t.contact}</div>
                                <div className="font-mono text-xs text-muted-foreground">{t.contactPhone}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {t.apps.map((a) => (
                                    <span key={a.appId} className="text-xs text-muted-foreground">
                                      <span className="text-foreground">{a.name}</span>
                                      <span className="font-mono"> · {a.appId}</span>
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell
                                className={`text-right tabular-nums whitespace-nowrap font-medium ${
                                  balance < 0 ? "text-rose-600" : ""
                                }`}
                              >
                                {balance.toLocaleString()}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">{t.partner}</TableCell>
                              <TableCell>
                                {t.enabled ? (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    合作中
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                                    已停用
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                <ListPagination
                  page={tenantPage}
                  pageSize={TENANT_PAGE_SIZE}
                  total={tenantTotal}
                  onPageChange={setTenantPage}
                />
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-5">
                {pickedTenant && (
                  <div className="rounded-md border bg-muted/30 px-4 py-3 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground">已选租户:</span>{" "}
                      <span className="font-medium">{pickedTenant.name}</span>{" "}
                      <span className="font-mono text-xs text-muted-foreground">({pickedTenant.id})</span>
                    </div>
                    <Badge variant="outline" className="bg-accent/40 text-primary border-primary/20">
                      剩余 {(pickedTenant.generalBalance + pickedTenant.proBalance).toLocaleString()} 积分
                    </Badge>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>充值类型</Label>
                    <Select
                      value={wizardType}
                      onValueChange={(v) => {
                        setWizardType(v as RechargeType);
                        setWizardProduct(v === "积分充值" ? PRODUCTS_RECHARGE[0] : PRODUCTS_BUNDLE[0]);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="积分充值">积分充值</SelectItem>
                        <SelectItem value="套餐购买">套餐购买</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>产品名称</Label>
                    <Select value={wizardProduct} onValueChange={setWizardProduct}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {productOptions.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>充值金额 (元)</Label>
                    <Input
                      type="number"
                      value={wizardAmount}
                      onChange={(e) => setWizardAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>备注</Label>
                    <Input
                      value={wizardRemark}
                      onChange={(e) => setWizardRemark(e.target.value)}
                      placeholder="选填"
                    />
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                  <span>
                    本次按「{wizardType}」规则计算: 基础积分 {(wizardAmount * 10).toLocaleString()},预计赠送积分 +{Math.round(wizardAmount * 10 * 0.1).toLocaleString()}。
                  </span>
                </div>
              </div>
            )}

            {wizardStep === 3 && pickedTenant && (
              <div className="space-y-4 pb-2">
                <div className="rounded-lg border bg-card p-5 space-y-3">
                  <div className="text-sm font-semibold text-foreground">订单信息确认</div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <DetailItem label="租户名称" value={pickedTenant.name} />
                    <DetailItem label="租户编号" value={<span className="font-mono text-xs">{pickedTenant.id}</span>} />
                    <DetailItem
                      label="充值类型"
                      value={
                        <Badge
                          variant="outline"
                          className={
                            wizardType === "积分充值"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }
                        >
                          {wizardType}
                        </Badge>
                      }
                    />
                    <DetailItem label="产品名称" value={wizardProduct} />
                    <DetailItem
                      label="充值金额"
                      value={<span className="font-semibold text-rose-600">¥{wizardAmount.toLocaleString()}</span>}
                    />
                    <DetailItem label="基础积分" value={(wizardAmount * 10).toLocaleString()} />
                    <DetailItem
                      label="赠送积分"
                      value={<span className="text-emerald-600 font-medium">+{Math.round(wizardAmount * 10 * 0.1).toLocaleString()}</span>}
                    />
                    <DetailItem label="备注" value={wizardRemark || <span className="text-muted-foreground">—</span>} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            {wizardStep > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4" /> 上一步
              </Button>
            )}
            {wizardStep < 3 ? (
              <Button onClick={nextStep} disabled={wizardStep === 1 && !pickedTenantId}>
                下一步 <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submitCreate}>
                <Check className="h-4 w-4" /> 确认充值
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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