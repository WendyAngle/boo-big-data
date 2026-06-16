import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Wallet,
  ChevronRight,
  Search,
  Plus,
  RotateCcw,
  Pencil,
  Trash2,
  Layers,
  Sparkles,
  Coins,
  Gem,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListPagination } from "@/components/ListPagination";
import { toast } from "sonner";
import {
  productCategoriesStore,
  useProductCategories,
} from "@/lib/productCategoriesStore";
import {
  basicProductsStore,
  useBasicProducts,
  type BasicProduct,
  type UnitKey,
} from "@/lib/basicProductsStore";

export const Route = createFileRoute("/_app/points/products/recharge")({
  head: () => ({ meta: [{ title: "产品管理 · 充值产品 | Boo数据平台" }] }),
  component: RechargeProductsPage,
});

type TargetType = "category" | "basic";
type PointsMode = "general" | "professional" | "mixed";

interface Tier {
  id: string;
  minAmount: string;
  maxAmount: string;
  // 通用积分
  generalRate: string; // 1 元 = N 通用积分
  generalBonus: string; // 通用赠送 %
  // 专业积分
  proRate: string; // 1 元 = N 专业积分
  proBonus: string; // 专业赠送 %
}

interface RechargeProduct {
  id: string; // RP000001+
  name: string;
  targetType: TargetType;
  targetKey: string; // 分类名 或 基础产品 id
  pointsMode: PointsMode;
  remark: string;
  enabled: boolean;
  tiers: Tier[];
  createdAt: string;
}

const NAME_MAX = 50;
const REMARK_MAX = 200;

function rpCode(seq: number) {
  return `RP${String(seq).padStart(6, "0")}`;
}

function nowStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function newTier(): Tier {
  return {
    id: Math.random().toString(36).slice(2, 9),
    minAmount: "",
    maxAmount: "",
    generalRate: "",
    generalBonus: "",
    proRate: "",
    proBonus: "",
  };
}

const POINTS_MODE_LABEL: Record<PointsMode, string> = {
  general: "仅通用积分",
  professional: "仅专业积分",
  mixed: "混合发放",
};

