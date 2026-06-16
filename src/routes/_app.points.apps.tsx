import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AppWindow,
  ChevronRight,
  Search,
  Plus,
  RotateCcw,
  Pencil,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ListPagination } from "@/components/ListPagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/points/apps")({
  head: () => ({ meta: [{ title: "积分管理系统 · 应用管理 | Boo数据平台" }] }),
  component: AppsPage,
});

type AppStatus = "启用" | "禁用";
type Encryption = "加密" | "不加密";
type ApiPerm = "查询权限" | "消耗权限" | "退还权限";

interface AppRecord {
  id: string;
  name: string;
  appKey: string;
  secret: string;
  perms: ApiPerm[];
  encryption: Encryption;
  status: AppStatus;
  expiresAt: string; // YYYY-MM-DD HH:mm:ss
  remark: string;
}

const REMARK_MAX = 200;
const ALL_PERMS: ApiPerm[] = ["查询权限", "消耗权限", "退还权限"];

function randomSecret() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const INITIAL: AppRecord[] = [
  {
    id: "1",
    name: "AI视频生成",
    appKey: "app_3",
    secret: "K3xqA8nLp2VeWfHr5MdT7uJyCb9XoZsR",
    perms: ["查询权限", "消耗权限", "退还权限"],
    encryption: "加密",
    status: "启用",
    expiresAt: "2026-03-28 00:00:00",
    remark: "test",
  },
  {
    id: "2",
    name: "SIS",
    appKey: "app_1",
    secret: "Pq7tEvN9mDk4Yh2LcXr6BgWaJzUoFsM3",
    perms: ["查询权限", "消耗权限"],
    encryption: "加密",
    status: "启用",
    expiresAt: "2026-03-27 00:00:00",
    remark: "ttt",
  },
  {
    id: "3",
    name: "AIMedia",
    appKey: "app_2",
    secret: "Hn8sLk2QwTpR5yBvX9aCmZdJfGeUoXi7",
    perms: ["查询权限"],
    encryption: "加密",
    status: "启用",
    expiresAt: "2026-03-28 00:00:00",
    remark: "test",
  },
  {
    id: "4",
    name: "Hub",
    appKey: "app_4",
    secret: "Tm5jKpL8nQrV2dXcZeWaB7sYoUiFhRgN",
    perms: ["查询权限", "消耗权限", "退还权限"],
    encryption: "加密",
    status: "禁用",
    expiresAt: "2026-03-31 00:00:00",
    remark: "ggg",
  },
];

