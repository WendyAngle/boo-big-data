import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UserCog,
  Users,
  UserCheck,
  UserX,
  Crown,
  Search,
  Plus,
  Upload,
  Download,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  FileDown,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { ListPagination } from "@/components/ListPagination";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_app/auth/admin/users")({
  head: () => ({ meta: [{ title: "用户管理 | Boo数据平台" }] }),
  component: UsersPage,
});

type UserStatus = "正常" | "停用";
type UserRole = "法人" | "管理员" | "员工";
type Gender = "男" | "女" | "未知";

interface TenantRef {
  id: string;
  name: string;
}

interface AppUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  status: UserStatus;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  remark: string;
  createdAt: string;
}

// 与 租户管理 保持一致的租户名称池
const TENANT_NAMES = [
  "字节跳动",
  "蚂蚁集团",
  "美团点评",
  "京东物流",
  "宁德时代",
  "比亚迪汽车",
  "顺丰科技",
  "腾讯云",
  "阿里云",
  "网易严选",
];
const TENANTS: TenantRef[] = Array.from({ length: 24 }).map((_, i) => ({
  id: `T${String(202600 + i).padStart(6, "0")}`,
  name: `${TENANT_NAMES[i % TENANT_NAMES.length]}${i > 9 ? `(${i})` : ""}`,
}));

const USER_NAMES = [
  "张伟", "王芳", "李娜", "刘洋", "陈思", "杨明", "赵磊", "黄雨",
  "周凯", "吴婷", "郑浩", "孙颖", "马超", "朱琳", "胡杰", "林晓",
  "高翔", "何静", "梁宇", "罗敏",
];
const ROLES: UserRole[] = ["法人", "管理员", "员工"];
const GENDERS: Gender[] = ["男", "女", "未知"];
const STATUSES: UserStatus[] = ["正常", "停用"];

const MOCK: AppUser[] = Array.from({ length: 38 }).map((_, i) => {
  const tenant = TENANTS[i % TENANTS.length];
  // 每个租户一个法人；其余轮换 管理员 / 员工
  const role: UserRole =
    i < TENANTS.length ? "法人" : i % 4 === 0 ? "管理员" : "员工";
  const name = USER_NAMES[i % USER_NAMES.length] + (i >= USER_NAMES.length ? String(Math.floor(i / USER_NAMES.length) + 1) : "");
  return {
    id: `U${String(100001 + i).padStart(6, "0")}`,
    name,
    phone: "138" + String(10000000 + ((i * 1379) % 89999999)).slice(0, 8),
    email: i % 5 === 0 ? "" : `user${i + 1}@${["boo.com", "bytetech.cn", "antgroup.com"][i % 3]}`,
    gender: i % 7 === 0 ? "未知" : GENDERS[i % 2],
    status: i % 11 === 0 ? "停用" : "正常",
    role,
    tenantId: tenant.id,
    tenantName: tenant.name,
    remark: i % 3 === 0 ? "" : "由租户管理员授权创建，负责日常业务操作。",
    createdAt: `2026-${String(((i % 6) + 1)).padStart(2, "0")}-${String(((i % 27) + 1)).padStart(2, "0")}`,
  };
});

