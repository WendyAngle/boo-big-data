import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Box,
  ChevronRight,
  Search,
  Plus,
  RotateCcw,
  Pencil,
  Trash2,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ListPagination } from "@/components/ListPagination";
import { toast } from "sonner";
import { productCategoriesStore, useProductCategories } from "@/lib/productCategoriesStore";

export const Route = createFileRoute("/_app/points/products/basic")({
  head: () => ({ meta: [{ title: "产品管理 · 基础产品 | Boo数据平台" }] }),
  component: BasicProductsPage,
});

type UnitKey = "次" | "秒" | "分" | "小时" | "天";
const UNITS: UnitKey[] = ["次", "秒", "分", "小时", "天"];

// 关联应用 mock 列表(与"应用管理"一致)
const APP_OPTIONS = ["AI视频生成", "SIS", "AIMedia", "Hub"];

interface AppLink {
  app: string;
  serviceCode: string;
}

interface BasicProduct {
  id: string; // BP000001+
  category: string; // 产品分类名称
  name: string;
  description: string;
  cashValue: number;
  pointsCost: number;
  unit: UnitKey;
  enabled: boolean;
  appLinks: AppLink[];
  createdAt: string;
}

const DESC_MAX = 200;
const NAME_MAX = 50;

function genCode(seq: number) {
  return `BP${String(seq).padStart(6, "0")}`;
}

const INITIAL: BasicProduct[] = [
  {
    id: "BP000058",
    category: "AI视频制作",
    name: "ggg",
    description: "ggg",
    cashValue: 1,
    pointsCost: 10,
    unit: "次",
    enabled: false,
    appLinks: [],
    createdAt: "2026-03-11 17:01:50",
  },
  {
    id: "BP000052",
    category: "AI客服助手",
    name: "ggg",
    description: "gege",
    cashValue: 0,
    pointsCost: 222,
    unit: "次",
    enabled: false,
    appLinks: [],
    createdAt: "2026-03-11 10:20:45",
  },
  {
    id: "BP000043",
    category: "AI视频制作",
    name: "AI文生图",
    description: "文生图",
    cashValue: 1,
    pointsCost: 20,
    unit: "秒",
    enabled: true,
    appLinks: [
      { app: "SIS", serviceCode: "SIS46818" },
      { app: "AI视频生成", serviceCode: "AG497554" },
    ],
    createdAt: "2026-03-10 15:43:27",
  },
  {
    id: "BP000032",
    category: "AI智能获客",
    name: "Tiktok获客",
    description: "获取tiktok账号",
    cashValue: 2,
    pointsCost: 20,
    unit: "次",
    enabled: true,
    appLinks: [],
    createdAt: "2026-03-09 10:12:42",
  },
  {
    id: "BP000030",
    category: "AI视频制作",
    name: "AI图生视频",
    description: "图生数字人视频",
    cashValue: 1,
    pointsCost: 10,
    unit: "秒",
    enabled: true,
    appLinks: [],
    createdAt: "2026-03-09 10:11:15",
  },
  {
    id: "BP000028",
    category: "AI视频制作",
    name: "AI视频消除",
    description: "消除字幕、水印等",
    cashValue: 1,
    pointsCost: 10,
    unit: "分",
    enabled: true,
    appLinks: [],
    createdAt: "2026-03-09 10:02:14",
  },
];

