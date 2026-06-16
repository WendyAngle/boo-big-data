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
  Trash,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ProductMultiPicker,
  productSelLabel,
  type ProductSel,
} from "@/components/ProductMultiPicker";

export const Route = createFileRoute("/_app/points/products/bundles")({
  head: () => ({ meta: [{ title: "产品管理 · 套餐产品 | Boo数据平台" }] }),
  component: BundleProductsPage,
});

interface BundleItem {
  id: string;
  products: ProductSel[];   // 分级多选：分类或基础产品
  basePoints: string;       // 初始基础积分
  bonusPoints: string;      // 初始赠送积分
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

const ppCode = (n: number) => `PP${String(n).padStart(6, "0")}`;
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const newItem = (): BundleItem => ({
  id: Math.random().toString(36).slice(2, 9),
  products: [],
  basePoints: "",
  bonusPoints: "",
});

const INITIAL: BundleProduct[] = [
  {
    id: "PP000030",
    name: "test",
    price: "11",
    description: "11",
    enabled: true,
    items: [
      { id: "i1", products: [{ type: "category", key: "AI视频制作" }], basePoints: "10", bonusPoints: "10" },
    ],
    createdAt: "2026-03-11 17:05:32",
  },
  {
    id: "PP000024",
    name: "拓界版",
    price: "109800",
    description: "SIS升级包+AI视频制作(30000) 等多模块组合，适合中大型团队。",
    enabled: true,
    items: [
      { id: "i1", products: [{ type: "category", key: "AI视频制作" }], basePoints: "30000", bonusPoints: "6000" },
      { id: "i2", products: [{ type: "category", key: "AI智能获客" }], basePoints: "30000", bonusPoints: "6000" },
      { id: "i3", products: [{ type: "basic", key: "BP000043" }], basePoints: "20000", bonusPoints: "2000" },
      { id: "i4", products: [{ type: "basic", key: "BP000030" }, { type: "basic", key: "BP000028" }], basePoints: "20000", bonusPoints: "2000" },
      { id: "i5", products: [{ type: "basic", key: "BP000032" }], basePoints: "10000", bonusPoints: "100" },
    ],
    createdAt: "2026-03-10 16:37:02",
  },
  {
    id: "PP000005",
    name: "基石版",
    price: "69800",
    description: "SIS基础包+AI视频制作(10000) 入门组合，覆盖核心场景。",
    enabled: true,
    items: [
      { id: "i1", products: [{ type: "category", key: "AI视频制作" }], basePoints: "10000", bonusPoints: "2000" },
      { id: "i2", products: [{ type: "category", key: "AI智能获客" }], basePoints: "10000", bonusPoints: "2000" },
    ],
    createdAt: "2026-03-09 10:17:38",
  },
];

function sumPoints(items: BundleItem[]) {
  let base = 0, bonus = 0;
  for (const it of items) {
    base += Number(it.basePoints) || 0;
    bonus += Number(it.bonusPoints) || 0;
  }
  return { totalBase: base, totalBonus: bonus };
}

function BundleProductsPage() {
  const categories = useProductCategories();
  const basicProducts = useBasicProducts();
  const enabledCategories = useMemo(() => categories.filter((c) => c.enabled).map((c) => c.name), [categories]);
  const enabledBasic = useMemo(() => basicProducts.filter((b) => b.enabled), [basicProducts]);

  const [data, setData] = useState<BundleProduct[]>(INITIAL);
  const [seq, setSeq] = useState(30);

  const [kw, setKw] = useState("");
  const [applied, setApplied] = useState({ kw: "" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BundleProduct | null>(null);
  const [delTarget, setDelTarget] = useState<BundleProduct | null>(null);
  const [toggleTarget, setToggleTarget] = useState<BundleProduct | null>(null);

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (applied.kw) {
        const k = applied.kw.toLowerCase();
        if (!p.name.toLowerCase().includes(k) && !p.id.toLowerCase().includes(k)) return false;
      }
      return true;
    });
  }, [data, applied]);

  const total = filtered.length;
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const apply = () => { setApplied({ kw: kw.trim() }); setPage(1); };
  const reset = () => { setKw(""); setApplied({ kw: "" }); setPage(1); };

  const confirmToggle = () => {
    if (!toggleTarget) return;
    const next = !toggleTarget.enabled;
    setData((d) => d.map((x) => (x.id === toggleTarget.id ? { ...x, enabled: next } : x)));
    toast.success(`已${next ? "启用" : "停用"} ${toggleTarget.name}`);
    setToggleTarget(null);
  };
  const confirmDelete = () => {
    if (!delTarget) return;
    setData((d) => d.filter((x) => x.id !== delTarget.id));
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
    setFormOpen(false);
    setEditing(null);
  };

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
              组合产品分类与基础产品，配置初始基础积分与赠送积分，按套餐统一售卖
            </p>
          </div>
        </div>
      </section>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="请输入套餐名称/套餐编号"
              className="pl-9"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> 重置
            </Button>
            <Button onClick={apply}>
              <Search className="h-4 w-4" /> 查询
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{total}</span> 条套餐产品
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> 新增
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="whitespace-nowrap">套餐编号</TableHead>
                <TableHead className="whitespace-nowrap">套餐名称</TableHead>
                <TableHead className="min-w-[280px]">产品详情</TableHead>
                <TableHead className="min-w-[160px]">套餐描述</TableHead>
                <TableHead className="text-right whitespace-nowrap">套餐现金价</TableHead>
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
                      <TableCell className="font-mono text-xs pt-4">{p.id}</TableCell>
                      <TableCell className="font-medium text-primary pt-4">{p.name}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1.5">
                          {p.items.flatMap((it) => {
                            const base = Number(it.basePoints) || 0;
                            const bonus = Number(it.bonusPoints) || 0;
                            return it.products.map((sel) => (
                              <div
                                key={`${it.id}:${sel.type}:${sel.key}`}
                                className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs leading-relaxed"
                              >
                                <span className="font-medium text-foreground">
                                  {productSelLabel(sel, basicProducts)}
                                </span>
                                <span className="text-muted-foreground"> -- 基础积分: </span>
                                <span className="tabular-nums">{base.toLocaleString()}</span>
                                <span className="text-muted-foreground"> -- 赠送积分: </span>
                                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                                  {bonus.toLocaleString()}
                                </span>
                              </div>
                            ));
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm pt-4 max-w-[220px]">
                        <div className="line-clamp-2" title={p.description}>{p.description || "—"}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium pt-4">
                        {Number(p.price).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium pt-4">
                        {sums.totalBase.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium pt-4">
                        +{sums.totalBonus.toLocaleString()}
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
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setFormOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDelTarget(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      <BundleFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        editing={editing}
        nextCode={nextCode}
        categories={enabledCategories}
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

/* =====================  新增 / 编辑  ===================== */

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
      setItems(
        editing?.items.length
          ? editing.items.map((i) => ({ ...i, products: [...i.products] }))
          : [newItem()],
      );
      setTouched(false);
    }
  }, [open, editing]);

  const itemErr = (it: BundleItem): string => {
    if (it.products.length === 0) return "请选择产品";
    if (it.basePoints === "" || !/^\d+$/.test(it.basePoints) || Number(it.basePoints) < 0)
      return "基础积分需为非负整数";
    if (it.bonusPoints === "" || !/^\d+$/.test(it.bonusPoints) || Number(it.bonusPoints) < 0)
      return "赠送积分需为非负整数";
    if (Number(it.basePoints) + Number(it.bonusPoints) <= 0)
      return "基础积分与赠送积分不能同时为 0";
    return "";
  };

  const itemsError = useMemo(() => {
    if (items.length === 0) return "请至少添加一个服务项";
    for (const it of items) {
      const e = itemErr(it);
      if (e) return e;
    }
    return "";
  }, [items]);

  // 同分类与其下基础产品同时出现 → 叠加提示（不阻止保存）
  const overlapConflicts = useMemo(() => {
    const list: { category: string; productName: string; productId: string }[] = [];
    const catKeys = new Set<string>();
    items.forEach((it) => it.products.forEach((p) => p.type === "category" && catKeys.add(p.key)));
    items.forEach((it) =>
      it.products.forEach((p) => {
        if (p.type === "basic") {
          const bp = basicProducts.find((b) => b.id === p.key);
          if (bp && catKeys.has(bp.category)) {
            list.push({ category: bp.category, productName: bp.name, productId: bp.id });
          }
        }
      }),
    );
    return list;
  }, [items, basicProducts]);

  const errors = {
    name: !name.trim() ? "请输入套餐名称" : "",
    price: !price || !/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0 ? "请输入有效的套餐现金价" : "",
    items: itemsError,
    description: !description.trim() ? "请输入套餐描述" : "",
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
      items: items.map((i) => ({ ...i, products: [...i.products] })),
    });
  };

  const updateItem = (id: string, patch: Partial<BundleItem>) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeRow = (id: string) => setItems((arr) => arr.filter((i) => i.id !== id));
  const addRow = () => setItems((arr) => [...arr, newItem()]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "修改套餐产品" : "增加套餐产品"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormRow label="套餐编号">
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
                placeholder="请输入套餐名称"
                maxLength={NAME_MAX}
              />
            </FormRow>
          </div>

          <FormRow label="套餐产品信息" required error={touched ? errors.items : ""}>
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-md border bg-background p-3 space-y-2"
                >
                  <ProductMultiPicker
                    categories={categories}
                    basicProducts={basicProducts.map((b) => ({ id: b.id, name: b.name, category: b.category }))}
                    value={it.products}
                    onChange={(v) => updateItem(it.id, { products: v })}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">初始基础积分</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={it.basePoints}
                        onChange={(e) => updateItem(it.id, { basePoints: e.target.value.replace(/[^0-9]/g, "") })}
                        placeholder="请输入基础积分"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">初始赠送积分</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={it.bonusPoints}
                        onChange={(e) => updateItem(it.id, { bonusPoints: e.target.value.replace(/[^0-9]/g, "") })}
                        placeholder="请输入赠送积分"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      disabled={items.length === 1}
                      onClick={() => removeRow(it.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="default"
                className="w-full"
                onClick={addRow}
              >
                <Plus className="h-4 w-4" /> 添加服务项
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <SumTile label="总基础积分" value={totals.totalBase} />
              <SumTile label="总赠送积分" value={totals.totalBonus} bonus />
            </div>

            {overlapConflicts.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/60 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1 text-xs">
                    <div className="font-medium text-amber-800 dark:text-amber-300">
                      检测到分类与其下基础产品同时出现，将形成叠加发放
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-amber-700 dark:text-amber-400/90">
                      {overlapConflicts.map((c, i) => (
                        <li key={i}>
                          分类「{c.category}」 与 基础产品「{c.productName}（{c.productId}）」
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </FormRow>

          <FormRow
            label="套餐描述"
            required
            error={touched ? errors.description : ""}
            extra={<span className="text-xs text-muted-foreground tabular-nums">{description.length} / {DESC_MAX}</span>}
          >
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              placeholder="请输入套餐描述"
              rows={3}
              maxLength={DESC_MAX}
            />
          </FormRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormRow label="套餐现金价" required error={touched ? errors.price : ""}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="请输入套餐现金价"
                  className="pl-7"
                />
              </div>
            </FormRow>
            <FormRow label="状态">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit}>确定</Button>
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

function SumTile({ label, value, bonus }: { label: string; value: number; bonus?: boolean }) {
  return (
    <div className="rounded-lg border bg-primary/5 border-primary/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums ${bonus ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
        {bonus && value > 0 ? "+" : ""}
        {value.toLocaleString()}
      </div>
    </div>
  );
}