function statusBadge(s: UserStatus) {
  return s === "正常"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-muted text-muted-foreground border-border";
}
function roleBadge(r: UserRole) {
  const map: Record<UserRole, string> = {
    法人: "bg-amber-100 text-amber-700 border-amber-200",
    管理员: "bg-primary/10 text-primary border-primary/20",
    员工: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return map[r];
}

function UsersPage() {
  const [keyword, setKeyword] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [data, setData] = useState<AppUser[]>(MOCK);
  const [delTarget, setDelTarget] = useState<AppUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AppUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [viewTarget, setViewTarget] = useState<AppUser | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return data.filter((u) => {
      if (
        keyword &&
        !`${u.id} ${u.name} ${u.phone} ${u.email}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      )
        return false;
      if (tenantFilter !== "all" && u.tenantId !== tenantFilter) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [data, keyword, tenantFilter, roleFilter, statusFilter]);

  const total = filtered.length;
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pageIds = pageData.map((u) => u.id);
  const allPageChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageChecked = pageIds.some((id) => selected.has(id));
  const togglePageAll = (v: boolean) => {
    setSelected((s) => {
      const next = new Set(s);
      if (v) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
  };
  const toggleOne = (id: string, v: boolean) => {
    setSelected((s) => {
      const next = new Set(s);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const exportUsers = () => {
    const rows =
      selected.size > 0 ? data.filter((u) => selected.has(u.id)) : filtered;
    if (rows.length === 0) {
      toast.error("没有可导出的数据");
      return;
    }
    const headers = [
      "用户ID",
      "昵称/姓名",
      "手机号码",
      "邮箱",
      "性别",
      "角色",
      "所属租户",
      "状态",
      "创建时间",
      "备注",
    ];
    const csvEscape = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...rows.map((u) =>
        [
          u.id,
          u.name,
          u.phone,
          u.email,
          u.gender,
          u.role,
          u.tenantName,
          u.status,
          u.createdAt,
          u.remark,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF" + lines], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `用户数据_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      selected.size > 0
        ? `已导出所选 ${rows.length} 条用户`
        : `已导出全部 ${rows.length} 条用户`,
    );
  };

  const stats = useMemo(() => {
    const c = (fn: (u: AppUser) => boolean) => data.filter(fn).length;
    return {
      total: data.length,
      active: c((u) => u.status === "正常"),
      disabled: c((u) => u.status === "停用"),
      legal: c((u) => u.role === "法人"),
      admin: c((u) => u.role === "管理员"),
      staff: c((u) => u.role === "员工"),
    };
  }, [data]);

  const reset = () => {
    setKeyword("");
    setTenantFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>实名认证</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/auth/admin" className="hover:text-foreground">
          管理端
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">用户管理</span>
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <UserCog className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">用户管理</h1>
            <p className="text-white/85 text-sm mt-0.5">
              管理所有租户下的用户账户、角色权限与启用状态
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="用户总数"
          mainValue={stats.total}
          tone="primary"
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="正常 / 停用"
          mainValue={`${stats.active} / ${stats.disabled}`}
          tone="emerald"
          subs={[
            { k: "正常", v: stats.active },
            { k: "停用", v: stats.disabled },
          ]}
        />
        <StatCard
          icon={<Crown className="h-5 w-5" />}
          label="法人 / 管理员"
          mainValue={`${stats.legal} / ${stats.admin}`}
          tone="amber"
          subs={[
            { k: "法人", v: stats.legal },
            { k: "管理员", v: stats.admin },
          ]}
        />
        <StatCard
          icon={<UserX className="h-5 w-5" />}
          label="员工账户"
          mainValue={stats.staff}
          tone="cyan"
        />
      </div>

      {/* Search */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="xl:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="搜索用户ID / 姓名 / 手机号 / 邮箱"
              className="pl-9"
            />
          </div>
          <Select
            value={tenantFilter}
            onValueChange={(v) => {
              setTenantFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="全部租户" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">全部租户</SelectItem>
              {TENANTS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="全部角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部角色</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> 重置
          </Button>
          <Button onClick={() => toast.success(`已应用筛选，共 ${total} 条`)}>
            <Search className="h-4 w-4" /> 搜索
          </Button>
        </div>
      </Card>

      {/* Actions + Table */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{total}</span> 条用户记录
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> 新增用户
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> 导入用户
            </Button>
            <Button
              variant="outline"
              onClick={exportUsers}
            >
              <Download className="h-4 w-4" />
              {selected.size > 0 ? `导出所选 (${selected.size})` : "导出用户"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allPageChecked
                        ? true
                        : somePageChecked
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(v) => togglePageAll(!!v)}
                    aria-label="全选当前页"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap">用户ID</TableHead>
                <TableHead>昵称 / 姓名</TableHead>
                <TableHead className="whitespace-nowrap">手机号码</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>性别</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>所属租户</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="whitespace-nowrap">创建时间</TableHead>
                <TableHead className="text-right whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    暂无匹配的用户
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((u) => (
                  <TableRow key={u.id} className="hover:bg-accent/30">
                    <TableCell className="w-10">
                      <Checkbox
                        checked={selected.has(u.id)}
                        onCheckedChange={(v) => toggleOne(u.id, !!v)}
                        aria-label={`选择 ${u.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{u.id}</TableCell>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">{u.phone}</TableCell>
                    <TableCell className="text-sm">
                      {u.email ? (
                        <span className="text-foreground">{u.email}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">未填写</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{u.gender}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadge(u.role)}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-medium text-foreground">{u.tenantName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{u.tenantId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge(u.status)}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {u.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewTarget(u)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看用户详情</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditing(u);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑用户</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={
                                  u.status === "正常"
                                    ? "text-muted-foreground hover:text-foreground"
                                    : "text-emerald-600 hover:text-emerald-700"
                                }
                                onClick={() => {
                                  setToggleTarget(u);
                                }}
                              >
                                {u.status === "正常" ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {u.status === "正常" ? "停用用户" : "启用用户"}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-primary hover:text-primary"
                                onClick={() => setResetTarget(u)}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>重置密码</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDelTarget(u)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除用户</TooltipContent>
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

        <ListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </Card>

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该用户？</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 <span className="font-medium text-foreground">{delTarget?.name}</span>
              （{delTarget?.id}），此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
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

      {/* Toggle status confirm */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认{toggleTarget?.status === "正常" ? "停用" : "启用"}该用户？
            </AlertDialogTitle>
            <AlertDialogDescription>
              即将{toggleTarget?.status === "正常" ? "停用" : "启用"}{" "}
              <span className="font-medium text-foreground">{toggleTarget?.name}</span>
              （{toggleTarget?.id}）。
              {toggleTarget?.status === "正常"
                ? "停用后该用户将无法登录系统。"
                : "启用后该用户可恢复登录。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toggleTarget) {
                  const next = toggleTarget.status === "正常" ? "停用" : "正常";
                  setData((d) =>
                    d.map((x) => (x.id === toggleTarget.id ? { ...x, status: next } : x)),
                  );
                  toast.success(
                    `已${toggleTarget.status === "正常" ? "停用" : "启用"} ${toggleTarget.name}`,
                  );
                }
                setToggleTarget(null);
              }}
            >
              确认{toggleTarget?.status === "正常" ? "停用" : "启用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password confirm */}
      <AlertDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重置用户密码？</AlertDialogTitle>
            <AlertDialogDescription>
              将把用户 <span className="font-medium text-foreground">{resetTarget?.name}</span> 的密码重置为系统初始密码{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">Boo@123456</code>
              ，请通知用户首次登录后修改。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resetTarget) {
                  toast.success(`已将 ${resetTarget.name} 的密码重置为 Boo@123456`);
                }
                setResetTarget(null);
              }}
            >
              确认重置
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={(u) => {
          if (editing) {
            setData((d) => d.map((x) => (x.id === editing.id ? { ...u, id: editing.id } : x)));
            toast.success(`已更新 ${u.name}`);
          } else {
            const id = `U${String(100001 + data.length + 1).padStart(6, "0")}`;
            const createdAt = new Date().toISOString().slice(0, 10);
            setData((d) => [{ ...u, id, createdAt }, ...d]);
            toast.success(`已新增 ${u.name}`);
          }
          setFormOpen(false);
        }}
      />

      <UserDetailDialog
        user={viewTarget}
        onOpenChange={(o) => !o && setViewTarget(null)}
      />

      <ImportUsersDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

/* ---------------- Form Dialog ---------------- */

interface UserFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AppUser | null;
  onSubmit: (u: AppUser) => void;
}

function UserFormDialog({ open, onOpenChange, editing, onSubmit }: UserFormProps) {
  const empty: AppUser = {
    id: "",
    name: "",
    phone: "",
    email: "",
    gender: "未知",
    status: "正常",
    role: "员工",
    tenantId: TENANTS[0].id,
    tenantName: TENANTS[0].name,
    remark: "",
    createdAt: "",
  };
  const [form, setForm] = useState<AppUser>(empty);

  useEffect(() => {
    if (open) setForm(editing ?? empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const set = <K extends keyof AppUser>(k: K, v: AppUser[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const isEdit = !!editing;

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("请输入用户昵称/姓名");
      return;
    }
    if (!/^\d{6,20}$/.test(form.phone.replace(/-/g, ""))) {
      toast.error("请输入合法的手机号码");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("邮箱格式不正确");
      return;
    }
    if (form.remark.length > 200) {
      toast.error("备注最长 200 字符");
      return;
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑用户" : "新增用户"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `修改 ${editing?.name} 的账户信息与权限角色`
              : "填写用户基础信息以创建新的账户记录"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {isEdit && (
            <div className="space-y-1.5 md:col-span-2">
              <Label>用户ID</Label>
              <Input value={editing?.id ?? ""} disabled className="font-mono text-xs" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              昵称 / 姓名 <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="如：张伟"
              maxLength={32}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              手机号码 <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value.replace(/[^\d-]/g, ""))}
              placeholder="如：13800001234"
              inputMode="tel"
              maxLength={20}
            />
          </div>

          <div className="space-y-1.5">
            <Label>邮箱 <span className="text-xs text-muted-foreground">（选填）</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="如：user@example.com"
              maxLength={64}
            />
          </div>

          <div className="space-y-1.5">
            <Label>性别 <span className="text-xs text-muted-foreground">（选填）</span></Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v as Gender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>角色</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>所属租户</Label>
            <Select
              value={form.tenantId}
              onValueChange={(v) => {
                const t = TENANTS.find((x) => x.id === v);
                if (t) {
                  setForm((f) => ({ ...f, tenantId: t.id, tenantName: t.name }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TENANTS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span>{t.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {t.id}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>状态</Label>
            <div className="flex h-9 items-center gap-3 rounded-md border border-input bg-background px-3">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-2">
                      <Switch
                        checked={form.status === "正常"}
                        onCheckedChange={(v) => set("status", v ? "正常" : "停用")}
                      />
                      <span
                        className={
                          "text-sm " +
                          (form.status === "正常"
                            ? "text-foreground font-medium"
                            : "text-muted-foreground")
                        }
                      >
                        {form.status}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {form.status === "正常" ? "点击停用账户" : "点击启用账户"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>备注</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {form.remark.length} / 200
              </span>
            </div>
            <Textarea
              value={form.remark}
              onChange={(e) => set("remark", e.target.value.slice(0, 200))}
              placeholder="可填写岗位、负责范围、备注信息等，最长 200 字符"
              rows={3}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>{isEdit ? "保存修改" : "创建用户"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Detail Dialog ---------------- */

function UserDetailDialog({
  user,
  onOpenChange,
}: {
  user: AppUser | null;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            用户详情
          </DialogTitle>
          <DialogDescription>
            {user && (
              <>
                用户：<span className="text-foreground font-medium">{user.name}</span>
                <span className="ml-2 font-mono text-xs">{user.id}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {user && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2 text-sm">
            <DetailRow k="昵称/姓名" v={user.name} />
            <DetailRow k="手机号码" v={<span className="font-mono">{user.phone}</span>} />
            <DetailRow k="邮箱" v={user.email || <span className="text-muted-foreground">未填写</span>} />
            <DetailRow k="性别" v={user.gender} />
            <DetailRow
              k="角色"
              v={
                <Badge variant="outline" className={roleBadge(user.role)}>
                  {user.role}
                </Badge>
              }
            />
            <DetailRow
              k="状态"
              v={
                <Badge variant="outline" className={statusBadge(user.status)}>
                  {user.status}
                </Badge>
              }
            />
            <DetailRow
              k="所属租户"
              v={
                <span>
                  {user.tenantName}
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    {user.tenantId}
                  </span>
                </span>
              }
            />
            <DetailRow k="创建时间" v={<span className="tabular-nums">{user.createdAt}</span>} />
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-1">备注</div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm min-h-[64px]">
                {user.remark || <span className="text-muted-foreground">无</span>}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{k}</div>
      <div className="text-sm text-foreground">{v}</div>
    </div>
  );
}

/* ---------------- Stat Card (与租户管理保持一致) ---------------- */

type Tone = "primary" | "amber" | "emerald" | "cyan";
const toneMap: Record<Tone, { bg: string; icon: string; ring: string }> = {
  primary: {
    bg: "from-primary/15 to-primary/0",
    icon: "bg-primary/15 text-primary",
    ring: "ring-primary/10",
  },
  amber: {
    bg: "from-amber-200/40 to-amber-100/0",
    icon: "bg-amber-100 text-amber-700",
    ring: "ring-amber-200/40",
  },
  emerald: {
    bg: "from-emerald-200/40 to-emerald-100/0",
    icon: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-200/40",
  },
  cyan: {
    bg: "from-cyan-200/40 to-cyan-100/0",
    icon: "bg-cyan-100 text-cyan-700",
    ring: "ring-cyan-200/40",
  },
};

function StatCard({
  icon,
  label,
  mainValue,
  tone,
  subs,
}: {
  icon: React.ReactNode;
  label: string;
  mainValue: string | number;
  tone: Tone;
  subs?: { k: string; v: number }[];
}) {
  const t = toneMap[tone];
  return (
    <Card className={`relative overflow-hidden p-5 ring-1 ${t.ring}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${t.bg} pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{mainValue}</div>
          {subs && (
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              {subs.map((s) => (
                <span key={s.k} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
                  {s.k} <span className="font-semibold text-foreground">{s.v}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${t.icon}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

const USER_TEMPLATE_COLUMNS: { key: string; label: string; required: boolean; example: string; note: string; options?: string[] }[] = [
  { key: "name", label: "昵称 / 姓名", required: true, example: "张伟", note: "用户昵称或真实姓名，最长 32 字符" },
  { key: "phone", label: "手机号码", required: true, example: "13800001234", note: "6-20 位数字，可含 -，须唯一" },
  { key: "email", label: "邮箱", required: false, example: "zhangwei@example.com", note: "标准邮箱格式，最长 64 字符" },
  { key: "gender", label: "性别", required: false, example: "男", note: "下拉选择，默认 未知", options: ["男", "女", "未知"] },
  { key: "role", label: "角色", required: false, example: "员工", note: "下拉选择，默认 员工", options: ["法人", "管理员", "员工"] },
  { key: "tenantName", label: "所属租户", required: false, example: "字节跳动", note: "下拉选择租户管理中的租户，留空则不绑定", options: TENANTS.map((t) => t.name) },
  { key: "status", label: "状态", required: false, example: "正常", note: "下拉选择，默认 正常", options: ["正常", "停用"] },
  { key: "remark", label: "备注", required: false, example: "数据中台负责人", note: "最长 200 字符" },
];

async function downloadUserTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("用户导入");
  ws.columns = USER_TEMPLATE_COLUMNS.map((c) => ({
    header: c.required ? `${c.label}*` : c.label,
    key: c.key,
    width: Math.max(14, c.label.length * 3),
  }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFF3FA" },
  };
  USER_TEMPLATE_COLUMNS.forEach((c, i) => {
    if (c.required) {
      ws.getRow(1).getCell(i + 1).font = { bold: true, color: { argb: "FFDC2626" } };
    }
  });
  ws.addRow(USER_TEMPLATE_COLUMNS.map((c) => c.example));
  ws.addRow(["李娜", "13900002345", "lina@example.com", "女", "管理员", "示例科技", "正常", "风控业务联系人"]);

  // 长选项放隐藏 sheet，便于绕过 Excel 内联列表 255 字符限制
  const opts = wb.addWorksheet("_options");
  opts.state = "hidden";
  USER_TEMPLATE_COLUMNS.forEach((c, i) => {
    if (!c.options) return;
    const colLetter = opts.getColumn(i + 1).letter;
    c.options.forEach((v, idx) => {
      opts.getCell(`${colLetter}${idx + 1}`).value = v;
    });
    const colLetterMain = ws.getColumn(i + 1).letter;
    const range = `_options!$${colLetter}$1:$${colLetter}$${c.options.length}`;
    for (let r = 2; r <= 1000; r++) {
      ws.getCell(`${colLetterMain}${r}`).dataValidation = {
        type: "list",
        allowBlank: !c.required,
        formulae: [`=${range}`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "无效值",
        error: `请从下拉列表选择有效项`,
      };
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "用户导入模板.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("模板已下载：用户导入模板.xlsx");
}

function ImportUsersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [fileName, setFileName] = useState<string>("");

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
  };

  const onImport = () => {
    if (!fileName) {
      toast.error("请先选择要导入的文件");
      return;
    }
    toast.success(`已解析 ${fileName}，导入任务已提交`);
    setFileName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> 批量导入用户
          </DialogTitle>
          <DialogDescription>
            请先下载模板，按列填写后上传 CSV / Excel 文件。带 <span className="text-destructive font-medium">*</span> 的字段为必填项。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">用户导入模板.xlsx</div>
                <div className="text-xs text-muted-foreground">
                  含全部字段列标题、示例数据与下拉选项校验，支持 Excel / WPS 直接打开
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={downloadUserTemplate}>
              <FileDown className="h-4 w-4" /> 下载模板
            </Button>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              字段说明
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">列标题</TableHead>
                    <TableHead className="w-20">必填</TableHead>
                    <TableHead>说明</TableHead>
                    <TableHead className="w-48">示例</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {USER_TEMPLATE_COLUMNS.map((c) => (
                    <TableRow key={c.key}>
                      <TableCell className="font-medium">
                        {c.label}
                        {c.required && <span className="text-destructive ml-0.5">*</span>}
                      </TableCell>
                      <TableCell>
                        {c.required ? (
                          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0">必填</Badge>
                        ) : (
                          <Badge variant="secondary">选填</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.note}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{c.example}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span>
                请确保列标题与模板完全一致；"所属租户"需与租户管理列表中的名称一致，否则该行将作为未绑定租户处理。
              </span>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              上传文件
            </div>
            <label className="block cursor-pointer rounded-lg border border-dashed bg-muted/20 hover:bg-muted/40 transition-colors p-6 text-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={onPick}
              />
              <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
              <div className="mt-2 text-sm">
                {fileName ? (
                  <span className="font-medium text-foreground">{fileName}</span>
                ) : (
                  <>
                    点击选择文件，或将 <span className="font-medium text-foreground">.csv / .xlsx</span> 文件拖放到此处
                  </>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">单次最多 1000 条，单文件不超过 5MB</div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onImport}>
            <Upload className="h-4 w-4" /> 开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}