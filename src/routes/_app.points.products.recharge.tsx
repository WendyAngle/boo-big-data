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
  ChevronDown,
  X,
  Check,
  Layers,
  Box,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListPagination } from "@/components/ListPagination";
import { toast } from "sonner";
import { useProductCategories } from "@/lib/productCategoriesStore";
import { useBasicProducts } from "@/lib/basicProductsStore";

export const Route = createFileRoute("/_app/points/products/recharge")({
  head: () => ({ meta: [{ title: "产品管理 · 充值产品 | Boo数据平台" }] }),
  component: RechargeProductsPage,
});

// 选择项：整个分类 或 单个基础产品
export type ProductSel =
  | { type: "category"; key: string }
  | { type: "basic"; key: string }; // key = basicId

interface RechargeProduct {
  id: string;
  products: ProductSel[];
  tierAmount: number;        // 阶梯值(元)
  baseRate: number;          // 基础积分转化比例 (%)
  bonusRate: number;         // 积分赠送比例 (%)
  description: string;       // 阶梯描述
  enabled: boolean;
  createdAt: string;
}

const DESC_MAX = 200;

const rpCode = (n: number) => `RP${String(n).padStart(6, "0")}`;
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const INITIAL: RechargeProduct[] = [
  { id: "RP000008", products: [{ type: "category", key: "AI视频制作" }], tierAmount: 1000, baseRate: 1000, bonusRate: 10, description: "充值满 1000 元赠送 10% 积分", enabled: true, createdAt: "2026-03-13 17:17:46" },
  { id: "RP000007", products: [{ type: "category", key: "AI智能获客" }], tierAmount: 2000, baseRate: 1000, bonusRate: 15, description: "充值满 2000 元赠送 15% 积分", enabled: true, createdAt: "2026-03-13 17:16:38" },
  { id: "RP000006", products: [{ type: "category", key: "AI视频制作" }, { type: "category", key: "AI智能获客" }], tierAmount: 5000, baseRate: 1000, bonusRate: 30, description: "大额充值 5000 元赠送 30% 积分", enabled: true, createdAt: "2026-03-13 17:16:08" },
  { id: "RP000005", products: [{ type: "basic", key: "BP000043" }], tierAmount: 100, baseRate: 2000, bonusRate: 10, description: "AI文生图 体验充值 100 元", enabled: true, createdAt: "2026-03-13 16:58:19" },
  { id: "RP000004", products: [{ type: "basic", key: "BP000030" }, { type: "basic", key: "BP000028" }], tierAmount: 500, baseRate: 1000, bonusRate: 5, description: "视频套餐 500 元充值包", enabled: true, createdAt: "2026-03-11 17:04:12" },
  { id: "RP000003", products: [{ type: "basic", key: "BP000032" }], tierAmount: 200, baseRate: 1000, bonusRate: 0, description: "Tiktok获客 基础充值包", enabled: true, createdAt: "2026-03-11 16:25:57" },
  { id: "RP000002", products: [{ type: "category", key: "AI视频制作" }], tierAmount: 3000, baseRate: 1000, bonusRate: 20, description: "充值满 3000 元赠送 20% 积分", enabled: false, createdAt: "2026-03-10 16:26:50" },
  { id: "RP000001", products: [{ type: "category", key: "AI智能获客" }], tierAmount: 10000, baseRate: 1000, bonusRate: 35, description: "VIP充值 10000 元赠送 35% 积分", enabled: true, createdAt: "2026-03-09 10:15:51" },
];

const calcBase = (amt: number, rate: number) => Math.floor((amt * rate) / 100);
const calcGift = (base: number, bonus: number) => Math.floor((base * bonus) / 100);

