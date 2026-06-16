import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FolderTree,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  productCategoriesStore,
  useProductCategories,
  type ProductCategory,
} from "@/lib/productCategoriesStore";

export const Route = createFileRoute("/_app/points/products/categories")({
  head: () => ({ meta: [{ title: "产品管理 · 产品分类 | Boo数据平台" }] }),
  component: CategoriesPage,
});

type Category = ProductCategory;

const REMARK_MAX = 200;

function CategoriesPage() {
  const data = useProductCategories();

  const [nameKw, setNameKw] = useState("");
  const [codeKw, setCodeKw] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [delTarget, setDelTarget] = useState<Category | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Category | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"enable" | "disable" | null>(null);

  const confirmToggle = () => {
    if (!toggleTarget) return;
    productCategoriesStore.update(toggleTarget.id, { enabled: !toggleTarget.enabled });
    toast.success(`已${toggleTarget.enabled ? "停用" : "启用"} ${toggleTarget.name}`);
    setToggleTarget(null);
  };

  const confirmBulk = () => {
    if (!bulkAction || selectedIds.length === 0) return;
    const enabled = bulkAction === "enable";
    selectedIds.forEach((id) => productCategoriesStore.update(id, { enabled }));
    toast.success(`已批量${enabled ? "启用" : "停用"} ${selectedIds.length} 项产品分类`);
    setSelectedIds([]);
    setBulkAction(null);
  };

  const filtered = useMemo(() => {
    return data.filter((c) => {
      if (appliedName && !c.name.toLowerCase().includes(appliedName.toLowerCase())) return false;
      if (appliedCode && !c.id.toLowerCase().includes(appliedCode.toLowerCase())) return false;
      return true;
    });
  }, [data, appliedName, appliedCode]);

  const total = filtered.length;
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pageIds = pageData.map((c) => c.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const someChecked = pageIds.some((id) => selectedIds.includes(id));
  const togglePage = (checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? Array.from(new Set([...prev, ...pageIds]))
        : prev.filter((id) => !pageIds.includes(id)),
    );
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const applySearch = () => {
    setAppliedName(nameKw.trim());
    setAppliedCode(codeKw.trim());
    setPage(1);
  };
  const reset = () => {
    setNameKw("");
    setCodeKw("");
    setAppliedName("");
    setAppliedCode("");
    setPage(1);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>产品管理</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">产品分类</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <FolderTree className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">产品分类</h1>
            <p className="text-white/85 text-sm mt-0.5">
              统一维护积分体系下的产品分类,编码由系统自动生成
            </p>
          </div>
        </div>
      </section>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={nameKw}
              onChange={(e) => setNameKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="请输入产品分类名称"
              className="pl-9"
            />
          </div>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={codeKw}
              onChange={(e) => setCodeKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="请输入产品分类编码"
              className="pl-9 font-mono"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> 重置
          </Button>
          <Button onClick={applySearch}>
            <Search className="h-4 w-4" /> 搜索
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{total}</span> 条产品分类
            {selectedIds.length > 0 && (
              <span className="ml-2">
                · 已选 <span className="font-semibold text-foreground">{selectedIds.length}</span> 项
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
                    aria-label="全选当前页"
                  />
                </TableHead>
                <TableHead>产品分类名称</TableHead>
                <TableHead className="whitespace-nowrap">产品分类编码</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="whitespace-nowrap">启用状态</TableHead>
                <TableHead className="whitespace-nowrap">创建时间</TableHead>
                <TableHead className="text-right whitespace-nowrap w-32">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    暂无匹配的产品分类
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((c) => (
                  <TableRow key={c.id} className="hover:bg-accent/30">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(c.id)}
                        onCheckedChange={(v) => toggleOne(c.id, !!v)}
                        aria-label={`选择 ${c.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.id}</TableCell>
                    <TableCell className="text-muted-foreground max-w-md">
                      <div className="truncate" title={c.remark}>
                        {c.remark || <span className="text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={c.enabled}
                              onClick={() => setToggleTarget(c)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                c.enabled ? "bg-primary" : "bg-input"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition-transform ${
                                  c.enabled ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{c.enabled ? "点击停用" : "点击启用"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                      {c.createdAt}
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
                                  setEditing(c);
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
                                onClick={() => setDelTarget(c)}
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

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        nextCode={productCategoriesStore.nextCode()}
        onSubmit={(values) => {
          if (editing) {
            productCategoriesStore.update(editing.id, {
              name: values.name,
              remark: values.remark,
              enabled: values.enabled,
            });
            toast.success(`已更新 ${values.name}`);
          } else {
            const created = productCategoriesStore.add(values);
            toast.success(`已新增 ${created.name}(${created.id})`);
          }
          setFormOpen(false);
        }}
      />

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该产品分类?</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 <span className="font-medium text-foreground">{delTarget?.name}</span>(
              {delTarget?.id}),此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (delTarget) {
                  productCategoriesStore.remove(delTarget.id);
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

      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认{toggleTarget?.enabled ? "停用" : "启用"}该产品分类?
            </AlertDialogTitle>
            <AlertDialogDescription>
              即将{toggleTarget?.enabled ? "停用" : "启用"}{" "}
              <span className="font-medium text-foreground">{toggleTarget?.name}</span>(
              {toggleTarget?.id})
              {toggleTarget?.enabled
                ? ",停用后该分类下的产品在新建/编辑时将不可选择。"
                : ",启用后该分类将恢复可用。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              确认{toggleTarget?.enabled ? "停用" : "启用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkAction} onOpenChange={(o) => !o && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认批量{bulkAction === "enable" ? "启用" : "停用"} {selectedIds.length} 项产品分类?
            </AlertDialogTitle>
            <AlertDialogDescription>
              该操作将对所选 {selectedIds.length} 项产品分类执行
              {bulkAction === "enable" ? "启用" : "停用"}操作,请确认后继续。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulk}>
              确认{bulkAction === "enable" ? "启用" : "停用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Category | null;
  nextCode: string;
  onSubmit: (v: { name: string; remark: string; enabled: boolean }) => void;
}

function CategoryFormDialog({ open, onOpenChange, editing, nextCode, onSubmit }: CategoryFormProps) {
  const [name, setName] = useState("");
  const [remark, setRemark] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setRemark(editing?.remark ?? "");
      setEnabled(editing ? editing.enabled : true);
      setTouched(false);
    }
  }, [open, editing]);

  const nameError = touched && !name.trim() ? "请输入产品分类名称" : "";
  const remarkError = remark.length > REMARK_MAX ? `备注最多 ${REMARK_MAX} 个字符` : "";

  const submit = () => {
    setTouched(true);
    if (!name.trim()) return;
    if (remark.length > REMARK_MAX) return;
    onSubmit({ name: name.trim(), remark, enabled });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑产品分类" : "新增产品分类"}</DialogTitle>
          <DialogDescription>
            产品分类编码由系统自动生成,无需手工填写。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>产品分类编码</Label>
            <Input
              value={editing ? editing.id : nextCode}
              disabled
              className="font-mono bg-muted/40"
            />
            <p className="text-xs text-muted-foreground">
              {editing ? "编码不可修改" : "保存后将使用该编码"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>
              产品分类名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入产品分类名称"
              maxLength={50}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>备注</Label>
              <span
                className={`text-xs tabular-nums ${
                  remark.length > REMARK_MAX ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {remark.length}/{REMARK_MAX}
              </span>
            </div>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value.slice(0, REMARK_MAX))}
              placeholder="选填,最多 200 个字符"
              rows={4}
              maxLength={REMARK_MAX}
            />
            {remarkError && <p className="text-xs text-destructive">{remarkError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>启用状态</Label>
            <div className="flex items-center gap-3">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => setEnabled((v) => !v)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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
                  enabled ? "text-emerald-600" : "text-muted-foreground"
                }`}
              >
                {enabled ? "已启用" : "已停用"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">新建时默认启用</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}