const INITIAL_RECHARGE: RechargeProduct[] = [
  {
    id: "RP000008",
    name: "数据洞察季度通用充值",
    targetType: "category",
    targetKey: "数据洞察",
    pointsMode: "general",
    remark: "面向数据分析团队的通用积分充值,平台内任意产品可用。",
    enabled: true,
    tiers: [
      { id: "t1", minAmount: "200", maxAmount: "1000", generalRate: "8", generalBonus: "5", proRate: "", proBonus: "" },
      { id: "t2", minAmount: "1000", maxAmount: "5000", generalRate: "8", generalBonus: "10", proRate: "", proBonus: "" },
      { id: "t3", minAmount: "5000", maxAmount: "20000", generalRate: "8", generalBonus: "18", proRate: "", proBonus: "" },
    ],
    createdAt: "2026-03-15 14:22:08",
  },
  {
    id: "RP000007",
    name: "AI内容创作专享充值",
    targetType: "category",
    targetKey: "AI内容创作",
    pointsMode: "professional",
    remark: "仅限 AI 内容创作分类内产品消费的专业积分。",
    enabled: true,
    tiers: [
      { id: "t1", minAmount: "100", maxAmount: "500", generalRate: "", generalBonus: "", proRate: "12", proBonus: "5" },
      { id: "t2", minAmount: "500", maxAmount: "3000", generalRate: "", generalBonus: "", proRate: "12", proBonus: "12" },
      { id: "t3", minAmount: "3000", maxAmount: "10000", generalRate: "", generalBonus: "", proRate: "12", proBonus: "20" },
    ],
    createdAt: "2026-03-14 11:05:33",
  },
  {
    id: "RP000006",
    name: "AI智能获客双轨充值",
    targetType: "category",
    targetKey: "AI智能获客",
    pointsMode: "mixed",
    remark: "通用 + 专业双轨发放,既可全平台使用也可定向消费。",
    enabled: false,
    tiers: [
      { id: "t1", minAmount: "300", maxAmount: "1500", generalRate: "4", generalBonus: "5", proRate: "8", proBonus: "10" },
      { id: "t2", minAmount: "1500", maxAmount: "8000", generalRate: "4", generalBonus: "10", proRate: "8", proBonus: "20" },
    ],
    createdAt: "2026-03-13 18:46:51",
  },
  {
    id: "RP000005",
    name: "Tiktok获客单品通用充值",
    targetType: "basic",
    targetKey: "BP000032",
    pointsMode: "general",
    remark: "锁定 Tiktok 获客销售入口,发放可全平台使用的通用积分。",
    enabled: true,
    tiers: [
      { id: "t1", minAmount: "80", maxAmount: "400", generalRate: "6", generalBonus: "3", proRate: "", proBonus: "" },
      { id: "t2", minAmount: "400", maxAmount: "2000", generalRate: "6", generalBonus: "8", proRate: "", proBonus: "" },
    ],
    createdAt: "2026-03-13 09:18:40",
  },
  {
    id: "RP000004",
    name: "AI图生视频混合充值",
    targetType: "basic",
    targetKey: "BP000030",
    pointsMode: "mixed",
    remark: "单品促销:同时发放可全平台用的通用积分与定向专业积分。",
    enabled: true,
    tiers: [
      { id: "t1", minAmount: "100", maxAmount: "500", generalRate: "3", generalBonus: "5", proRate: "10", proBonus: "10" },
      { id: "t2", minAmount: "500", maxAmount: "3000", generalRate: "3", generalBonus: "10", proRate: "10", proBonus: "20" },
      { id: "t3", minAmount: "3000", maxAmount: "12000", generalRate: "3", generalBonus: "15", proRate: "10", proBonus: "30" },
    ],
    createdAt: "2026-03-12 16:54:27",
  },
  {
    id: "RP000003",
    name: "AI视频消除专业积分包",
    targetType: "basic",
    targetKey: "BP000028",
    pointsMode: "professional",
    remark: "仅限 AI 视频消除使用的专业积分。",
    enabled: false,
    tiers: [
      { id: "t1", minAmount: "50", maxAmount: "300", generalRate: "", generalBonus: "", proRate: "15", proBonus: "0" },
      { id: "t2", minAmount: "300", maxAmount: "1500", generalRate: "", generalBonus: "", proRate: "15", proBonus: "10" },
    ],
    createdAt: "2026-03-12 10:21:12",
  },
  {
    id: "RP000002",
    name: "AI视频制作充值套餐",
    targetType: "category",
    targetKey: "AI视频制作",
    pointsMode: "mixed",
    remark: "面向视频团队的阶梯充值方案,金额越大赠送越多。",
    enabled: true,
    tiers: [
      { id: "t1", minAmount: "100", maxAmount: "500", generalRate: "5", generalBonus: "5", proRate: "10", proBonus: "10" },
      { id: "t2", minAmount: "500", maxAmount: "2000", generalRate: "5", generalBonus: "8", proRate: "10", proBonus: "15" },
      { id: "t3", minAmount: "2000", maxAmount: "10000", generalRate: "5", generalBonus: "12", proRate: "10", proBonus: "25" },
    ],
    createdAt: "2026-03-12 09:30:14",
  },
  {
    id: "RP000001",
    name: "AI文生图体验充值",
    targetType: "basic",
    targetKey: "BP000043",
    pointsMode: "professional",
    remark: "针对单一基础产品的体验充值。",
    enabled: true,
    tiers: [
      { id: "t1", minAmount: "50", maxAmount: "200", generalRate: "", generalBonus: "", proRate: "20", proBonus: "0" },
      { id: "t2", minAmount: "200", maxAmount: "1000", generalRate: "", generalBonus: "", proRate: "20", proBonus: "8" },
    ],
    createdAt: "2026-03-10 16:08:22",
  },
];

