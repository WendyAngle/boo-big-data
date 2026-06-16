import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Layers,
  ChevronRight,
  Search,
  Plus,
  RotateCcw,
  Pencil,
  Trash2,
  Coins,
  Gem,
  Info,
  Trash,
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
import { useProductCategories } from "@/lib/productCategoriesStore";
import { useBasicProducts, type BasicProduct } from "@/lib/basicProductsStore";

export const Route = createFileRoute("/_app/points/products/bundles")({
  head: () => ({ meta: [{ title: "产品管理 · 套餐产品 | Boo数据平台" }] }),
  component: BundleProductsPage,
});

type ItemTargetType = "category" | "basic";
type PointsType = "general" | "professional";

interface BundleItem {
  id: string;
  targetType: ItemTargetType;
  targetKey: string;
  pointsType: PointsType;
  basePoints: string;
  bonusPoints: string;
}

interface BundleProduct {
  id: string;
  name: string;
  price: string;
  description: string;
  enabled: boolean;
  items: BundleItem[];
  createdAt: string;
}

const NAME_MAX = 50;
const DESC_MAX = 200;

function ppCode(seq: number) {
  return `PP${String(seq).padStart(8, "0")}`;
}

function nowStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function newItem(): BundleItem {
  return {
    id: Math.random().toString(36).slice(2, 9),
    targetType: "category",
    targetKey: "",
    pointsType: "general",
    basePoints: "",
    bonusPoints: "",
  };
}

const INITIAL_BUNDLES: BundleProduct[] = [
  {
    id: "PP00000008",
    name: "全域旗舰版",
    price: "29800",
    description: "覆盖内容创作、获客、视频与数据洞察的全域旗舰套餐，通用+专业积分混合发放。",
    enabled: true,
    items: [
      { id: "i1", targetType: "category", targetKey: "AI内容创作", pointsType: "general", basePoints: "50000", bonusPoints: "10000" },
      { id: "i2", targetType: "category", targetKey: "AI智能获客", pointsType: "professional", basePoints: "40000", bonusPoints: "8000" },
      { id: "i3", targetType: "basic", targetKey: "BP000043", pointsType: "professional", basePoints: "20000", bonusPoints: "4000" },
      { id: "i4", targetType: "basic", targetKey: "BP000030", pointsType: "general", basePoints: "20000", bonusPoints: "4000" },
    ],
    createdAt: "2026-03-15 10:08:11",
  },
  {
    id: "PP00000007",
    name: "拓界版",
    price: "109800",
    description: "SIS升级包+AI视频制作(30000) 等多模块组合，适合中大型团队。",
    enabled: true,
    items: [
      { id: "i1", targetType: "category", targetKey: "AI视频制作", pointsType: "general", basePoints: "30000", bonusPoints: "6000" },
      { id: "i2", targetType: "category", targetKey: "AI智能获客", pointsType: "general", basePoints: "30000", bonusPoints: "6000" },
      { id: "i3", targetType: "category", targetKey: "AI内容创作", pointsType: "professional", basePoints: "20000", bonusPoints: "2000" },
      { id: "i4", targetType: "category", targetKey: "数据洞察", pointsType: "professional", basePoints: "20000", bonusPoints: "2000" },
      { id: "i5", targetType: "basic", targetKey: "BP000043", pointsType: "professional", basePoints: "10000", bonusPoints: "100" },
    ],
    createdAt: "2026-03-14 16:37:02",
  },
  {
    id: "PP00000006",
    name: "视频专业版",
    price: "9800",
    description: "仅 AI 视频制作分类内可用的专业积分套餐。",
    enabled: true,
    items: [
      { id: "i1", targetType: "category", targetKey: "AI视频制作", pointsType: "professional", basePoints: "20000", bonusPoints: "4000" },
    ],
    createdAt: "2026-03-13 14:12:30",
  },
  {
    id: "PP00000005",
    name: "基石版",
    price: "69800",
    description: "SIS基础包+AI视频制作(10000) 入门组合，覆盖核心场景。",
    enabled: true,
    items: [
      { id: "i1", targetType: "category", targetKey: "AI视频制作", pointsType: "general", basePoints: "10000", bonusPoints: "2000" },
      { id: "i2", targetType: "category", targetKey: "AI智能获客", pointsType: "general", basePoints: "10000", bonusPoints: "2000" },
    ],
    createdAt: "2026-03-12 10:17:38",
  },
  {
    id: "PP00000004",
    name: "单品体验包·Tiktok获客",
    price: "999",
    description: "仅 Tiktok 获客单品可用的专业积分体验包。",
    enabled: false,
    items: [
      { id: "i1", targetType: "basic", targetKey: "BP000032", pointsType: "professional", basePoints: "5000", bonusPoints: "500" },
    ],
    createdAt: "2026-03-11 17:05:32",
  },
  {
    id: "PP00000003",
    name: "通用积分包·标准版",
    price: "1999",
    description: "面向全平台的通用积分，锁定 AI 图生视频销售入口。",
    enabled: true,
    items: [
      { id: "i1", targetType: "basic", targetKey: "BP000030", pointsType: "general", basePoints: "10000", bonusPoints: "1500" },
    ],
    createdAt: "2026-03-10 09:22:18",
  },
  {
    id: "PP00000002",
    name: "数据洞察季度通用包",
    price: "5999",
    description: "面向数据团队的通用积分季度包，可在全平台已启用产品消费。",
    enabled: true,
    items: [
      { id: "i1", targetType: "category", targetKey: "数据洞察", pointsType: "general", basePoints: "30000", bonusPoints: "6000" },
    ],
    createdAt: "2026-03-09 15:30:14",
  },
  {
    id: "PP00000001",
    name: "AI内容创作混合包",
    price: "3999",
    description: "AI 内容创作分类专享 + 文生图单品加成，通用+专业积分混合。",
    enabled: false,
    items: [
      { id: "i1", targetType: "category", targetKey: "AI内容创作", pointsType: "general", basePoints: "15000", bonusPoints: "3000" },
      { id: "i2", targetType: "basic", targetKey: "BP000043", pointsType: "professional", basePoints: "8000", bonusPoints: "1500" },
    ],
    createdAt: "2026-03-08 11:48:55",
  },
];