function RechargeProductsPage() {
  const categories = useProductCategories();
  const basicProducts = useBasicProducts();

  const [data, setData] = useState<RechargeProduct[]>(INITIAL);
  const [seq, setSeq] = useState(8);

  const [kw, setKw] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [applied, setApplied] = useState({ kw: "", cat: "all" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RechargeProduct | null>(null);
  const [delTarget, setDelTarget] = useState<RechargeProduct | null>(null);
  const [toggleTarget, setToggleTarget] = useState<RechargeProduct | null>(null);

  // 把 selection 解析为该记录涉及的分类集合（用于筛选/显示「产品分类」列）
  const recordCategories = (p: RechargeProduct): string[] => {
    const set = new Set<string>();
    p.products.forEach((s) => {
      if (s.type === "category") set.add(s.key);
      else {
        const bp = basicProducts.find((b) => b.id === s.key);
        if (bp) set.add(bp.category);
      }
    });
    return Array.from(set);
  };

  const productLabels = (p: RechargeProduct): { key: string; label: string; isCategory: boolean }[] =>
    p.products.map((s) => {
      if (s.type === "category") return { key: `c:${s.key}`, label: s.key, isCategory: true };
      const bp = basicProducts.find((b) => b.id === s.key);
      return { key: `b:${s.key}`, label: bp ? `${bp.category} / ${bp.name}` : s.key, isCategory: false };
    });

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (applied.kw) {
        const k = applied.kw.toLowerCase();
        if (
          !p.id.toLowerCase().includes(k) &&
          String(p.tierAmount).indexOf(applied.kw) === -1 &&
          !p.description.toLowerCase().includes(k)
        )
          return false;
      }
      if (applied.cat !== "all" && !recordCategories(p).includes(applied.cat)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, applied, basicProducts]);

  const total = filtered.length;
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const apply = () => {
    setApplied({ kw: kw.trim(), cat: catFilter });
    setPage(1);
  };
  const reset = () => {
    setKw("");
    setCatFilter("all");
    setApplied({ kw: "", cat: "all" });
    setPage(1);
  };

  const confirmToggle = () => {
    if (!toggleTarget) return;
    const next = !toggleTarget.enabled;
    setData((d) => d.map((x) => (x.id === toggleTarget.id ? { ...x, enabled: next } : x)));
    toast.success(`已${next ? "启用" : "停用"} ${toggleTarget.id}`);
    setToggleTarget(null);
  };

  const confirmDelete = () => {
    if (!delTarget) return;
    setData((d) => d.filter((x) => x.id !== delTarget.id));
    toast.success(`已删除 ${delTarget.id}`);
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
              按阶梯配置充值方案，自动换算基础积分与赠送积分
            </p>
          </div>
        </div>
      </section>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="请输入产品阶梯值/编号"
              className="pl-9"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger>
              <SelectValue placeholder="请选择产品分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部产品分类</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            共 <span className="font-semibold text-foreground">{total}</span> 条充值产品
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> 新增
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="whitespace-nowrap">产品编号</TableHead>
                <TableHead>产品</TableHead>
                <TableHead className="whitespace-nowrap">阶梯值(元)</TableHead>
                <TableHead className="whitespace-nowrap">基础积分转化比例</TableHead>
                <TableHead className="whitespace-nowrap">积分赠送比例</TableHead>
                <TableHead>阶梯描述</TableHead>
                <TableHead className="text-right whitespace-nowrap">基础积分</TableHead>
                <TableHead className="text-right whitespace-nowrap">赠送积分</TableHead>
                <TableHead className="whitespace-nowrap">状态</TableHead>
                <TableHead className="whitespace-nowrap">创建时间</TableHead>
                <TableHead className="text-right whitespace-nowrap w-28">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    暂无匹配的充值产品
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((p) => {
                  const base = calcBase(p.tierAmount, p.baseRate);
                  const gift = calcGift(base, p.bonusRate);
                  const labels = productLabels(p);
                  return (
                    <TableRow key={p.id} className="hover:bg-accent/30">
                      <TableCell className="font-mono text-xs">{p.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {labels.map((l) => (
                            <Badge
                              key={l.key}
                              variant="outline"
                              className={
                                l.isCategory
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                              }
                            >
                              {l.isCategory ? <Layers className="h-3 w-3 mr-1" /> : <Box className="h-3 w-3 mr-1" />}
                              {l.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{p.tierAmount.toLocaleString()} 元充值包</TableCell>
                      <TableCell className="tabular-nums">{p.baseRate}%</TableCell>
                      <TableCell className="tabular-nums">{p.bonusRate}%</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={p.description}>
                        {p.description || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{base.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 font-medium">
                        +{gift.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={p.enabled}
                                onClick={() => setToggleTarget(p)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                                  p.enabled ? "bg-primary" : "bg-input"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${
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

      <RechargeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        nextCode={rpCode(seq + 1)}
        onSubmit={(values) => {
          if (editing) {
            setData((d) => d.map((x) => (x.id === editing.id ? { ...x, ...values } : x)));
            toast.success(`已更新 ${editing.id}`);
          } else {
            const nextSeq = seq + 1;
            const id = rpCode(nextSeq);
            setData((d) => [{ id, createdAt: nowStr(), ...values }, ...d]);
            setSeq(nextSeq);
            toast.success(`已新增 ${id}`);
          }
          setFormOpen(false);
        }}
      />

      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认{toggleTarget?.enabled ? "停用" : "启用"}该充值产品?
            </AlertDialogTitle>
            <AlertDialogDescription>
              即将{toggleTarget?.enabled ? "停用" : "启用"}{" "}
              <span className="font-medium text-foreground">{toggleTarget?.id}</span>。
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
            <AlertDialogTitle>确认删除该充值产品?</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 <span className="font-medium text-foreground">{delTarget?.id}</span>,此操作不可撤销。
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

type FormValues = Omit<RechargeProduct, "id" | "createdAt">;

interface FormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: RechargeProduct | null;
  nextCode: string;
  onSubmit: (v: FormValues) => void;
}

function RechargeFormDialog({ open, onOpenChange, editing, nextCode, onSubmit }: FormProps) {
  const categories = useProductCategories();
  const basicProducts = useBasicProducts();

  const [products, setProducts] = useState<ProductSel[]>([]);
  const [tierAmount, setTierAmount] = useState("");
  const [baseRate, setBaseRate] = useState("100");
  const [bonusRate, setBonusRate] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setProducts(editing?.products ?? []);
      setTierAmount(editing ? String(editing.tierAmount) : "");
      setBaseRate(editing ? String(editing.baseRate) : "100");
      setBonusRate(editing ? String(editing.bonusRate) : "");
      setDescription(editing?.description ?? "");
      setEnabled(editing ? editing.enabled : true);
      setTouched(false);
    }
  }, [open, editing]);

  const amt = Number(tierAmount) || 0;
  const rate = Number(baseRate) || 0;
  const bonus = Number(bonusRate) || 0;
  const basePoints = calcBase(amt, rate);
  const giftPoints = calcGift(basePoints, bonus);

  const errors = {
    products: products.length === 0 ? "请选择产品" : "",
    tierAmount:
      tierAmount === "" || !/^\d+(\.\d+)?$/.test(tierAmount) || Number(tierAmount) <= 0
        ? "请输入有效的阶梯值"
        : "",
    baseRate:
      baseRate === "" || !/^\d+(\.\d+)?$/.test(baseRate) || Number(baseRate) <= 0
        ? "请输入有效的转化比例"
        : "",
    bonusRate:
      bonusRate === "" || Number.isNaN(Number(bonusRate)) || Number(bonusRate) < 0
        ? "请输入有效的赠送比例"
        : "",
    description: !description.trim() ? "请输入阶梯描述" : "",
  };

  const submit = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    onSubmit({
      products,
      tierAmount: Number(tierAmount),
      baseRate: Number(baseRate),
      bonusRate: Number(bonusRate),
      description: description.trim(),
      enabled,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? "修改充值产品" : "增加充值产品"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-2">
          <Field label="产品编号" required>
            <Input value={editing ? editing.id : nextCode} disabled className="font-mono bg-muted/40" />
          </Field>

          <Field label="产品" required error={touched ? errors.products : ""}>
            <ProductMultiPicker
              categories={categories.filter((c) => c.enabled).map((c) => c.name)}
              basicProducts={basicProducts.filter((b) => b.enabled)}
              value={products}
              onChange={setProducts}
            />
          </Field>

          <Field label="阶梯值(元)" required error={touched ? errors.tierAmount : ""}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={tierAmount}
              onChange={(e) => setTierAmount(e.target.value)}
              placeholder="请输入阶梯值"
            />
          </Field>

          <Field label="基础积分转化比例" required error={touched ? errors.baseRate : ""}>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </Field>

          <Field label="基础积分">
            <Input value={basePoints ? basePoints.toLocaleString() : ""} placeholder="自动计算" disabled className="bg-muted/40" />
          </Field>

          <Field label="积分赠送比例" required error={touched ? errors.bonusRate : ""}>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step="0.1"
                value={bonusRate}
                onChange={(e) => setBonusRate(e.target.value)}
                placeholder="请输入"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </Field>

          <Field label="赠送积分">
            <Input value={giftPoints ? `+${giftPoints.toLocaleString()}` : ""} placeholder="自动计算" disabled className="bg-muted/40" />
          </Field>

          <Field label="产品状态">
            <div className="flex items-center gap-3 pt-1.5">
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
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${
                    enabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className={`text-xs font-medium ${enabled ? "text-primary" : "text-muted-foreground"}`}>
                {enabled ? "启用" : "停用"}
              </span>
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field
              label="阶梯描述"
              required
              error={touched ? errors.description : ""}
              extra={
                <span className="text-xs text-muted-foreground tabular-nums">
                  {description.length} / {DESC_MAX}
                </span>
              }
            >
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                rows={3}
                maxLength={DESC_MAX}
                placeholder="请输入阶梯描述，例如：充值满2000元赠送2%积分"
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =============  产品 分级多选下拉  ============= */

interface PickerProps {
  categories: string[];
  basicProducts: { id: string; name: string; category: string }[];
  value: ProductSel[];
  onChange: (v: ProductSel[]) => void;
}

function ProductMultiPicker({ categories, basicProducts, value, onChange }: PickerProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [kw, setKw] = useState("");

  const grouped = useMemo(() => {
    return categories.map((c) => ({
      name: c,
      items: basicProducts.filter((b) => b.category === c),
    }));
  }, [categories, basicProducts]);

  const isCatChecked = (c: string) => value.some((v) => v.type === "category" && v.key === c);
  const isBasicChecked = (id: string) => value.some((v) => v.type === "basic" && v.key === id);

  const toggleCat = (c: string) => {
    if (isCatChecked(c)) {
      onChange(value.filter((v) => !(v.type === "category" && v.key === c)));
    } else {
      // 选整个分类时清理同分类下零散选中的基础产品
      const remain = value.filter((v) => {
        if (v.type === "category") return v.key !== c;
        const bp = basicProducts.find((b) => b.id === v.key);
        return bp?.category !== c;
      });
      onChange([...remain, { type: "category", key: c }]);
    }
  };
  const toggleBasic = (id: string, category: string) => {
    if (isBasicChecked(id)) {
      onChange(value.filter((v) => !(v.type === "basic" && v.key === id)));
    } else {
      // 选具体产品时移除该分类的整选
      const remain = value.filter((v) => !(v.type === "category" && v.key === category));
      onChange([...remain, { type: "basic", key: id }]);
    }
  };
  const removeItem = (sel: ProductSel) => {
    onChange(value.filter((v) => !(v.type === sel.type && v.key === sel.key)));
  };

  const k = kw.trim().toLowerCase();
  const visibleGroups = grouped
    .map((g) => ({
      ...g,
      items: k
        ? g.items.filter((b) => b.name.toLowerCase().includes(k) || b.id.toLowerCase().includes(k))
        : g.items,
      matchCat: !k || g.name.toLowerCase().includes(k),
    }))
    .filter((g) => g.matchCat || g.items.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full min-h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:border-primary/50 transition-colors"
        >
          <div className="flex-1 flex flex-wrap gap-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">请选择产品（支持多选）</span>
            ) : (
              value.map((v) => {
                const label =
                  v.type === "category"
                    ? v.key
                    : (() => {
                        const bp = basicProducts.find((b) => b.id === v.key);
                        return bp ? `${bp.category} / ${bp.name}` : v.key;
                      })();
                return (
                  <Badge
                    key={`${v.type}:${v.key}`}
                    variant="outline"
                    className={
                      v.type === "category"
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                    }
                  >
                    {v.type === "category" ? <Layers className="h-3 w-3 mr-1" /> : <Box className="h-3 w-3 mr-1" />}
                    {label}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(v);
                      }}
                      className="ml-1 -mr-0.5 rounded hover:bg-black/10 inline-flex"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                );
              })
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="搜索分类或基础产品"
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {visibleGroups.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">未找到匹配项</div>
          ) : (
            visibleGroups.map((g) => {
              const catChecked = isCatChecked(g.name);
              const isExp = expanded[g.name] ?? true;
              return (
                <div key={g.name} className="px-1">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50">
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => ({ ...s, [g.name]: !isExp }))}
                      className="p-0.5 rounded hover:bg-accent"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExp ? "" : "-rotate-90"}`} />
                    </button>
                    <Checkbox checked={catChecked} onCheckedChange={() => toggleCat(g.name)} />
                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-sm font-medium flex-1">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{g.items.length}</span>
                  </div>
                  {isExp && g.items.length > 0 && (
                    <div className="ml-7 border-l border-border/60 pl-2 space-y-0.5 pb-1">
                      {g.items.map((b) => {
                        const checked = catChecked || isBasicChecked(b.id);
                        return (
                          <label
                            key={b.id}
                            className={`flex items-center gap-2 px-2 py-1 rounded text-sm hover:bg-accent/50 ${
                              catChecked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={catChecked}
                              onCheckedChange={() => toggleBasic(b.id, b.category)}
                            />
                            <Box className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="flex-1">{b.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{b.id}</span>
                            {checked && <Check className="h-3.5 w-3.5 text-primary" />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
          <span className="text-muted-foreground">已选 {value.length} 项</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange([])}
              disabled={value.length === 0}
            >
              清空
            </Button>
            <Button type="button" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
              完成
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Field({
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