function BasicProductsPage() {
  const categories = useProductCategories();
  const enabledCategories = useMemo(() => categories.filter((c) => c.enabled), [categories]);

  const [data, setData] = useState<BasicProduct[]>(INITIAL);
  const [seq, setSeq] = useState(58);

  const [kw, setKw] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [applied, setApplied] = useState({ kw: "", cat: "all" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BasicProduct | null>(null);
  const [delTarget, setDelTarget] = useState<BasicProduct | null>(null);

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (applied.kw) {
        const k = applied.kw.toLowerCase();
        if (!(p.name.toLowerCase().includes(k) || p.id.toLowerCase().includes(k))) return false;
      }
      if (applied.cat !== "all" && p.category !== applied.cat) return false;
      return true;
    });
  }, [data, applied]);
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

  const toggleEnabled = (p: BasicProduct) => {
    setData((d) => d.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)));
    toast.success(`已${p.enabled ? "停用" : "启用"} ${p.name}`);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>产品管理</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">基础产品</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">基础产品</h1>
            <p className="text-white/85 text-sm mt-0.5">
              维护可用于计费与积分扣减的基础产品,产品编号以 BP 开头由系统自动生成
            </p>
          </div>
        </div>
      </section>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="请输入产品名称/编码"
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
            共 <span className="font-semibold text-foreground">{total}</span> 条基础产品
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
                <TableHead>产品分类</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead>产品描述</TableHead>
                <TableHead className="text-right whitespace-nowrap">现金价值(元)</TableHead>
                <TableHead className="text-right whitespace-nowrap">消耗积分</TableHead>
                <TableHead className="whitespace-nowrap">计量单位</TableHead>
                <TableHead className="whitespace-nowrap">启用状态</TableHead>
                <TableHead className="whitespace-nowrap">创建时间</TableHead>
                <TableHead className="text-right whitespace-nowrap w-28">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    暂无匹配的基础产品
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((p) => (
                  <TableRow key={p.id} className="hover:bg-accent/30">
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[14rem]">
                      <div className="truncate" title={p.description}>
                        {p.description}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.cashValue}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.pointsCost}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-accent/40 text-primary border-primary/20"
                      >
                        {p.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={p.enabled}
                              onClick={() => toggleEnabled(p)}
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

      <BasicProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        nextCode={genCode(seq + 1)}
        categories={enabledCategories.map((c) => c.name)}
        onSubmit={(values) => {
          if (editing) {
            setData((d) =>
              d.map((x) => (x.id === editing.id ? { ...x, ...values } : x)),
            );
            toast.success(`已更新 ${values.name}`);
          } else {
            const nextSeq = seq + 1;
            const id = genCode(nextSeq);
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, "0");
            const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            setData((d) => [{ id, createdAt, ...values }, ...d]);
            setSeq(nextSeq);
            toast.success(`已新增 ${values.name}(${id})`);
          }
          setFormOpen(false);
        }}
      />

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该基础产品?</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 <span className="font-medium text-foreground">{delTarget?.name}</span>(
              {delTarget?.id}),此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (delTarget) {
                  setData((d) => d.filter((x) => x.id !== delTarget.id));
                  toast.success(`已删除 ${delTarget.name}`);
                }
                setDelTarget(null);
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type FormValues = Omit<BasicProduct, "id" | "createdAt">;

interface FormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: BasicProduct | null;
  nextCode: string;
  categories: string[];
  onSubmit: (v: FormValues) => void;
}

