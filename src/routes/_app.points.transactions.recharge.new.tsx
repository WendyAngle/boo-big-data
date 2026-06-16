import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  User,
  ShoppingCart,
  CheckCircle2,
  Check,
  HelpCircle,
  CalendarDays,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ListPagination } from "@/components/ListPagination";
import { toast } from "sonner";
import {
  BUNDLE_PRODUCTS,
  RECHARGE_PRODUCTS,
  POINTS_MODE_LABEL,
  matchRechargeTier,
  calcRechargePoints,
  buildWizardTenants,
  addYears,
  fmtDate,
  Stepper,
} from "./_app.points.transactions.recharge.index";

export const Route = createFileRoute("/_app/points/transactions/recharge/new")({
  head: () => ({ meta: [{ title: "新增充值 · 充值管理 | Boo数据平台" }] }),
  component: RechargeNewPage,
});

type RechargeType = "积分充值" | "套餐购买";

function RechargeNewPage() {
  const navigate = useNavigate();
  const back = () => navigate({ to: "/points/transactions/recharge" });

  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // 第一步:租户
  const [pickedTenantIds, setPickedTenantIds] = useState<string[]>([]);
  const [tenantKw, setTenantKw] = useState("");
  const [tenantStatusF, setTenantStatusF] = useState("enabled");
  const [tenantPage, setTenantPage] = useState(1);
  const TENANT_PAGE_SIZE = 5;

  // 第二步:产品
  const [productTab, setProductTab] = useState<"bundle" | "recharge">("bundle");
  const [pickedBundleId, setPickedBundleId] = useState<string>("");
  const [rechargeProductId, setRechargeProductId] = useState<string>("");
  const [rechargeAmount, setRechargeAmount] = useState<number | "">("");
  const [expireDate, setExpireDate] = useState<string>(() =>
    addYears(fmtDate(new Date()), 1),
  );
  const [wizardRemark, setWizardRemark] = useState("");

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
  const pickedTenants = WIZARD_TENANTS.filter((t) => pickedTenantIds.includes(t.id));
  const pickedTenant = pickedTenants[0] || null;
  const pageAllChecked =
    tenantPageData.length > 0 && tenantPageData.every((t) => pickedTenantIds.includes(t.id));
  const pageSomeChecked =
    tenantPageData.some((t) => pickedTenantIds.includes(t.id)) && !pageAllChecked;
  const togglePageAll = (checked: boolean) => {
    setPickedTenantIds((prev) => {
      const ids = tenantPageData.map((t) => t.id);
      if (checked) {
        const set = new Set(prev);
        ids.forEach((id) => set.add(id));
        return Array.from(set);
      }
      return prev.filter((id) => !ids.includes(id));
    });
  };
  const toggleTenant = (id: string, checked: boolean) => {
    setPickedTenantIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  };

  const pickedBundle = BUNDLE_PRODUCTS.find((b) => b.id === pickedBundleId) || null;
  const pickedProduct = RECHARGE_PRODUCTS.find((c) => c.id === rechargeProductId) || null;
  const rechargeAmt = typeof rechargeAmount === "number" ? rechargeAmount : 0;
  const rechargeTier = pickedProduct ? matchRechargeTier(pickedProduct, rechargeAmt) : null;
  const { basic: rechargeBasic, gift: rechargeGift } = calcRechargePoints(rechargeTier, rechargeAmt);

  const summary = useMemo(() => {
    if (productTab === "bundle" && pickedBundle) {
      return {
        type: "套餐购买" as RechargeType,
        productName: pickedBundle.name,
        productDesc: pickedBundle.description,
        amount: pickedBundle.amount,
        basic: pickedBundle.basicPoints,
        gift: pickedBundle.giftPoints,
      };
    }
    if (productTab === "recharge" && pickedProduct && rechargeAmt > 0) {
      return {
        type: "积分充值" as RechargeType,
        productName: `${pickedProduct.name} · ¥${rechargeAmt.toLocaleString()}`,
        productDesc: rechargeTier
          ? `匹配阶梯 ¥${rechargeTier.min.toLocaleString()}-¥${rechargeTier.max.toLocaleString()}`
          : "未匹配任何阶梯,无赠送",
        amount: rechargeAmt,
        basic: rechargeBasic,
        gift: rechargeGift,
      };
    }
    return null;
  }, [productTab, pickedBundle, pickedProduct, rechargeAmt, rechargeBasic, rechargeGift, rechargeTier]);

  const nextStep = () => {
    if (wizardStep === 1) {
      if (pickedTenantIds.length === 0) {
        toast.error("请至少选择一个租户");
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!summary) {
        toast.error(
          productTab === "bundle"
            ? "请选择一个套餐产品"
            : "请选择充值产品并输入充值金额",
        );
        return;
      }
      if (!expireDate) {
        toast.error("请设置积分到期日");
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
    if (pickedTenants.length === 0 || !summary) return;
    const label =
      pickedTenants.length === 1
        ? `「${pickedTenants[0].name}」`
        : `${pickedTenants.length} 位租户`;
    toast.success(
      `已为${label}创建${summary.type}订单 ¥${summary.amount.toLocaleString()}`,
    );
    back();
  };

  return (
    <div className="p-8 space-y-6">
      {/* 面包屑 */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>业务交易</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          to="/points/transactions/recharge"
          className="hover:text-foreground transition-colors"
        >
          充值管理
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">新增充值</span>
      </div>

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={back} className="h-8">
            <ArrowLeft className="h-4 w-4" /> 返回
          </Button>
          <div>
            <h1 className="text-xl font-bold">新增充值</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              依次完成「选择租户 → 选择产品 → 确认充值」三步,完成后将自动生成充值订单与积分流水
            </p>
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      <Card className="px-8 py-6">
        <Stepper
          current={wizardStep}
          steps={[
            { label: "选择租户", icon: User },
            { label: "选择产品", icon: ShoppingCart },
            { label: "确认充值", icon: CheckCircle2 },
          ]}
        />
      </Card>

      {/* 主体内容 */}
      <Card className="p-6">
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
                    <TableHead className="w-10">
                      <Checkbox
                        checked={pageAllChecked ? true : pageSomeChecked ? "indeterminate" : false}
                        onCheckedChange={(v) => togglePageAll(v === true)}
                        aria-label="全选当前页"
                      />
                    </TableHead>
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
                      const picked = pickedTenantIds.includes(t.id);
                      const balance = t.generalBalance + t.proBalance;
                      return (
                        <TableRow
                          key={t.id}
                          onClick={() => toggleTenant(t.id, !picked)}
                          data-state={picked ? "selected" : undefined}
                          className={`cursor-pointer ${picked ? "bg-primary/5" : "hover:bg-accent/30"}`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={picked}
                              onCheckedChange={(v) => toggleTenant(t.id, v === true)}
                              aria-label={`选择 ${t.name}`}
                            />
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
                  {pickedTenants.length > 1 && (
                    <span className="text-muted-foreground"> 等 {pickedTenants.length} 位租户</span>
                  )}
                </div>
                <Badge variant="outline" className="bg-accent/40 text-primary border-primary/20">
                  剩余 {(pickedTenant.generalBalance + pickedTenant.proBalance).toLocaleString()} 积分
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-2 text-base font-semibold">
              选择充值产品
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-amber-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    套餐产品按固定金额发放预设积分;充值产品按所选产品的阶梯规则计算基础积分与赠送积分。
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Tabs
              value={productTab}
              onValueChange={(v) => setProductTab(v as "bundle" | "recharge")}
            >
              <TabsList className="bg-transparent p-0 h-auto border-b rounded-none w-full justify-start gap-6">
                <TabsTrigger
                  value="bundle"
                  className="px-0 pb-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  套餐产品
                </TabsTrigger>
                <TabsTrigger
                  value="recharge"
                  className="px-0 pb-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  充值产品
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bundle" className="mt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {BUNDLE_PRODUCTS.map((b) => {
                    const active = pickedBundleId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setPickedBundleId(b.id)}
                        className={`relative text-left rounded-xl border-2 p-5 transition-all ${
                          active
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-dashed border-border bg-card hover:border-primary/40 hover:bg-accent/20"
                        }`}
                      >
                        {active && (
                          <span className="absolute top-3 right-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <div className="text-lg font-bold">{b.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                          {b.description}
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-rose-600 tabular-nums">
                            ¥ {b.amount.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">充值金额</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-foreground/80">
                            <span className="tabular-nums font-medium">{b.basicPoints.toLocaleString()}</span> 基础积分
                          </span>
                          <span className="text-emerald-600 font-medium tabular-nums">
                            +{b.giftPoints.toLocaleString()} 赠送积分
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="recharge" className="mt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>
                        充值产品 <span className="text-destructive">*</span>
                      </Label>
                      <Select value={rechargeProductId} onValueChange={setRechargeProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择充值产品" />
                        </SelectTrigger>
                        <SelectContent>
                          {RECHARGE_PRODUCTS.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="font-mono text-xs text-muted-foreground mr-2">{c.id}</span>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {pickedProduct && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="bg-muted/40 border-border text-foreground/80">
                            {pickedProduct.targetType === "category" ? "分类" : "基础产品"} · {pickedProduct.targetKey}
                          </Badge>
                          <Badge variant="outline" className="bg-muted/40 border-border text-foreground/80">
                            {POINTS_MODE_LABEL[pickedProduct.pointsMode]}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        充值金额 (元) <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex">
                        <span className="inline-flex items-center justify-center w-10 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm">
                          ¥
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={rechargeAmount}
                          onChange={(e) =>
                            setRechargeAmount(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          placeholder="请输入充值金额"
                          className="rounded-l-none"
                        />
                      </div>
                      {pickedProduct && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {pickedProduct.tiers.map((t) => (
                            <button
                              key={t.min}
                              type="button"
                              onClick={() => setRechargeAmount(t.min)}
                              className="text-[11px] px-2 py-0.5 rounded border border-border bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                            >
                              ¥{t.min.toLocaleString()}-¥{t.max.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-5 min-h-[280px] flex">
                    {pickedProduct && rechargeAmt > 0 ? (
                      <div className="w-full">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">预计获得总积分</div>
                          <div className="mt-1 text-3xl font-bold text-emerald-600 tabular-nums">
                            +{(rechargeBasic + rechargeGift).toLocaleString()}
                          </div>
                        </div>
                        <div className="my-4 border-t" />
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">匹配阶梯</div>
                          <div className="mt-1 text-lg font-semibold text-rose-600 tabular-nums">
                            {rechargeTier ? `¥${rechargeTier.min.toLocaleString()}-¥${rechargeTier.max.toLocaleString()}` : "未匹配"}
                          </div>
                        </div>
                        <div className="mt-5 space-y-2.5 text-sm">
                          {rechargeTier && rechargeTier.generalRate > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">通用积分比例</span>
                              <span className="text-primary font-medium tabular-nums">
                                1 元 = {rechargeTier.generalRate} 通用积分
                              </span>
                            </div>
                          )}
                          {rechargeTier && rechargeTier.proRate > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">专业积分比例</span>
                              <span className="text-primary font-medium tabular-nums">
                                1 元 = {rechargeTier.proRate} 专业积分
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">基础积分</span>
                            <span className="font-semibold tabular-nums">
                              {rechargeBasic.toLocaleString()}
                            </span>
                          </div>
                          {rechargeTier && (rechargeTier.generalBonus > 0 || rechargeTier.proBonus > 0) && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">赠送比例</span>
                              <span className="text-amber-600 font-medium tabular-nums">
                                {rechargeTier.generalRate > 0 && `通用 +${rechargeTier.generalBonus}%`}
                                {rechargeTier.generalRate > 0 && rechargeTier.proRate > 0 && " / "}
                                {rechargeTier.proRate > 0 && `专业 +${rechargeTier.proBonus}%`}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">赠送积分</span>
                            <span className="text-emerald-600 font-medium tabular-nums">
                              +{rechargeGift.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="m-auto text-center text-muted-foreground">
                        <ShoppingCart className="h-10 w-10 mx-auto opacity-40" />
                        <div className="mt-3 text-sm">请选择充值产品并输入充值金额</div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm font-semibold pt-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                积分到期日设置
              </div>
              <div className="text-xs text-muted-foreground">设置积分有效期至</div>
              <div className="relative max-w-[260px]">
                <CalendarDays className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={expireDate}
                  onChange={(e) => setExpireDate(e.target.value)}
                  className="pl-9 font-mono text-xs"
                />
              </div>
              <div className="text-[11px] text-muted-foreground">默认有效期为一年</div>
            </div>

            <div className="space-y-1.5">
              <Label>备注</Label>
              <Input
                value={wizardRemark}
                onChange={(e) => setWizardRemark(e.target.value)}
                placeholder="选填,例如「2026 Q1 续费补单」"
              />
            </div>
          </div>
        )}

        {wizardStep === 3 && pickedTenant && summary && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>请认真核对充值信息,确认无误后点击「确认充值」按钮。本次操作将立即生成订单并发放积分。</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b-2 border-sky-500/80 bg-sky-50/40">
                  <User className="h-4 w-4 text-sky-600" />
                  <span className="text-sm font-semibold text-sky-700">
                    选定租户
                    {pickedTenants.length > 1 && (
                      <span className="ml-1 text-xs text-sky-600/80">
                        (共 {pickedTenants.length} 位)
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <div className="px-5 py-2.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/30 border-b">
                    <span>租户编号</span>
                    <span>租户名称</span>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto divide-y">
                    {pickedTenants.map((t) => (
                      <div
                        key={t.id}
                        className="px-5 py-2.5 flex items-center justify-between text-sm hover:bg-accent/30"
                      >
                        <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                        <span className="font-medium text-foreground">{t.name}</span>
                      </div>
                    ))}
                  </div>
                  {wizardRemark && (
                    <div className="px-5 py-3 flex items-start justify-between gap-4 text-sm border-t">
                      <span className="text-muted-foreground shrink-0">备注</span>
                      <span className="text-right text-foreground">{wizardRemark}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b-2 border-emerald-500/80 bg-emerald-50/40">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">产品信息</span>
                </div>
                <div className="divide-y">
                  <div className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">充值类型</span>
                    <Badge
                      variant="outline"
                      className={
                        summary.type === "积分充值"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }
                    >
                      {summary.type}
                    </Badge>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">产品名称</span>
                    <span className="font-semibold text-foreground">{summary.productName}</span>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between text-sm border-l-2 border-rose-400/70 -ml-px pl-[18px]">
                    <span className="text-muted-foreground">充值金额</span>
                    <span className="text-xl font-bold text-rose-600 tabular-nums">
                      ¥{summary.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">基础积分</span>
                    <span className="font-semibold tabular-nums">{summary.basic.toLocaleString()} 点</span>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">赠送积分</span>
                    <span className={`font-semibold tabular-nums ${summary.gift > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {summary.gift > 0 ? "+" : ""}{summary.gift.toLocaleString()} 点
                    </span>
                  </div>
                  <div className="px-5 py-4 flex items-center justify-between border-l-2 border-emerald-500/80 -ml-px pl-[18px] bg-emerald-50/30">
                    <span className="text-sm font-semibold text-emerald-700">预计获得总积分</span>
                    <span className="text-2xl font-bold text-emerald-600 tabular-nums">
                      {(summary.basic + summary.gift).toLocaleString()} 点
                    </span>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">积分到期日</span>
                    <span className="font-mono text-xs text-amber-700">{expireDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 底部操作栏 */}
      <Card className="px-6 py-3 flex items-center justify-between sticky bottom-4 shadow-md">
        <div>
          {wizardStep > 1 && (
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="h-4 w-4" /> 上一步
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={back}>取消</Button>
          {wizardStep < 3 ? (
            <Button
              onClick={nextStep}
              disabled={
                (wizardStep === 1 && pickedTenantIds.length === 0) ||
                (wizardStep === 2 && !summary)
              }
            >
              下一步 <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submitCreate}>
              <Check className="h-4 w-4" /> 确认充值
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}