function RechargeProductsPage() {
  const categories = useProductCategories();
  const basicProducts = useBasicProducts();
  const enabledCategories = useMemo(() => categories.filter((c) => c.enabled), [categories]);
  const enabledBasic = useMemo(() => basicProducts.filter((b) => b.enabled), [basicProducts]);

  const [data, setData] = useState<RechargeProduct[]>(INITIAL_RECHARGE);
  const [seq, setSeq] = useState(8);

  const [kw, setKw] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TargetType>("all");
  const [modeFilter, setModeFilter] = useState<"all" | PointsMode>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [applied, setApplied] = useState<{
    kw: string;
    type: "all" | TargetType;
    mode: "all" | PointsMode;
    status: "all" | "enabled" | "disabled";
  }>({ kw: "", type: "all", mode: "all", status: "all" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RechargeProduct | null>(null);
  const [delTarget, setDelTarget] = useState<RechargeProduct | null>(null);
  const [toggleTarget, setToggleTarget] = useState<RechargeProduct | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"enable" | "disable" | null>(null);

  const targetLabel = (p: RechargeProduct) => {
    if (p.targetType === "category") return p.targetKey;
    const bp = basicProducts.find((b) => b.id === p.targetKey);
    return bp ? `${bp.name} (${bp.id})` : p.targetKey;
  };

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (applied.kw) {
        const k = applied.kw.toLowerCase();
        if (
          !p.name.toLowerCase().includes(k) &&
          !p.id.toLowerCase().includes(k) &&
          !targetLabel(p).toLowerCase().includes(k)
        )
          return false;
      }
      if (applied.type !== "all" && p.targetType !== applied.type) return false;
      if (applied.mode !== "all" && p.pointsMode !== applied.mode) return false;
      if (applied.status === "enabled" && !p.enabled) return false;
      if (applied.status === "disabled" && p.enabled) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, applied, basicProducts]);

  const total = filtered.length;
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const apply = () => {
    setApplied({ kw: kw.trim(), type: typeFilter, mode: modeFilter, status: statusFilter });
    setPage(1);
  };
  const reset = () => {
    setKw("");
    setTypeFilter("all");
    setModeFilter("all");
    setStatusFilter("all");
    setApplied({ kw: "", type: "all", mode: "all", status: "all" });
    setPage(1);
  };

  // 选择
  const pageIds = pageData.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const someChecked = pageIds.some((id) => selectedIds.includes(id)) && !allChecked;
  const togglePage = (v: boolean) => {
    setSelectedIds((prev) =>
      v
        ? Array.from(new Set([...prev, ...pageIds]))
        : prev.filter((id) => !pageIds.includes(id)),
    );
  };
  const toggleOne = (id: string, v: boolean) => {
    setSelectedIds((prev) => (v ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const confirmToggle = () => {
    if (!toggleTarget) return;
    const next = !toggleTarget.enabled;
    setData((d) => d.map((x) => (x.id === toggleTarget.id ? { ...x, enabled: next } : x)));
    toast.success(`已${next ? "启用" : "停用"} ${toggleTarget.name}`);
    setToggleTarget(null);
  };

  const confirmBulk = () => {
    if (!bulkAction) return;
    const next = bulkAction === "enable";
    setData((d) => d.map((x) => (selectedIds.includes(x.id) ? { ...x, enabled: next } : x)));
    toast.success(`已批量${next ? "启用" : "停用"} ${selectedIds.length} 条充值产品`);
    setBulkAction(null);
    setSelectedIds([]);
  };

  const confirmDelete = () => {
    if (!delTarget) return;
    setData((d) => d.filter((x) => x.id !== delTarget.id));
    setSelectedIds((prev) => prev.filter((id) => id !== delTarget.id));
    toast.success(`已删除 ${delTarget.name}`);
    setDelTarget(null);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>产品管理</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">充值产品</span>
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
            <h1 className="text-xl font-bold">充值产品</h1>
            <p className="text-white/85 text-sm mt-0.5">
              支持按产品分类或基础产品配置充值方案,通过阶梯设置控制基础积分转换比例与赠送比例
            </p>
          </div>
        </div>
      </section>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="请输入充值产品名称/编号/目标对象"
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="目标类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部目标类型</SelectItem>
              <SelectItem value="category">按产品分类</SelectItem>
              <SelectItem value="basic">按基础产品</SelectItem>
            </SelectContent>
          </Select>
          <Select value={modeFilter} onValueChange={(v) => setModeFilter(v as typeof modeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="积分模式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部积分模式</SelectItem>
              <SelectItem value="general">仅通用积分</SelectItem>
              <SelectItem value="professional">仅专业积分</SelectItem>
              <SelectItem value="mixed">混合发放</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="启用状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="enabled">已启用</SelectItem>
              <SelectItem value="disabled">已停用</SelectItem>
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
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{total}</span> 条充值产品
            {selectedIds.length > 0 && (
              <span className="ml-2 text-primary">已选 {selectedIds.length} 项</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={selectedIds.length === 0}
              onClick={() => setBulkAction("enable")}
            >
              批量启用
            </Button>
            <Button
              variant="outline"
              disabled={selectedIds.length === 0}
              onClick={() => setBulkAction("disable")}
            >
              批量停用
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> 新增
            </Button>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={(v) => togglePage(!!v)}
                    aria-label="全选"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap">充值产品编号</TableHead>
                <TableHead>充值产品名称</TableHead>
                <TableHead className="whitespace-nowrap">目标类型</TableHead>
                <TableHead>目标对象</TableHead>
                <TableHead className="whitespace-nowrap">积分模式</TableHead>
                <TableHead className="text-right whitespace-nowrap">阶梯数</TableHead>
                <TableHead className="whitespace-nowrap">启用状态</TableHead>
                <TableHead className="whitespace-nowrap">创建时间</TableHead>
                <TableHead className="text-right whitespace-nowrap w-28">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    暂无匹配的充值产品
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((p) => (
                  <TableRow key={p.id} className="hover:bg-accent/30">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={(v) => toggleOne(p.id, !!v)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.targetType === "category" ? (
                        <Badge variant="outline" className="bg-accent/40 text-primary border-primary/20">
                          <Layers className="h-3 w-3 mr-1" /> 按产品分类
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-secondary/60 text-foreground border-border">
                          <Sparkles className="h-3 w-3 mr-1" /> 按基础产品
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{targetLabel(p)}</TableCell>
                    <TableCell>
                      {p.pointsMode === "general" ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                          <Coins className="h-3 w-3 mr-1" /> 仅通用
                        </Badge>
                      ) : p.pointsMode === "professional" ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900">
                          <Gem className="h-3 w-3 mr-1" /> 仅专业
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                          <Sparkles className="h-3 w-3 mr-1" /> 混合发放
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.tiers.length}</TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={p.enabled}
                              onClick={() => setToggleTarget(p)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                p.enabled ? "bg-primary" : "bg-input"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition-transform ${
                                  p.enabled ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{p.enabled ? "点击停用" : "点击启用"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                      {p.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditing(p);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDelTarget(p)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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

      <RechargeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        nextCode={rpCode(seq + 1)}
        categories={enabledCategories.map((c) => c.name)}
        basicProducts={enabledBasic}
        onSubmit={(values) => {
          if (editing) {
            setData((d) =>
              d.map((x) => (x.id === editing.id ? { ...x, ...values } : x)),
            );
            toast.success(`已更新 ${values.name}`);
          } else {
            const nextSeq = seq + 1;
            const id = rpCode(nextSeq);
            setData((d) => [{ id, createdAt: nowStr(), ...values }, ...d]);
            setSeq(nextSeq);
            toast.success(`已新增 ${values.name}(${id})`);
          }
          setFormOpen(false);
        }}
      />

      {/* 行内启用/停用确认 */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认{toggleTarget?.enabled ? "停用" : "启用"}该充值产品?
            </AlertDialogTitle>
            <AlertDialogDescription>
              即将{toggleTarget?.enabled ? "停用" : "启用"}{" "}
              <span className="font-medium text-foreground">{toggleTarget?.name}</span>(
              {toggleTarget?.id})。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量确认 */}
      <AlertDialog open={!!bulkAction} onOpenChange={(o) => !o && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认批量{bulkAction === "enable" ? "启用" : "停用"} {selectedIds.length} 条充值产品?
            </AlertDialogTitle>
            <AlertDialogDescription>
              该操作将同时{bulkAction === "enable" ? "启用" : "停用"}所选充值产品。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulk}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认 */}
      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该充值产品?</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 <span className="font-medium text-foreground">{delTarget?.name}</span>(
              {delTarget?.id}),此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* =============================================================
 * 新增 / 编辑 充值产品 表单
 * ============================================================= */

type FormValues = Omit<RechargeProduct, "id" | "createdAt">;

interface FormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: RechargeProduct | null;
  nextCode: string;
  categories: string[];
  basicProducts: BasicProduct[];
  onSubmit: (v: FormValues) => void;
}

const UNITS: UnitKey[] = ["次", "秒", "分", "小时", "天"];

function RechargeFormDialog({
  open,
  onOpenChange,
  editing,
  nextCode,
  categories,
  basicProducts,
  onSubmit,
}: FormProps) {
  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("category");
  const [targetKey, setTargetKey] = useState("");
  const [pointsMode, setPointsMode] = useState<PointsMode>("mixed");
  const [remark, setRemark] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([newTier()]);
  const [touched, setTouched] = useState(false);

  // 子弹窗:新增产品分类 / 新增基础产品
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatRemark, setNewCatRemark] = useState("");

  const [addBpOpen, setAddBpOpen] = useState(false);
  const [bpCat, setBpCat] = useState("");
  const [bpName, setBpName] = useState("");
  const [bpDesc, setBpDesc] = useState("");
  const [bpCash, setBpCash] = useState("");
  const [bpPoints, setBpPoints] = useState("");
  const [bpUnit, setBpUnit] = useState<UnitKey | "">("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setTargetType(editing?.targetType ?? "category");
      setTargetKey(editing?.targetKey ?? "");
      setPointsMode(editing?.pointsMode ?? "mixed");
      setRemark(editing?.remark ?? "");
      setEnabled(editing ? editing.enabled : true);
      setTiers(editing?.tiers.length ? editing.tiers : [newTier()]);
      setTouched(false);
    }
  }, [open, editing]);

  // 切换目标类型时清空目标
  const switchType = (t: TargetType) => {
    setTargetType(t);
    setTargetKey("");
  };

  const needGeneral = pointsMode === "general" || pointsMode === "mixed";
  const needPro = pointsMode === "professional" || pointsMode === "mixed";

  const tierErr = (t: Tier): string => {
    if (t.minAmount === "" || Number.isNaN(Number(t.minAmount)) || Number(t.minAmount) < 0)
      return "请输入有效起始金额";
    if (t.maxAmount === "" || Number.isNaN(Number(t.maxAmount)) || Number(t.maxAmount) <= Number(t.minAmount))
      return "止金额需大于起金额";
    if (needGeneral) {
      if (t.generalRate === "" || !/^\d+(\.\d+)?$/.test(t.generalRate) || Number(t.generalRate) <= 0)
        return "请输入有效的通用积分转换比例";
      if (t.generalBonus === "" || Number.isNaN(Number(t.generalBonus)) || Number(t.generalBonus) < 0)
        return "请输入有效的通用积分赠送比例";
    }
    if (needPro) {
      if (t.proRate === "" || !/^\d+(\.\d+)?$/.test(t.proRate) || Number(t.proRate) <= 0)
        return "请输入有效的专业积分转换比例";
      if (t.proBonus === "" || Number.isNaN(Number(t.proBonus)) || Number(t.proBonus) < 0)
        return "请输入有效的专业积分赠送比例";
    }
    return "";
  };

  const tiersError = useMemo(() => {
    if (tiers.length === 0) return "请至少配置一个阶梯";
    for (const t of tiers) {
      const e = tierErr(t);
      if (e) return e;
    }
    return "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiers, pointsMode]);

  const errors = {
    name: !name.trim() ? "请输入充值产品名称" : "",
    targetKey: !targetKey ? (targetType === "category" ? "请选择产品分类" : "请选择基础产品") : "",
    tiers: tiersError,
  };

  const submit = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    onSubmit({
      name: name.trim(),
      targetType,
      targetKey,
      pointsMode,
      remark: remark.trim(),
      enabled,
      tiers: tiers.map((t) => ({ ...t })),
    });
  };

  const updateTier = (id: string, patch: Partial<Tier>) =>
    setTiers((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTier = (id: string) => setTiers((arr) => arr.filter((t) => t.id !== id));
  const addTier = () => setTiers((arr) => [...arr, newTier()]);

  const submitNewCategory = () => {
    const v = newCatName.trim();
    if (!v) {
      toast.error("请输入产品分类名称");
      return;
    }
    const created = productCategoriesStore.add({
      name: v,
      remark: newCatRemark.slice(0, REMARK_MAX),
      enabled: true,
    });
    toast.success(`已新增分类 ${created.name}(${created.id})`);
    setTargetType("category");
    setTargetKey(created.name);
    setNewCatName("");
    setNewCatRemark("");
    setAddCatOpen(false);
  };

  const submitNewBasic = () => {
    if (!bpCat) return toast.error("请选择产品分类");
    if (!bpName.trim()) return toast.error("请输入产品名称");
    if (!bpDesc.trim()) return toast.error("请输入产品描述");
    if (bpCash === "" || Number(bpCash) < 0) return toast.error("请输入现金价值");
    if (bpPoints === "" || !/^\d+$/.test(bpPoints)) return toast.error("请输入消耗积分(非负整数)");
    if (!bpUnit) return toast.error("请选择计量单位");
    const created = basicProductsStore.add({
      category: bpCat,
      name: bpName.trim(),
      description: bpDesc.trim(),
      cashValue: Number(bpCash),
      pointsCost: Number(bpPoints),
      unit: bpUnit as UnitKey,
      enabled: true,
      appLinks: [],
    });
    toast.success(`已新增基础产品 ${created.name}(${created.id})`);
    setTargetType("basic");
    setTargetKey(created.id);
    setBpCat("");
    setBpName("");
    setBpDesc("");
    setBpCash("");
    setBpPoints("");
    setBpUnit("");
    setAddBpOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "修改充值产品" : "添加充值产品"}</DialogTitle>
          <DialogDescription>
            支持按产品分类或基础产品配置充值方案,阶梯将决定基础积分与赠送积分的换算规则。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormRow label="充值产品编号" required>
              <Input
                value={editing ? editing.id : nextCode}
                disabled
                className="font-mono bg-muted/40"
              />
            </FormRow>
            <FormRow
              label="充值产品名称"
              required
              error={touched ? errors.name : ""}
              extra={
                <span className="text-xs text-muted-foreground tabular-nums">
                  {name.length} / {NAME_MAX}
                </span>
              }
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                placeholder="请输入充值产品名称 (最长50字)"
                maxLength={NAME_MAX}
              />
            </FormRow>
          </div>

          <FormRow label="目标类型" required>
            <div className="grid grid-cols-2 gap-3">
              <TypeCard
                active={targetType === "category"}
                icon={<Layers className="h-4 w-4" />}
                title="按产品分类"
                desc="将充值方案应用至该分类下的所有基础产品"
                onClick={() => switchType("category")}
              />
              <TypeCard
                active={targetType === "basic"}
                icon={<Sparkles className="h-4 w-4" />}
                title="按基础产品"
                desc="将充值方案应用至单一基础产品"
                onClick={() => switchType("basic")}
              />
            </div>
          </FormRow>

          <FormRow
            label={targetType === "category" ? "产品分类" : "基础产品"}
            required
            error={touched ? errors.targetKey : ""}
          >
            <div className="flex items-center gap-2">
              <Select value={targetKey} onValueChange={setTargetKey}>
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      targetType === "category" ? "请选择产品分类" : "请选择基础产品"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {targetType === "category" ? (
                    categories.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">暂无可用分类</div>
                    ) : (
                      categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))
                    )
                  ) : basicProducts.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">暂无可用基础产品</div>
                  ) : (
                    basicProducts.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        targetType === "category" ? setAddCatOpen(true) : setAddBpOpen(true)
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {targetType === "category" ? "新增产品分类" : "新增基础产品"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </FormRow>

          <FormRow label="积分发放模式" required>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TypeCard
                active={pointsMode === "general"}
                icon={<Coins className="h-4 w-4" />}
                title="仅通用积分"
                desc="充值仅产生通用积分,可在全平台已启用的基础产品间通用"
                onClick={() => setPointsMode("general")}
              />
              <TypeCard
                active={pointsMode === "professional"}
                icon={<Gem className="h-4 w-4" />}
                title="仅专业积分"
                desc="充值仅产生专业积分,仅限本充值产品目标对象范围内抵扣"
                onClick={() => setPointsMode("professional")}
              />
              <TypeCard
                active={pointsMode === "mixed"}
                icon={<Sparkles className="h-4 w-4" />}
                title="混合发放"
                desc="一次充值同时产生通用积分与专业积分,运营策略更灵活"
                onClick={() => setPointsMode("mixed")}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              专业积分的使用范围跟随上方「目标对象」,无需单独设置。
            </p>
            {targetType === "basic" && pointsMode === "general" && (
              <div className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                当前充值产品销售范围被限制在单一基础产品,但发放的通用积分可在任意已启用产品使用,请确认是否符合预期。
              </div>
            )}
          </FormRow>

          <FormRow label="阶梯设置" required error={touched ? errors.tiers : ""}>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead rowSpan={2} className="w-14 align-middle">阶梯</TableHead>
                    <TableHead rowSpan={2} className="whitespace-nowrap align-middle">充值金额起(元 ≥)</TableHead>
                    <TableHead rowSpan={2} className="whitespace-nowrap align-middle">充值金额止(元 &lt;)</TableHead>
                    {needGeneral && (
                      <TableHead colSpan={2} className="text-center whitespace-nowrap border-l">
                        <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300">
                          <Coins className="h-3.5 w-3.5" /> 通用积分
                        </span>
                      </TableHead>
                    )}
                    {needPro && (
                      <TableHead colSpan={2} className="text-center whitespace-nowrap border-l">
                        <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300">
                          <Gem className="h-3.5 w-3.5" /> 专业积分
                        </span>
                      </TableHead>
                    )}
                    <TableHead rowSpan={2} className="whitespace-nowrap align-middle border-l">合计预览</TableHead>
                    <TableHead rowSpan={2} className="w-12 align-middle"></TableHead>
                  </TableRow>
                  <TableRow className="bg-muted/40">
                    {needGeneral && (
                      <>
                        <TableHead className="whitespace-nowrap border-l">转换(1元=N)</TableHead>
                        <TableHead className="whitespace-nowrap">赠送(%)</TableHead>
                      </>
                    )}
                    {needPro && (
                      <>
                        <TableHead className="whitespace-nowrap border-l">转换(1元=N)</TableHead>
                        <TableHead className="whitespace-nowrap">赠送(%)</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((t, idx) => {
                    const minA = Number(t.minAmount) || 0;
                    const maxA = Number(t.maxAmount) || 0;
                    const gRate = needGeneral ? Number(t.generalRate) || 0 : 0;
                    const gBonus = needGeneral ? Number(t.generalBonus) || 0 : 0;
                    const pRate = needPro ? Number(t.proRate) || 0 : 0;
                    const pBonus = needPro ? Number(t.proBonus) || 0 : 0;
                    const calc = (amt: number) => {
                      const gBase = Math.floor(amt * gRate);
                      const gGift = Math.floor((gBase * gBonus) / 100);
                      const pBase = Math.floor(amt * pRate);
                      const pGift = Math.floor((pBase * pBonus) / 100);
                      return { g: gBase + gGift, p: pBase + pGift, total: gBase + gGift + pBase + pGift };
                    };
                    const lo = calc(minA);
                    const hi = calc(maxA);
                    const fmt = (a: number, b: number) =>
                      a === b ? a.toLocaleString() : `${a.toLocaleString()} ~ ${b.toLocaleString()}`;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-primary">T{idx + 1}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={t.minAmount}
                            onChange={(e) => updateTier(t.id, { minAmount: e.target.value })}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={t.maxAmount}
                            onChange={(e) => updateTier(t.id, { maxAmount: e.target.value })}
                            className="w-24"
                          />
                        </TableCell>
                        {needGeneral && (
                          <>
                            <TableCell className="border-l">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={t.generalRate}
                                onChange={(e) => updateTier(t.id, { generalRate: e.target.value })}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="0.1"
                                value={t.generalBonus}
                                onChange={(e) => updateTier(t.id, { generalBonus: e.target.value })}
                                className="w-20"
                              />
                            </TableCell>
                          </>
                        )}
                        {needPro && (
                          <>
                            <TableCell className="border-l">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={t.proRate}
                                onChange={(e) => updateTier(t.id, { proRate: e.target.value })}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="0.1"
                                value={t.proBonus}
                                onChange={(e) => updateTier(t.id, { proBonus: e.target.value })}
                                className="w-20"
                              />
                            </TableCell>
                          </>
                        )}
                        <TableCell className="tabular-nums border-l">
                          <div className="flex flex-col gap-0.5 text-xs">
                            {needGeneral && (
                              <span className="text-blue-700 dark:text-blue-300">通用 {fmt(lo.g, hi.g)}</span>
                            )}
                            {needPro && (
                              <span className="text-purple-700 dark:text-purple-300">专业 {fmt(lo.p, hi.p)}</span>
                            )}
                            <span className="font-medium text-primary">合计 {fmt(lo.total, hi.total)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            disabled={tiers.length <= 1}
                            onClick={() => removeTier(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                预览根据「充值金额 × 转换比例 = 基础积分」「基础积分 × 赠送% = 赠送积分」实时计算,合计为通用与专业之和。
              </p>
              <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={addTier}>
                <Plus className="h-4 w-4" /> 添加阶梯
              </Button>
            </div>
          </FormRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormRow
              label="备注"
              extra={
                <span className="text-xs text-muted-foreground tabular-nums">
                  {remark.length} / {REMARK_MAX}
                </span>
              }
            >
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value.slice(0, REMARK_MAX))}
                rows={3}
                maxLength={REMARK_MAX}
                placeholder="选填,最多 200 个字符"
              />
            </FormRow>
            <FormRow label="启用状态">
              <div className="flex items-center gap-3 pt-1.5">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        onClick={() => setEnabled((v) => !v)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                          enabled ? "bg-primary" : "bg-input"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition-transform ${
                            enabled ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{enabled ? "点击停用" : "点击启用"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span
                  className={`text-xs font-medium ${
                    enabled ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {enabled ? "启用" : "停用"}
                </span>
              </div>
            </FormRow>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>确定</Button>
        </DialogFooter>

        {/* 子弹窗:新增产品分类 */}
        <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新增产品分类</DialogTitle>
              <DialogDescription>新增后将同步出现在「产品分类」列表与下拉中。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>产品分类编码</Label>
                <Input
                  value={productCategoriesStore.nextCode()}
                  disabled
                  className="font-mono bg-muted/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  产品分类名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="请输入产品分类名称"
                  maxLength={50}
                />
              </div>
              <div className="space-y-1.5">
                <Label>备注</Label>
                <Textarea
                  value={newCatRemark}
                  onChange={(e) => setNewCatRemark(e.target.value.slice(0, 200))}
                  rows={3}
                  maxLength={200}
                  placeholder="选填,最多 200 个字符"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddCatOpen(false)}>
                取消
              </Button>
              <Button onClick={submitNewCategory}>确定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 子弹窗:新增基础产品 */}
        <Dialog open={addBpOpen} onOpenChange={setAddBpOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新增基础产品</DialogTitle>
              <DialogDescription>新增后将同步出现在「基础产品」列表与下拉中。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <Label>产品编号</Label>
                  <Input
                    value={basicProductsStore.nextCode()}
                    disabled
                    className="font-mono bg-muted/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    产品分类 <span className="text-destructive">*</span>
                  </Label>
                  <Select value={bpCat} onValueChange={setBpCat}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择产品分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>
                  产品名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={bpName}
                  onChange={(e) => setBpName(e.target.value.slice(0, 50))}
                  placeholder="请输入产品名称 (最长50字)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  产品描述 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={bpDesc}
                  onChange={(e) => setBpDesc(e.target.value.slice(0, 200))}
                  rows={3}
                  placeholder="请输入产品描述 (最长200字)"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <Label>
                    现金价值(元) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={bpCash}
                    onChange={(e) => setBpCash(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    消耗积分 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={bpPoints}
                    onChange={(e) => setBpPoints(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    计量单位 <span className="text-destructive">*</span>
                  </Label>
                  <Select value={bpUnit} onValueChange={(v) => setBpUnit(v as UnitKey)}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddBpOpen(false)}>
                取消
              </Button>
              <Button onClick={submitNewBasic}>确定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function TypeCard({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-3 transition-all ${
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/40 hover:bg-accent/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`h-7 w-7 rounded-md flex items-center justify-center ${
            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div className="font-medium text-sm">{title}</div>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </button>
  );
}

function FormRow({
  label,
  required,
  error,
  extra,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>
          {required && <span className="text-destructive mr-0.5">*</span>}
          {label}
        </Label>
        {extra}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}