function sumPoints(items: BundleItem[]) {
  let bg = 0, bp = 0, og = 0, op = 0;
  for (const it of items) {
    const base = Number(it.basePoints) || 0;
    const bonus = Number(it.bonusPoints) || 0;
    if (it.pointsType === "general") { bg += base; og += bonus; }
    else { bp += base; op += bonus; }
  }
  return {
    baseGeneral: bg, baseProfessional: bp,
    bonusGeneral: og, bonusProfessional: op,
    totalBase: bg + bp, totalBonus: og + op,
  };
}

function getPointsKind(items: BundleItem[]): "general" | "professional" | "mixed" {
  const hasG = items.some((i) => i.pointsType === "general");
  const hasP = items.some((i) => i.pointsType === "professional");
  if (hasG && hasP) return "mixed";
  return hasG ? "general" : "professional";
}

function getTargetKind(items: BundleItem[]): "category" | "basic" | "mixed" {
  const hasC = items.some((i) => i.targetType === "category");
  const hasB = items.some((i) => i.targetType === "basic");
  if (hasC && hasB) return "mixed";
  return hasC ? "category" : "basic";
}

function BundleProductsPage() {
  const categories = useProductCategories();
  const basicProducts = useBasicProducts();
  const enabledCategories = useMemo(() => categories.filter((c) => c.enabled), [categories]);
  const enabledBasic = useMemo(() => basicProducts.filter((b) => b.enabled), [basicProducts]);

  const [data, setData] = useState<BundleProduct[]>(INITIAL_BUNDLES);
  const [seq, setSeq] = useState(8);

  const [kw, setKw] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "category" | "basic" | "mixed">("all");
  const [pointsFilter, setPointsFilter] = useState<"all" | "general" | "professional" | "mixed">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [applied, setApplied] = useState({
    kw: "",
    type: "all" as "all" | "category" | "basic" | "mixed",
    points: "all" as "all" | "general" | "professional" | "mixed",
    status: "all" as "all" | "enabled" | "disabled",
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BundleProduct | null>(null);
  const [delTarget, setDelTarget] = useState<BundleProduct | null>(null);
  const [toggleTarget, setToggleTarget] = useState<BundleProduct | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"enable" | "disable" | null>(null);

  const targetLabel = (it: BundleItem) => {
    if (it.targetType === "category") return it.targetKey;
    const bp = basicProducts.find((b) => b.id === it.targetKey);
    return bp ? bp.name : it.targetKey;
  };

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (applied.kw) {
        const k = applied.kw.toLowerCase();
        const inItems = p.items.some((it) => targetLabel(it).toLowerCase().includes(k));
        if (
          !p.name.toLowerCase().includes(k) &&
          !p.id.toLowerCase().includes(k) &&
          !inItems
        ) return false;
      }
      if (applied.type !== "all" && getTargetKind(p.items) !== applied.type) return false;
      if (applied.points !== "all" && getPointsKind(p.items) !== applied.points) return false;
      if (applied.status === "enabled" && !p.enabled) return false;
      if (applied.status === "disabled" && p.enabled) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, applied, basicProducts]);

  const total = filtered.length;
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const apply = () => {
    setApplied({ kw: kw.trim(), type: typeFilter, points: pointsFilter, status: statusFilter });
    setPage(1);
  };
  const reset = () => {
    setKw(""); setTypeFilter("all"); setPointsFilter("all"); setStatusFilter("all");
    setApplied({ kw: "", type: "all", points: "all", status: "all" });
    setPage(1);
  };

  const pageIds = pageData.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const someChecked = pageIds.some((id) => selectedIds.includes(id)) && !allChecked;
  const togglePage = (v: boolean) => {
    setSelectedIds((prev) =>
      v ? Array.from(new Set([...prev, ...pageIds]))
        : prev.filter((id) => !pageIds.includes(id)),
    );
  };
  const toggleOne = (id: string, v: boolean) =>
    setSelectedIds((prev) => (v ? [...prev, id] : prev.filter((x) => x !== id)));

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
    toast.success(`已批量${next ? "启用" : "停用"} ${selectedIds.length} 条套餐`);
    setBulkAction(null); setSelectedIds([]);
  };
  const confirmDelete = () => {
    if (!delTarget) return;
    setData((d) => d.filter((x) => x.id !== delTarget.id));
    setSelectedIds((prev) => prev.filter((id) => id !== delTarget.id));
    toast.success(`已删除 ${delTarget.name}`);
    setDelTarget(null);
  };

  const nextCode = ppCode(seq + 1);

  const onSubmit = (v: Omit<BundleProduct, "id" | "createdAt">) => {
    if (editing) {
      setData((d) => d.map((x) => (x.id === editing.id ? { ...editing, ...v } : x)));
      toast.success(`已修改 ${v.name}`);
    } else {
      const created: BundleProduct = { id: nextCode, createdAt: nowStr(), ...v };
      setData((d) => [created, ...d]);
      setSeq((s) => s + 1);
      toast.success(`已新增 ${created.name}(${created.id})`);
    }
    setFormOpen(false); setEditing(null);
  };

  const kpi = useMemo(() => {
    const enabled = data.filter((d) => d.enabled).length;
    const totalItems = data.reduce((s, d) => s + d.items.length, 0);
    const totalBase = data.reduce((s, d) => s + sumPoints(d.items).totalBase, 0);
    const totalBonus = data.reduce((s, d) => s + sumPoints(d.items).totalBonus, 0);
    return { total: data.length, enabled, totalItems, totalBase, totalBonus };
  }, [data]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>产品管理</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">套餐产品</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">套餐产品</h1>
            <p className="text-white/85 text-sm mt-0.5">
              同时支持按产品分类和按基础产品配置套餐项目，每项可单独设置积分类型（通用/专业）、基础积分与赠送积分，总积分自动汇总。
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiTile label="套餐总数" value={kpi.total} />
          <KpiTile label="已启用" value={kpi.enabled} />
          <KpiTile label="产品项总数" value={kpi.totalItems} />
          <KpiTile label="总基础积分" value={kpi.totalBase} />
          <KpiTile label="总赠送积分" value={kpi.totalBonus} accent />
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
              placeholder="请输入套餐名称/编号/包含目标"
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger><SelectValue placeholder="目标构成" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部目标构成</SelectItem>
              <SelectItem value="category">仅按产品分类</SelectItem>
              <SelectItem value="basic">仅按基础产品</SelectItem>
              <SelectItem value="mixed">分类+基础产品混合</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pointsFilter} onValueChange={(v) => setPointsFilter(v as typeof pointsFilter)}>
            <SelectTrigger><SelectValue placeholder="积分构成" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部积分构成</SelectItem>
              <SelectItem value="general">仅通用积分</SelectItem>
              <SelectItem value="professional">仅专业积分</SelectItem>
              <SelectItem value="mixed">通用+专业混合</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger><SelectValue placeholder="启用状态" /></SelectTrigger>
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
            共 <span className="font-semibold text-foreground">{total}</span> 条套餐产品
            {selectedIds.length > 0 && (
              <span className="ml-2 text-primary">已选 {selectedIds.length} 项</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={selectedIds.length === 0} onClick={() => setBulkAction("enable")}>批量启用</Button>
            <Button variant="outline" disabled={selectedIds.length === 0} onClick={() => setBulkAction("disable")}>批量停用</Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
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
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap">套餐编号</TableHead>
                <TableHead>套餐名称</TableHead>
                <TableHead className="min-w-[300px]">产品详情</TableHead>
                <TableHead className="text-right whitespace-nowrap">套餐现金价(元)</TableHead>
                <TableHead className="text-right whitespace-nowrap">总基础积分</TableHead>
                <TableHead className="text-right whitespace-nowrap">总赠送积分</TableHead>
                <TableHead className="whitespace-nowrap">状态</TableHead>
                <TableHead className="whitespace-nowrap">创建时间</TableHead>
                <TableHead className="text-right whitespace-nowrap w-28">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    暂无匹配的套餐产品
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((p) => {
                  const sums = sumPoints(p.items);
                  return (
                    <TableRow key={p.id} className="hover:bg-accent/30 align-top">
                      <TableCell className="pt-4">
                        <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={(v) => toggleOne(p.id, !!v)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs pt-4">{p.id}</TableCell>
                      <TableCell className="font-medium text-primary pt-4">{p.name}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1.5">
                          {p.items.map((it) => (
                            <ItemBadge key={it.id} item={it} label={targetLabel(it)} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium pt-4">
                        {Number(p.price).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums pt-4">
                        <div className="font-medium">{sums.totalBase.toLocaleString()}</div>
                        <PointsBreakdown g={sums.baseGeneral} p={sums.baseProfessional} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums pt-4">
                        <div className="font-medium text-emerald-600 dark:text-emerald-400">
                          +{sums.totalBonus.toLocaleString()}
                        </div>
                        <PointsBreakdown g={sums.bonusGeneral} p={sums.bonusProfessional} />
                      </TableCell>
                      <TableCell className="pt-4">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={p.enabled}
                                onClick={() => setToggleTarget(p)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${p.enabled ? "bg-primary" : "bg-input"}`}
                              >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition-transform ${p.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{p.enabled ? "点击停用" : "点击启用"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground tabular-nums pt-4">
                        {p.createdAt}
                      </TableCell>
                      <TableCell className="text-right pt-3">
                        <div className="flex justify-end gap-1">
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setFormOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>编辑</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDelTarget(p)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>删除</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4">
          <ListPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <BundleFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        editing={editing}
        nextCode={nextCode}
        categories={enabledCategories.map((c) => c.name)}
        basicProducts={enabledBasic}
        onSubmit={onSubmit}
      />

      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleTarget?.enabled ? "停用" : "启用"}套餐产品</AlertDialogTitle>
            <AlertDialogDescription>
              确认{toggleTarget?.enabled ? "停用" : "启用"} <b>{toggleTarget?.name}</b>({toggleTarget?.id}) 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkAction} onOpenChange={(o) => !o && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量{bulkAction === "enable" ? "启用" : "停用"}</AlertDialogTitle>
            <AlertDialogDescription>
              确认对已选 {selectedIds.length} 条套餐执行批量{bulkAction === "enable" ? "启用" : "停用"}操作吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulk}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除套餐产品</AlertDialogTitle>
            <AlertDialogDescription>
              删除后不可恢复，确认删除 <b>{delTarget?.name}</b>({delTarget?.id}) 吗？
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

function KpiTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/15">
      <div className="text-xs text-white/75">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-emerald-200" : ""}`}>
        {accent && value > 0 ? "+" : ""}
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function ItemBadge({ item, label }: { item: BundleItem; label: string }) {
  const isGeneral = item.pointsType === "general";
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border px-2.5 py-1.5 text-xs ${
        isGeneral
          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
          : "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900"
      }`}
    >
      <Badge
        variant="outline"
        className={`h-5 px-1.5 ${
          isGeneral
            ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800"
            : "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800"
        }`}
      >
        {isGeneral ? <Coins className="h-3 w-3 mr-0.5" /> : <Gem className="h-3 w-3 mr-0.5" />}
        {isGeneral ? "通用" : "专业"}
      </Badge>
      <span className="text-muted-foreground">
        {item.targetType === "category" ? "分类" : "产品"}
      </span>
      <span className="font-medium text-foreground">{label || "—"}</span>
      <span className="text-muted-foreground">·</span>
      <span className="tabular-nums">
        基础 <b className="text-foreground">{(Number(item.basePoints) || 0).toLocaleString()}</b>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
        赠送 +{(Number(item.bonusPoints) || 0).toLocaleString()}
      </span>
    </div>
  );
}

function PointsBreakdown({ g, p }: { g: number; p: number }) {
  if (g === 0 && p === 0) return null;
  return (
    <div className="text-[11px] text-muted-foreground mt-0.5 flex justify-end gap-2">
      {g > 0 && <span><span className="text-blue-600 dark:text-blue-400">通</span> {g.toLocaleString()}</span>}
      {p > 0 && <span><span className="text-purple-600 dark:text-purple-400">专</span> {p.toLocaleString()}</span>}
    </div>
  );
}

type FormValues = Omit<BundleProduct, "id" | "createdAt">;

interface FormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: BundleProduct | null;
  nextCode: string;
  categories: string[];
  basicProducts: BasicProduct[];
  onSubmit: (v: FormValues) => void;
}

function BundleFormDialog({ open, onOpenChange, editing, nextCode, categories, basicProducts, onSubmit }: FormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [items, setItems] = useState<BundleItem[]>([newItem()]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setPrice(editing?.price ?? "");
      setDescription(editing?.description ?? "");
      setEnabled(editing ? editing.enabled : true);
      setItems(editing?.items.length ? editing.items.map((i) => ({ ...i })) : [newItem()]);
      setTouched(false);
    }
  }, [open, editing]);

  const itemErr = (it: BundleItem): string => {
    if (!it.targetKey) return it.targetType === "category" ? "请选择产品分类" : "请选择基础产品";
    const base = Number(it.basePoints);
    const bonus = Number(it.bonusPoints);
    if (it.basePoints === "" || !/^\d+$/.test(it.basePoints) || base < 0) return "基础积分需为非负整数";
    if (it.bonusPoints === "" || !/^\d+$/.test(it.bonusPoints) || bonus < 0) return "赠送积分需为非负整数";
    if (base + bonus <= 0) return "基础积分与赠送积分不能同时为 0";
    return "";
  };

  const dupErr = useMemo(() => {
    const seen = new Set<string>();
    for (const it of items) {
      if (!it.targetKey) continue;
      const key = `${it.targetType}:${it.targetKey}:${it.pointsType}`;
      if (seen.has(key)) return "存在重复的（目标对象 + 积分类型）项，请合并";
      seen.add(key);
    }
    return "";
  }, [items]);

  const itemsError = useMemo(() => {
    if (items.length === 0) return "请至少添加一个套餐项目";
    for (const it of items) {
      const e = itemErr(it);
      if (e) return e;
    }
    return dupErr;
  }, [items, dupErr]);

  const errors = {
    name: !name.trim() ? "请输入套餐名称" : "",
    price: !price || !/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0 ? "请输入有效的套餐现金价" : "",
    items: itemsError,
  };

  const totals = useMemo(() => sumPoints(items), [items]);

  const submit = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    onSubmit({
      name: name.trim(),
      price,
      description: description.trim(),
      enabled,
      items: items.map((i) => ({ ...i })),
    });
  };

  const updateItem = (id: string, patch: Partial<BundleItem>) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setItems((arr) => arr.filter((i) => i.id !== id));
  const addRow = () => setItems((arr) => [...arr, newItem()]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "修改套餐产品" : "添加套餐产品"}</DialogTitle>
          <DialogDescription>
            支持按产品分类与基础产品混合配置，每项可单独选择积分类型（通用/专业）；总基础与总赠送积分将自动汇总。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormRow label="套餐编号" required>
              <Input value={editing ? editing.id : nextCode} disabled className="font-mono bg-muted/40" />
            </FormRow>
            <FormRow
              label="套餐名称"
              required
              error={touched ? errors.name : ""}
              extra={<span className="text-xs text-muted-foreground tabular-nums">{name.length} / {NAME_MAX}</span>}
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                placeholder="请输入套餐名称（最长50字）"
                maxLength={NAME_MAX}
              />
            </FormRow>

            <FormRow label="套餐现金价(元)" required error={touched ? errors.price : ""}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="例如：1999"
              />
            </FormRow>
            <FormRow label="启用状态">
              <div className="flex items-center gap-2 h-10">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => setEnabled((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${enabled ? "bg-primary" : "bg-input"}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm text-muted-foreground">{enabled ? "启用" : "停用"}</span>
              </div>
            </FormRow>
          </div>

          <FormRow
            label="套餐描述"
            extra={<span className="text-xs text-muted-foreground tabular-nums">{description.length} / {DESC_MAX}</span>}
          >
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              placeholder="补充说明套餐的适用场景与权益要点"
              rows={2}
              maxLength={DESC_MAX}
            />
          </FormRow>

          <FormRow label="套餐项目设置" required error={touched ? errors.items : ""}>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-14">项</TableHead>
                    <TableHead className="w-32 whitespace-nowrap">目标类型</TableHead>
                    <TableHead className="min-w-[200px]">目标对象</TableHead>
                    <TableHead className="w-32 whitespace-nowrap">积分类型</TableHead>
                    <TableHead className="w-32 whitespace-nowrap">基础积分</TableHead>
                    <TableHead className="w-32 whitespace-nowrap">赠送积分</TableHead>
                    <TableHead className="text-right whitespace-nowrap">小计</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => {
                    const sub = (Number(it.basePoints) || 0) + (Number(it.bonusPoints) || 0);
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium text-primary">#{idx + 1}</TableCell>
                        <TableCell>
                          <Select
                            value={it.targetType}
                            onValueChange={(v) => updateItem(it.id, { targetType: v as ItemTargetType, targetKey: "" })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="category">按产品分类</SelectItem>
                              <SelectItem value="basic">按基础产品</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={it.targetKey} onValueChange={(v) => updateItem(it.id, { targetKey: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder={it.targetType === "category" ? "请选择产品分类" : "请选择基础产品"} />
                            </SelectTrigger>
                            <SelectContent>
                              {it.targetType === "category" ? (
                                categories.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">暂无可用分类</div>
                                ) : (
                                  categories.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))
                                )
                              ) : basicProducts.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-muted-foreground">暂无可用基础产品</div>
                              ) : (
                                basicProducts.map((b) => (
                                  <SelectItem key={b.id} value={b.id}>{b.name} ({b.id})</SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={it.pointsType} onValueChange={(v) => updateItem(it.id, { pointsType: v as PointsType })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">通用积分</SelectItem>
                              <SelectItem value="professional">专业积分</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={it.basePoints}
                            onChange={(e) => updateItem(it.id, { basePoints: e.target.value })}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={it.bonusPoints}
                            onChange={(e) => updateItem(it.id, { bonusPoints: e.target.value })}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {sub.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={items.length === 1}
                            onClick={() => removeItem(it.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="border-t bg-muted/20 p-3">
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4" /> 添加项目
                </Button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <SumTile label="通用·基础" value={totals.baseGeneral} tone="general" />
              <SumTile label="通用·赠送" value={totals.bonusGeneral} tone="general" bonus />
              <SumTile label="专业·基础" value={totals.baseProfessional} tone="pro" />
              <SumTile label="专业·赠送" value={totals.bonusProfessional} tone="pro" bonus />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <SumTile label="总基础积分" value={totals.totalBase} highlight />
              <SumTile label="总赠送积分" value={totals.totalBonus} highlight bonus />
            </div>
            <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              「通用积分」可在全平台已启用产品消费；「专业积分」仅限该项目标对象范围内抵扣。同一（目标 + 积分类型）不可重复设置。
            </p>
          </FormRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormRow({
  label, required, error, extra, children,
}: {
  label: string; required?: boolean; error?: string; extra?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
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

function SumTile({
  label, value, tone, bonus, highlight,
}: {
  label: string; value: number; tone?: "general" | "pro"; bonus?: boolean; highlight?: boolean;
}) {
  const toneCls =
    tone === "general"
      ? "border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900"
      : tone === "pro"
      ? "border-purple-200 bg-purple-50/60 dark:bg-purple-950/20 dark:border-purple-900"
      : "border-primary/30 bg-primary/5";
  return (
    <div className={`rounded-lg border px-3 py-2 ${highlight ? "bg-primary/5 border-primary/30" : toneCls}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums ${bonus ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
        {bonus && value > 0 ? "+" : ""}
        {value.toLocaleString()}
      </div>
    </div>
  );
}