function AppsPage() {
  const [data, setData] = useState<AppRecord[]>(INITIAL);

  const [nameKw, setNameKw] = useState("");
  const [encFilter, setEncFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [applied, setApplied] = useState({ name: "", enc: "all", status: "all" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [shown, setShown] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppRecord | null>(null);

  const filtered = useMemo(() => {
    return data.filter((a) => {
      if (applied.name && !a.name.toLowerCase().includes(applied.name.toLowerCase())) return false;
      if (applied.enc !== "all" && a.encryption !== applied.enc) return false;
      if (applied.status !== "all" && a.status !== applied.status) return false;
      return true;
    });
  }, [data, applied]);

  const total = filtered.length;
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const apply = () => {
    setApplied({ name: nameKw.trim(), enc: encFilter, status: statusFilter });
    setPage(1);
  };
  const reset = () => {
    setNameKw("");
    setEncFilter("all");
    setStatusFilter("all");
    setApplied({ name: "", enc: "all", status: "all" });
    setPage(1);
  };

  const toggleShow = (id: string) => {
    setShown((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const regenerate = (id: string) => {
    setData((d) => d.map((a) => (a.id === id ? { ...a, secret: randomSecret() } : a)));
    toast.success("已重新生成密钥");
  };

  const copySecret = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s);
      toast.success("已复制密钥");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">应用管理</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <AppWindow className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">应用管理</h1>
            <p className="text-white/85 text-sm mt-0.5">
              管理接入应用的密钥、API 权限、加密策略与有效期
            </p>
          </div>
        </div>
      </section>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={nameKw}
              onChange={(e) => setNameKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="请输入应用名称"
              className="pl-9"
            />
          </div>
          <Select value={encFilter} onValueChange={setEncFilter}>
            <SelectTrigger>
              <SelectValue placeholder="数据加密" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部数据加密</SelectItem>
              <SelectItem value="加密">加密</SelectItem>
              <SelectItem value="不加密">不加密</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="启用">启用</SelectItem>
              <SelectItem value="禁用">禁用</SelectItem>
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
            共 <span className="font-semibold text-foreground">{total}</span> 个应用
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
                <TableHead>应用名称</TableHead>
                <TableHead>应用标识</TableHead>
                <TableHead>密钥</TableHead>
                <TableHead className="whitespace-nowrap">数据加密</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="whitespace-nowrap">过期时间</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="text-right whitespace-nowrap w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    暂无匹配的应用
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((a) => {
                  const isShown = shown.has(a.id);
                  return (
                    <TableRow key={a.id} className="hover:bg-accent/30">
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="font-mono text-xs">{a.appKey}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs tabular-nums min-w-[12rem] inline-block">
                            {isShown ? a.secret : "************"}
                          </span>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-primary"
                                  onClick={() => toggleShow(a.id)}
                                >
                                  {isShown ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isShown ? "隐藏密钥" : "查看密钥"}</TooltipContent>
                            </Tooltip>
                            {isShown && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => copySecret(a.secret)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>复制密钥</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                                  onClick={() => regenerate(a.id)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>重新生成密钥</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            a.encryption === "加密"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {a.encryption}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            a.status === "启用"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-rose-100 text-rose-700 border-rose-200"
                          }
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {a.expiresAt.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[14rem]">
                        <div className="truncate" title={a.remark}>
                          {a.remark || <span className="text-xs">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditing(a);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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

      <AppFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        existingAppKeys={data.map((a) => a.appKey)}
        onSubmit={(values) => {
          if (editing) {
            setData((d) =>
              d.map((x) => (x.id === editing.id ? { ...x, ...values } : x)),
            );
            toast.success(`已更新 ${values.name}`);
          } else {
            const id = String(Date.now());
            setData((d) => [{ id, secret: randomSecret(), ...values }, ...d]);
            toast.success(`已新增 ${values.name}`);
          }
          setFormOpen(false);
        }}
      />
    </div>
  );
}

type FormValues = Omit<AppRecord, "id" | "secret"> & { secret?: string };

interface AppFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AppRecord | null;
  existingAppKeys: string[];
  onSubmit: (v: FormValues) => void;
}

function AppFormDialog({ open, onOpenChange, editing, existingAppKeys, onSubmit }: AppFormProps) {
  const [name, setName] = useState("");
  const [appKey, setAppKey] = useState("");
  const [perms, setPerms] = useState<ApiPerm[]>([]);
  const [encryption, setEncryption] = useState<Encryption>("加密");
  const [status, setStatus] = useState<AppStatus>("启用");
  const [expiresAt, setExpiresAt] = useState(""); // datetime-local string
  const [remark, setRemark] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setAppKey(editing?.appKey ?? "");
      setPerms(editing?.perms ?? []);
      setEncryption(editing?.encryption ?? "加密");
      setStatus(editing?.status ?? "启用");
      setExpiresAt(
        editing?.expiresAt ? editing.expiresAt.replace(" ", "T").slice(0, 16) : "",
      );
      setRemark(editing?.remark ?? "");
      setTouched(false);
    }
  }, [open, editing]);

  const togglePerm = (p: ApiPerm, v: boolean) => {
    setPerms((arr) => (v ? Array.from(new Set([...arr, p])) : arr.filter((x) => x !== p)));
  };

  const errors = {
    name: !name.trim() ? "请输入应用名称" : "",
    appKey: !appKey.trim()
      ? "请输入appKey"
      : !editing && existingAppKeys.includes(appKey.trim())
        ? "appKey 已存在"
        : "",
    perms: perms.length === 0 ? "请至少勾选一项 API 访问权限" : "",
    expiresAt: !expiresAt ? "请选择过期时间" : "",
    remark: !remark.trim()
      ? "请输入备注"
      : remark.length > REMARK_MAX
        ? `备注最多 ${REMARK_MAX} 个字符`
        : "",
  };

  const submit = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    onSubmit({
      name: name.trim(),
      appKey: appKey.trim(),
      perms,
      encryption,
      status,
      expiresAt: expiresAt.replace("T", " ") + ":00",
      remark: remark.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "修改应用接入" : "新增应用接入"}</DialogTitle>
          <DialogDescription>
            配置应用基础信息、API 访问权限与加密策略。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormRow label="应用名称" required error={touched ? errors.name : ""}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入应用名称"
              maxLength={50}
            />
          </FormRow>

          <FormRow label="应用标识" required error={touched ? errors.appKey : ""}>
            <Input
              value={appKey}
              onChange={(e) => setAppKey(e.target.value)}
              placeholder="请输入appKey"
              className="font-mono"
              maxLength={32}
              disabled={!!editing}
            />
            {editing && (
              <p className="text-xs text-muted-foreground mt-1">应用标识不可修改</p>
            )}
          </FormRow>

          <FormRow label="API访问权限" required error={touched ? errors.perms : ""}>
            <div className="flex flex-wrap items-center gap-5 pt-1.5">
              {ALL_PERMS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={perms.includes(p)}
                    onCheckedChange={(v) => togglePerm(p, !!v)}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </FormRow>

          <FormRow label="是否启用数据加密" required>
            <RadioGroup
              value={encryption}
              onValueChange={(v) => setEncryption(v as Encryption)}
              className="flex items-center gap-6 pt-1.5"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="加密" id="enc-on" />
                <span>加密</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="不加密" id="enc-off" />
                <span>不加密</span>
              </label>
            </RadioGroup>
          </FormRow>

          <FormRow label="状态" required>
            <RadioGroup
              value={status}
              onValueChange={(v) => setStatus(v as AppStatus)}
              className="flex items-center gap-6 pt-1.5"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="启用" id="st-on" />
                <span>启用</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="禁用" id="st-off" />
                <span>禁用</span>
              </label>
            </RadioGroup>
          </FormRow>

          <FormRow label="过期时间" required error={touched ? errors.expiresAt : ""}>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="font-mono"
            />
          </FormRow>

          <FormRow
            label="备注"
            required
            error={touched ? errors.remark : ""}
            extra={
              <span
                className={`text-xs tabular-nums ${
                  remark.length > REMARK_MAX ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {remark.length}/{REMARK_MAX}
              </span>
            }
          >
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value.slice(0, REMARK_MAX))}
              placeholder="请输入备注"
              rows={3}
              maxLength={REMARK_MAX}
            />
          </FormRow>
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
    <div className="grid grid-cols-[8rem_1fr] gap-3 items-start">
      <Label className="pt-2 justify-end text-right">
        {required && <span className="text-destructive mr-0.5">*</span>}
        {label}
      </Label>
      <div className="space-y-1">
        {extra && <div className="flex justify-end">{extra}</div>}
        {children}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}