function BasicProductFormDialog({
  open,
  onOpenChange,
  editing,
  nextCode,
  categories,
  onSubmit,
}: FormProps) {
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cashValue, setCashValue] = useState("");
  const [pointsCost, setPointsCost] = useState("");
  const [unit, setUnit] = useState<UnitKey | "">("");
  const [enabled, setEnabled] = useState(true);
  const [linkOn, setLinkOn] = useState(false);
  const [links, setLinks] = useState<AppLink[]>([]);
  const [touched, setTouched] = useState(false);

  // 新增产品分类弹窗
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatRemark, setNewCatRemark] = useState("");

  useEffect(() => {
    if (open) {
      setCategory(editing?.category ?? "");
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setCashValue(editing ? String(editing.cashValue) : "");
      setPointsCost(editing ? String(editing.pointsCost) : "");
      setUnit(editing?.unit ?? "");
      setEnabled(editing ? editing.enabled : true);
      setLinkOn(!!editing && editing.appLinks.length > 0);
      setLinks(editing?.appLinks ?? []);
      setTouched(false);
    }
  }, [open, editing]);

  const errors = {
    category: !category ? "请选择产品分类" : "",
    name: !name.trim() ? "请输入产品名称" : "",
    description: !description.trim()
      ? "请输入产品描述"
      : description.length > DESC_MAX
        ? `产品描述最多 ${DESC_MAX} 个字符`
        : "",
    cashValue:
      cashValue === "" || Number.isNaN(Number(cashValue)) || Number(cashValue) < 0
        ? "请输入现金价值"
        : "",
    pointsCost:
      pointsCost === "" || !/^\d+$/.test(pointsCost) || Number(pointsCost) < 0
        ? "请输入消耗积分(非负整数)"
        : "",
    unit: !unit ? "请选择计量单位" : "",
    links: linkOn
      ? links.length === 0
        ? "请至少添加一条关联应用"
        : links.some((l) => !l.app || !l.serviceCode.trim())
          ? "请完整填写关联应用与外部服务编码"
          : ""
      : "",
  };

  const submit = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    onSubmit({
      category,
      name: name.trim(),
      description: description.trim(),
      cashValue: Number(cashValue),
      pointsCost: Number(pointsCost),
      unit: unit as UnitKey,
      enabled,
      appLinks: linkOn ? links : [],
    });
  };

  const addLink = () => setLinks((arr) => [...arr, { app: "", serviceCode: "" }]);
  const updateLink = (i: number, patch: Partial<AppLink>) =>
    setLinks((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) => setLinks((arr) => arr.filter((_, idx) => idx !== i));

  const submitNewCategory = () => {
    const v = newCatName.trim();
    if (!v) {
      toast.error("请输入产品分类名称");
      return;
    }
    const created = productCategoriesStore.add({
      name: v,
      remark: newCatRemark.slice(0, 200),
      enabled: true,
    });
    toast.success(`已新增分类 ${created.name}(${created.id})`);
    setCategory(created.name);
    setNewCatName("");
    setNewCatRemark("");
    setAddCatOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "修改基础产品" : "添加基础产品"}</DialogTitle>
          <DialogDescription>
            产品编号由系统自动生成,无需手工填写。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormRow label="产品编号" required>
              <Input
                value={editing ? editing.id : nextCode}
                disabled
                className="font-mono bg-muted/40"
              />
            </FormRow>

            <FormRow label="产品分类" required error={touched ? errors.category : ""}>
              <div className="flex items-center gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="请选择产品分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        暂无可用分类
                      </div>
                    ) : (
                      categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
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
                        onClick={() => setAddCatOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>新增产品分类</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </FormRow>
          </div>

          <FormRow
            label="产品名称"
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
              placeholder="请输入产品名称 (最长50字)"
              maxLength={NAME_MAX}
            />
          </FormRow>

          <FormRow label="关联应用">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={linkOn}
                  onCheckedChange={(v) => {
                    const b = !!v;
                    setLinkOn(b);
                    if (b && links.length === 0) setLinks([{ app: "", serviceCode: "" }]);
                  }}
                />
                <span className={linkOn ? "text-primary" : ""}>开启关联应用</span>
              </label>
              <p className="text-xs text-muted-foreground">
                需设置该产品在第三方应用中的服务编码
              </p>

              {linkOn && (
                <div className="space-y-2">
                  {links.map((l, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <Select value={l.app} onValueChange={(v) => updateLink(i, { app: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择应用" />
                        </SelectTrigger>
                        <SelectContent>
                          {APP_OPTIONS.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={l.serviceCode}
                        onChange={(e) => updateLink(i, { serviceCode: e.target.value })}
                        placeholder="外部服务编码 (必填)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeLink(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary"
                    onClick={addLink}
                  >
                    <Plus className="h-4 w-4" /> 添加
                  </Button>
                  {touched && errors.links && (
                    <p className="text-xs text-destructive">{errors.links}</p>
                  )}
                </div>
              )}
            </div>
          </FormRow>

          <FormRow
            label="产品描述"
            required
            error={touched ? errors.description : ""}
            extra={
              <span
                className={`text-xs tabular-nums ${
                  description.length > DESC_MAX
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {description.length} / {DESC_MAX}
              </span>
            }
          >
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              placeholder="请输入产品描述 (最长200字)"
              rows={3}
              maxLength={DESC_MAX}
            />
          </FormRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormRow label="现金价值(元)" required error={touched ? errors.cashValue : ""}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={cashValue}
                onChange={(e) => setCashValue(e.target.value)}
                placeholder="请输入现金价值"
              />
            </FormRow>
            <FormRow label="消耗积分" required error={touched ? errors.pointsCost : ""}>
              <Input
                type="number"
                min={0}
                step={1}
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="请输入消耗积分 (整数)"
              />
            </FormRow>
            <FormRow label="计量单位" required error={touched ? errors.unit : ""}>
              <Select value={unit} onValueChange={(v) => setUnit(v as UnitKey)}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择计量单位" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="状态">
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

        {/* 新增产品分类子弹窗 */}
        <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新增产品分类</DialogTitle>
              <DialogDescription>
                新增后将同步出现在「产品分类」列表与下拉中。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>
                  产品分类编码
                </Label>
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
      </DialogContent>
    </Dialog>
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