import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  Handshake,
  ChevronRight,
  Search,
  Plus,
  Upload,
  Download,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  X,
  FileSpreadsheet,
  FileDown,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
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

export const Route = createFileRoute("/_app/auth/admin/tenants")({
  head: () => ({ meta: [{ title: "租户管理 | Boo数据平台" }] }),
  component: TenantsPage,
});

type AuthStatus = "待认证" | "认证中" | "认证成功" | "认证失败";
type CoopStatus = "合作中" | "终止合作";
type TenantType = "个人用户" | "企业用户";

interface Tenant {
  id: string;
  name: string;
  intro: string;
  type: TenantType;
  industry: string;
  product: string;
  contact: string;
  contactPhone: string;
  coopContent: string;
  coopStatus: CoopStatus;
  authStatus: AuthStatus;
}

const INDUSTRIES = ["金融", "电商", "制造", "教育", "医疗", "互联网", "物流"];
const CONTACT_NAMES = [
  "张伟", "王芳", "李娜", "刘洋", "陈思", "杨明",
  "赵磊", "黄雨", "周凯", "吴婷",
];

// 认证等级列表（与 认证等级 页面保持一致）
type LevelKey = "L1" | "L2" | "L3" | "L4";
interface LevelOption {
  key: LevelKey;
  title: string;
  personalTag: string;
  enterpriseTag: string;
  personalFactors: string[];
  enterpriseFactors: string[];
}
const LEVEL_OPTIONS: LevelOption[] = [
  {
    key: "L1", title: "基础认证",
    personalTag: "二要素", enterpriseTag: "企业 + 法人二要素",
    personalFactors: ["姓名", "身份证号"],
    enterpriseFactors: ["企业名称", "统一社会信用代码", "法人姓名", "法人身份证号"],
  },
  {
    key: "L2", title: "三要素认证",
    personalTag: "三要素", enterpriseTag: "法人三要素",
    personalFactors: ["姓名", "身份证号", "手机号"],
    enterpriseFactors: ["企业信息", "法人姓名", "法人身份证号", "法人手机号"],
  },
  {
    key: "L3", title: "人脸核身",
    personalTag: "人脸核身", enterpriseTag: "企业 + 法人人脸核身",
    personalFactors: ["姓名", "身份证号", "手机号", "人脸识别"],
    enterpriseFactors: ["企业信息", "营业执照", "法人三要素", "法人人脸识别"],
  },
  {
    key: "L4", title: "完整认证",
    personalTag: "四要素", enterpriseTag: "企业完整认证",
    personalFactors: ["姓名", "身份证号", "手机号", "人脸识别", "银行卡"],
    enterpriseFactors: ["企业信息", "营业执照", "法人四要素", "对公账户"],
  },
];

type AuthTiming = "首次登录" | "使用敏感功能";
interface AuthPolicy {
  enabled: boolean;
  timing: AuthTiming;
  sensitiveFeatures: string[];
  level: LevelKey;
  manualReview: boolean;
  reviewTimeoutHours: number;
  autoActivateAfterReview: boolean;
  validityMonths: number; // 0 = 永久
}
const DEFAULT_POLICY: AuthPolicy = {
  enabled: true,
  timing: "首次登录",
  sensitiveFeatures: [],
  level: "L2",
  manualReview: false,
  reviewTimeoutHours: 24,
  autoActivateAfterReview: true,
  validityMonths: 12,
};

const MOCK: Tenant[] = Array.from({ length: 47 }).map((_, i) => {
  const types: TenantType[] = ["个人用户", "企业用户"];
  const auths: AuthStatus[] = ["待认证", "认证中", "认证成功", "认证失败"];
  const coops: CoopStatus[] = ["合作中", "合作中", "合作中", "终止合作"];
  const names = [
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
  return {
    id: `T${String(202600 + i).padStart(6, "0")}`,
    name: `${names[i % names.length]}${i > 9 ? `(${i})` : ""}`,
    intro: "专注于数据服务与企业级解决方案，提供安全可靠的合作生态。",
    type: types[i % 2],
    industry: INDUSTRIES[i % INDUSTRIES.length],
    product: ["数据中台", "智能风控", "营销云", "供应链", "AI平台"][i % 5],
    contact: CONTACT_NAMES[i % CONTACT_NAMES.length],
    contactPhone: "138" + String(10000000 + ((i * 1357) % 89999999)).slice(0, 8),
    coopContent: ["数据接入", "联合运营", "技术共建", "渠道分销"][i % 4],
    coopStatus: coops[i % coops.length],
    authStatus: auths[i % auths.length],
  };
});

function authBadge(s: AuthStatus) {
  const map: Record<AuthStatus, string> = {
    待认证: "bg-muted text-muted-foreground border-border",
    认证中: "bg-amber-100 text-amber-700 border-amber-200",
    认证成功: "bg-emerald-100 text-emerald-700 border-emerald-200",
    认证失败: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return map[s];
}
function coopBadge(s: CoopStatus) {
  return s === "合作中"
    ? "bg-accent text-accent-foreground border-primary/20"
    : "bg-muted text-muted-foreground border-border";
}

function TenantsPage() {
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [auth, setAuth] = useState("all");
  const [coop, setCoop] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [delTarget, setDelTarget] = useState<Tenant | null>(null);
  const [data, setData] = useState<Tenant[]>(MOCK);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [policies, setPolicies] = useState<Record<string, AuthPolicy>>({});

  // 初始化：除"待认证"外，其他认证状态的租户都默认带有认证策略（含等级）
  useEffect(() => {
    const init: Record<string, AuthPolicy> = {};
    const levelPool: LevelKey[] = ["L1", "L2", "L3", "L4"];
    MOCK.forEach((t, i) => {
      if (t.authStatus !== "待认证") {
        init[t.id] = { ...DEFAULT_POLICY, level: levelPool[i % levelPool.length] };
      }
    });
    setPolicies(init);
  }, []);

  const [policyTarget, setPolicyTarget] = useState<Tenant | null>(null);
  const [viewTarget, setViewTarget] = useState<Tenant | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return data.filter((t) => {
      if (keyword && !(`${t.id} ${t.name}`.toLowerCase().includes(keyword.toLowerCase()))) return false;
      if (type !== "all" && t.type !== type) return false;
      if (industry !== "all" && t.industry !== industry) return false;
      if (auth !== "all" && t.authStatus !== auth) return false;
      if (coop !== "all" && t.coopStatus !== coop) return false;
      return true;
    });
  }, [data, keyword, type, industry, auth, coop]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pageIds = pageData.map((t) => t.id);
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

  const exportTenants = () => {
    const rows =
      selected.size > 0 ? data.filter((t) => selected.has(t.id)) : filtered;
    if (rows.length === 0) {
      toast.error("没有可导出的数据");
      return;
    }
    const headers = [
      "租户ID",
      "名称",
      "类型",
      "行业",
      "主营产品",
      "联系人",
      "联系电话",
      "合作内容",
      "合作状态",
      "认证状态",
      "认证等级",
      "简介",
    ];
    const csvEscape = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...rows.map((t) =>
        [
          t.id,
          t.name,
          t.type,
          t.industry,
          t.product,
          t.contact,
          t.contactPhone,
          t.coopContent,
          t.coopStatus,
          t.authStatus,
          policies[t.id]?.level ?? "",
          t.intro,
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
    a.download = `租户数据_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      selected.size > 0
        ? `已导出所选 ${rows.length} 条租户`
        : `已导出全部 ${rows.length} 条租户`,
    );
  };

  const stats = useMemo(() => {
    const c = (fn: (t: Tenant) => boolean) => data.filter(fn).length;
    return {
      total: data.length,
      pending: c((t) => t.authStatus === "待认证"),
      auditing: c((t) => t.authStatus === "认证中"),
      success: c((t) => t.authStatus === "认证成功"),
      failed: c((t) => t.authStatus === "认证失败"),
      coop: c((t) => t.coopStatus === "合作中"),
      ended: c((t) => t.coopStatus === "终止合作"),
    };
  }, [data]);

  const reset = () => {
    setKeyword("");
    setType("all");
    setIndustry("all");
    setAuth("all");
    setCoop("all");
    setPage(1);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>实名认证</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/auth/admin" className="hover:text-foreground">管理端</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">租户管理</span>
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">租户管理</h1>
            <p className="text-white/85 text-sm mt-0.5">
              管理所有接入租户的基础信息、认证进度与合作状态
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="租户总数"
          mainValue={stats.total}
          tone="primary"
        />
        <StatCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="待认证 / 认证中"
          mainValue={`${stats.pending} / ${stats.auditing}`}
          tone="amber"
          subs={[
            { k: "待认证", v: stats.pending },
            { k: "认证中", v: stats.auditing },
          ]}
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="认证成功 / 认证失败"
          mainValue={`${stats.success} / ${stats.failed}`}
          tone="emerald"
          subs={[
            { k: "成功", v: stats.success },
            { k: "失败", v: stats.failed },
          ]}
        />
        <StatCard
          icon={<Handshake className="h-5 w-5" />}
          label="合作中 / 终止合作"
          mainValue={`${stats.coop} / ${stats.ended}`}
          tone="cyan"
          subs={[
            { k: "合作中", v: stats.coop },
            { k: "终止", v: stats.ended },
          ]}
        />
      </div>

      {/* Search */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="xl:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              placeholder="搜索租户ID / 名称"
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="全部类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="个人用户">个人用户</SelectItem>
              <SelectItem value="企业用户">企业用户</SelectItem>
            </SelectContent>
          </Select>
          <Select value={industry} onValueChange={(v) => { setIndustry(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="全部行业" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部行业</SelectItem>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={auth} onValueChange={(v) => { setAuth(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="认证状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部认证状态</SelectItem>
              <SelectItem value="待认证">待认证</SelectItem>
              <SelectItem value="认证中">认证中</SelectItem>
              <SelectItem value="认证成功">认证成功</SelectItem>
              <SelectItem value="认证失败">认证失败</SelectItem>
            </SelectContent>
          </Select>
          <Select value={coop} onValueChange={(v) => { setCoop(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="合作状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部合作状态</SelectItem>
              <SelectItem value="合作中">合作中</SelectItem>
              <SelectItem value="终止合作">终止合作</SelectItem>
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
            共 <span className="font-semibold text-foreground">{total}</span> 条租户记录
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> 新增租户
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> 导入租户
            </Button>
            <Button variant="outline" onClick={exportTenants}>
              <Download className="h-4 w-4" />
              {selected.size > 0 ? `导出所选 (${selected.size})` : "导出租户"}
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
                <TableHead className="whitespace-nowrap">租户ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead className="min-w-[220px]">简介</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>行业</TableHead>
                <TableHead>主营产品</TableHead>
                <TableHead className="whitespace-nowrap">联系方式</TableHead>
                <TableHead>合作内容</TableHead>
                <TableHead>合作状态</TableHead>
                <TableHead>认证状态</TableHead>
                <TableHead>认证等级</TableHead>
                <TableHead className="text-right whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                    暂无匹配的租户
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((t) => (
                  <TableRow key={t.id} className="hover:bg-accent/30">
                    <TableCell className="w-10">
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={(v) => toggleOne(t.id, !!v)}
                        aria-label={`选择 ${t.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">{t.intro}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">{t.type}</Badge>
                    </TableCell>
                    <TableCell>{t.industry}</TableCell>
                    <TableCell>{t.product}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {t.contact || t.contactPhone ? (
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-medium text-foreground">{t.contact || "—"}</span>
                          <span className="text-xs text-muted-foreground font-mono tabular-nums">
                            {t.contactPhone || "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">未填写</span>
                      )}
                    </TableCell>
                    <TableCell>{t.coopContent}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={coopBadge(t.coopStatus)}>{t.coopStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={authBadge(t.authStatus)}>{t.authStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      {policies[t.id] ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium tabular-nums">
                          {policies[t.id].level}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">未设置</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={policies[t.id] ? "text-primary hover:text-primary" : ""}
                                onClick={() => setPolicyTarget(t)}
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>设置认证策略</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setViewTarget(t)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看租户详情</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setFormOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑租户</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDelTarget(t)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除租户</TooltipContent>
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
            <AlertDialogTitle>确认删除该租户？</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 <span className="font-medium text-foreground">{delTarget?.name}</span>（{delTarget?.id}），此操作不可撤销。
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

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={(t) => {
          if (editing) {
            setData((d) => d.map((x) => (x.id === editing.id ? { ...t, id: editing.id } : x)));
            toast.success(`已更新 ${t.name}`);
          } else {
            const id = `T${String(202600 + data.length + 1).padStart(6, "0")}`;
            setData((d) => [{ ...t, id }, ...d]);
            toast.success(`已新增 ${t.name}`);
          }
          setFormOpen(false);
        }}
      />

      <AuthPolicyDialog
        tenant={policyTarget}
        existing={policyTarget ? policies[policyTarget.id] : undefined}
        onOpenChange={(o) => !o && setPolicyTarget(null)}
        onSubmit={(p) => {
          if (!policyTarget) return;
          setPolicies((m) => ({ ...m, [policyTarget.id]: p }));
          toast.success(`已保存 ${policyTarget.name} 的认证策略`);
          setPolicyTarget(null);
        }}
      />

      <ImportTenantsDialog open={importOpen} onOpenChange={setImportOpen} />

      <TenantDetailDialog
        tenant={viewTarget}
        policy={viewTarget ? policies[viewTarget.id] : undefined}
        onOpenChange={(o) => !o && setViewTarget(null)}
        onEditPolicy={() => {
          if (viewTarget) {
            setPolicyTarget(viewTarget);
            setViewTarget(null);
          }
        }}
      />
    </div>
  );
}

interface TenantFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Tenant | null;
  onSubmit: (t: Tenant) => void;
}

interface TenantDetailDialogProps {
  tenant: Tenant | null;
  policy: AuthPolicy | undefined;
  onOpenChange: (o: boolean) => void;
  onEditPolicy: () => void;
}

function TenantDetailDialog({ tenant, policy, onOpenChange, onEditPolicy }: TenantDetailDialogProps) {
  if (!tenant) return null;
  const levelInfo = policy ? LEVEL_OPTIONS.find((l) => l.key === policy.level) : undefined;
  const isPersonal = tenant.type === "个人用户";

  return (
    <Dialog open={!!tenant} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            租户详情
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap pt-1">
            <span className="font-mono text-xs">{tenant.id}</span>
            <span>·</span>
            <span className="text-foreground font-medium">{tenant.name}</span>
            <Badge variant="outline" className="font-normal">{tenant.type}</Badge>
            <Badge variant="outline" className={authBadge(tenant.authStatus)}>{tenant.authStatus}</Badge>
            <Badge variant="outline" className={coopBadge(tenant.coopStatus)}>{tenant.coopStatus}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 基础信息 */}
          <section className="rounded-lg border bg-card">
            <div className="px-4 py-2.5 border-b text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 基础信息
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-4">
              <DetailKV label="租户ID" value={<span className="font-mono">{tenant.id}</span>} />
              <DetailKV label="租户名称" value={tenant.name} />
              <DetailKV label="类型" value={tenant.type} />
              <DetailKV label="行业" value={tenant.industry} />
              <DetailKV label="主营产品" value={tenant.product} />
              <DetailKV label="联系人" value={tenant.contact} />
              <DetailKV label="联系电话" value={<span className="font-mono">{tenant.contactPhone}</span>} />
              <DetailKV label="合作内容" value={tenant.coopContent} />
              <DetailKV label="合作状态" value={<Badge variant="outline" className={coopBadge(tenant.coopStatus)}>{tenant.coopStatus}</Badge>} />
              <DetailKV label="认证状态" value={<Badge variant="outline" className={authBadge(tenant.authStatus)}>{tenant.authStatus}</Badge>} />
              <div className="md:col-span-2">
                <DetailKV label="简介" value={<span className="leading-relaxed">{tenant.intro}</span>} />
              </div>
            </div>
          </section>

          {/* 认证策略 */}
          <section className="rounded-lg border bg-card">
            <div className="px-4 py-2.5 border-b text-sm font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> 认证策略
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-primary hover:text-primary" onClick={onEditPolicy}>
                {policy ? "编辑策略" : "去设置"}
              </Button>
            </div>

            {!policy ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
                <div className="font-medium text-foreground">未设置</div>
                <div className="mt-1 text-xs">该租户尚未设置认证策略，点击右上角「去设置」配置认证规则</div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  <DetailKV
                    label="实名认证"
                    value={
                      policy.enabled ? (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">已开启</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">已关闭</Badge>
                      )
                    }
                  />
                  <DetailKV label="认证时机" value={policy.timing} />
                  <DetailKV
                    label="认证等级"
                    value={
                      levelInfo ? (
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {levelInfo.key} · {levelInfo.title}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {isPersonal ? levelInfo.personalTag : levelInfo.enterpriseTag}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    }
                  />
                  <DetailKV
                    label="人工复核"
                    value={policy.manualReview ? "需要人工复核" : "无需人工复核"}
                  />
                  {policy.manualReview && (
                    <>
                      <DetailKV label="审核超时" value={`${policy.reviewTimeoutHours} 小时`} />
                      <DetailKV label="审核通过后" value={policy.autoActivateAfterReview ? "自动激活" : "需手动激活"} />
                    </>
                  )}
                  <DetailKV
                    label="认证有效期"
                    value={policy.validityMonths === 0 ? "永久有效" : `${policy.validityMonths} 个月`}
                  />
                </div>

                {policy.timing === "使用敏感功能" && (
                  <div className="rounded-md border border-dashed bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground mb-2">敏感功能列表</div>
                    {policy.sensitiveFeatures.length === 0 ? (
                      <div className="text-xs text-muted-foreground">未配置</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {policy.sensitiveFeatures.map((f) => (
                          <Badge key={f} variant="outline" className="bg-background font-normal">{f}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {levelInfo && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground mb-2">所需认证要素</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(isPersonal ? levelInfo.personalFactors : levelInfo.enterpriseFactors).map((f) => (
                        <Badge key={f} variant="outline" className="bg-background font-normal">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailKV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5 break-words">{value}</div>
    </div>
  );
}

function TenantFormDialog({ open, onOpenChange, editing, onSubmit }: TenantFormProps) {
  const empty: Tenant = {
    id: "",
    name: "",
    intro: "",
    type: "企业用户",
    industry: INDUSTRIES[0],
    product: "",
    contact: "",
    contactPhone: "",
    coopContent: "",
    coopStatus: "合作中",
    authStatus: "待认证",
  };
  const [form, setForm] = useState<Tenant>(empty);

  // sync when opened
  useEffect(() => {
    if (open) setForm(editing ?? empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const set = <K extends keyof Tenant>(k: K, v: Tenant[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isEdit = !!editing;

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("请输入租户名称");
      return;
    }
    if (!form.type) {
      toast.error("请选择租户类型");
      return;
    }
    if (!form.industry) {
      toast.error("请选择所属行业");
      return;
    }
    if (!form.product.trim()) {
      toast.error("请输入主营产品");
      return;
    }
    if (!form.contact.trim()) {
      toast.error("请输入联系人 / 负责人");
      return;
    }
    if (!/^\d{6,20}$/.test(form.contactPhone.replace(/-/g, ""))) {
      toast.error("请输入合法的联系电话");
      return;
    }
    if (!form.coopContent.trim()) {
      toast.error("请输入合作内容");
      return;
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑租户" : "新增租户"}</DialogTitle>
          <DialogDescription>
            {isEdit ? `修改 ${editing?.name} 的基础信息与合作/认证状态` : "填写租户基础信息以创建新的接入记录"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {isEdit && (
            <div className="space-y-1.5 md:col-span-2">
              <Label>租户ID</Label>
              <Input value={editing?.id ?? ""} disabled className="font-mono text-xs" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>名称 <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="如：字节跳动" />
          </div>

          <div className="space-y-1.5">
            <Label>类型 <span className="text-destructive">*</span></Label>
            <Select value={form.type} onValueChange={(v) => set("type", v as TenantType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="个人用户">个人用户</SelectItem>
                <SelectItem value="企业用户">企业用户</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>行业 <span className="text-destructive">*</span></Label>
            <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>主营产品 <span className="text-destructive">*</span></Label>
            <Input value={form.product} onChange={(e) => set("product", e.target.value)} placeholder="如：数据中台" />
          </div>

          <div className="space-y-1.5">
            <Label>联系人 / 负责人 <span className="text-destructive">*</span></Label>
            <Input
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
              placeholder="如：张伟"
            />
          </div>

          <div className="space-y-1.5">
            <Label>联系电话 <span className="text-destructive">*</span></Label>
            <Input
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value.replace(/[^\d-]/g, ""))}
              placeholder="如：13800001234"
              inputMode="tel"
              maxLength={20}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>合作内容 <span className="text-destructive">*</span></Label>
            <Input value={form.coopContent} onChange={(e) => set("coopContent", e.target.value)} placeholder="如：数据接入 / 联合运营" />
          </div>

          <div className="space-y-1.5">
            <Label>合作状态</Label>
            <div className="flex h-9 items-center gap-3 rounded-md border border-input bg-background px-3">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-2">
                      <Switch
                        checked={form.coopStatus === "合作中"}
                        onCheckedChange={(v) => set("coopStatus", v ? "合作中" : "终止合作")}
                      />
                      <span
                        className={
                          "text-sm " +
                          (form.coopStatus === "合作中"
                            ? "text-foreground font-medium"
                            : "text-muted-foreground")
                        }
                      >
                        {form.coopStatus}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {form.coopStatus === "合作中" ? "点击终止合作" : "点击开启合作"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>认证状态</Label>
            <Select value={form.authStatus} onValueChange={(v) => set("authStatus", v as AuthStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="待认证">待认证</SelectItem>
                <SelectItem value="认证中">认证中</SelectItem>
                <SelectItem value="认证成功">认证成功</SelectItem>
                <SelectItem value="认证失败">认证失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>简介</Label>
            <Textarea
              value={form.intro}
              onChange={(e) => set("intro", e.target.value)}
              placeholder="租户简介，约 50-200 字"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit}>{isEdit ? "保存修改" : "创建租户"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TEMPLATE_COLUMNS: { key: string; label: string; required: boolean; example: string; note: string; options?: string[] }[] = [
  { key: "name", label: "名称", required: true, example: "字节跳动", note: "租户名称，须唯一" },
  { key: "type", label: "类型", required: true, example: "企业用户", note: "下拉选择：个人用户 / 企业用户", options: ["个人用户", "企业用户"] },
  { key: "industry", label: "行业", required: true, example: "互联网", note: "下拉选择平台支持的行业", options: INDUSTRIES },
  { key: "product", label: "主营产品", required: true, example: "数据中台", note: "租户主营产品/服务" },
  { key: "contact", label: "联系人", required: true, example: "张伟", note: "联系人 / 负责人姓名" },
  { key: "contactPhone", label: "联系电话", required: true, example: "13800001234", note: "6-20 位数字，可含 -" },
  { key: "coopContent", label: "合作内容", required: true, example: "数据接入 / 联合运营", note: "合作业务描述" },
  { key: "coopStatus", label: "合作状态", required: false, example: "合作中", note: "下拉选择，默认 合作中", options: ["合作中", "终止合作"] },
  { key: "authStatus", label: "认证状态", required: false, example: "待认证", note: "下拉选择，默认 待认证", options: ["待认证", "认证中", "认证成功", "认证失败"] },
  { key: "intro", label: "简介", required: false, example: "全球领先的内容平台…", note: "租户简介，建议 50-200 字" },
];

async function downloadTenantTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("租户导入");
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({
    header: c.required ? `${c.label}*` : c.label,
    key: c.key,
    width: Math.max(14, c.label.length * 3),
  }));
  // 表头样式
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFF3FA" },
  };
  // 必填表头红色
  TEMPLATE_COLUMNS.forEach((c, i) => {
    if (c.required) {
      ws.getRow(1).getCell(i + 1).font = { bold: true, color: { argb: "FFDC2626" } };
    }
  });
  // 示例行
  ws.addRow(TEMPLATE_COLUMNS.map((c) => c.example));
  ws.addRow(["示例科技", "企业用户", "金融", "智能风控平台", "李娜", "13900002345", "风控模型联合训练", "合作中", "认证中", "聚焦中小金融机构的智能风控服务"]);
  // 下拉校验：从第 2 行到 1000 行
  TEMPLATE_COLUMNS.forEach((c, i) => {
    if (!c.options) return;
    const colLetter = ws.getColumn(i + 1).letter;
    for (let r = 2; r <= 1000; r++) {
      ws.getCell(`${colLetter}${r}`).dataValidation = {
        type: "list",
        allowBlank: !c.required,
        formulae: [`"${c.options.join(",")}"`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "无效值",
        error: `请从下拉列表选择：${c.options.join(" / ")}`,
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
  a.download = "租户导入模板.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("模板已下载：租户导入模板.xlsx");
}

function ImportTenantsDialog({
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
            <Upload className="h-5 w-5 text-primary" /> 批量导入租户
          </DialogTitle>
          <DialogDescription>
            请先下载模板，按列填写后上传 CSV / Excel 文件。带 <span className="text-destructive font-medium">*</span> 的字段为必填项。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 模板下载 */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">租户导入模板.xlsx</div>
                <div className="text-xs text-muted-foreground">
                  含全部字段列标题、示例数据与下拉选项校验，支持 Excel / WPS 直接打开
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTenantTemplate}>
              <FileDown className="h-4 w-4" /> 下载模板
            </Button>
          </div>

          {/* 字段说明 */}
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
                    <TableHead className="w-44">示例</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TEMPLATE_COLUMNS.map((c) => (
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
                请确保列标题与模板完全一致；导入时系统将按上述规则校验，未通过校验的行将跳过并在结果中提示。
              </span>
            </div>
          </div>

          {/* 上传文件 */}
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

type Tone = "primary" | "amber" | "emerald" | "cyan";
const toneMap: Record<Tone, { bg: string; icon: string; ring: string }> = {
  primary: { bg: "from-primary/15 to-primary/0", icon: "bg-primary/15 text-primary", ring: "ring-primary/10" },
  amber: { bg: "from-amber-200/40 to-amber-100/0", icon: "bg-amber-100 text-amber-700", ring: "ring-amber-200/40" },
  emerald: { bg: "from-emerald-200/40 to-emerald-100/0", icon: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200/40" },
  cyan: { bg: "from-cyan-200/40 to-cyan-100/0", icon: "bg-cyan-100 text-cyan-700", ring: "ring-cyan-200/40" },
};

function StatCard({
  icon, label, mainValue, tone, subs,
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

interface AuthPolicyDialogProps {
  tenant: Tenant | null;
  existing?: AuthPolicy;
  onOpenChange: (o: boolean) => void;
  onSubmit: (p: AuthPolicy) => void;
}

function AuthPolicyDialog({ tenant, existing, onOpenChange, onSubmit }: AuthPolicyDialogProps) {
  const [policy, setPolicy] = useState<AuthPolicy>(DEFAULT_POLICY);
  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    if (tenant) {
      setPolicy(existing ?? DEFAULT_POLICY);
      setFeatureInput("");
    }
  }, [tenant, existing]);

  const set = <K extends keyof AuthPolicy>(k: K, v: AuthPolicy[K]) =>
    setPolicy((p) => ({ ...p, [k]: v }));

  const addFeature = () => {
    const v = featureInput.trim();
    if (!v) return;
    if (policy.sensitiveFeatures.includes(v)) {
      setFeatureInput("");
      return;
    }
    set("sensitiveFeatures", [...policy.sensitiveFeatures, v]);
    setFeatureInput("");
  };

  const removeFeature = (v: string) =>
    set("sensitiveFeatures", policy.sensitiveFeatures.filter((x) => x !== v));

  const isPersonal = tenant?.type === "个人用户";
  const isEdit = !!existing;

  return (
    <Dialog open={!!tenant} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            设置认证策略
          </DialogTitle>
          <DialogDescription>
            {tenant && (
              <>
                租户：<span className="text-foreground font-medium">{tenant.name}</span>
                <span className="ml-2 font-mono text-xs">{tenant.id}</span>
                <Badge variant="outline" className="ml-2 font-normal">{tenant.type}</Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 实名认证开关 */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div>
              <Label className="text-sm">开启实名认证</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                关闭后该租户将跳过实名认证流程
              </p>
            </div>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch
                      checked={policy.enabled}
                      onCheckedChange={(v) => set("enabled", v)}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {policy.enabled ? "点击关闭实名认证" : "点击开启实名认证"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <fieldset disabled={!policy.enabled} className="space-y-5 disabled:opacity-60">
            {/* 认证时机 */}
            <div className="space-y-2">
              <Label className="text-sm">认证时机</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["首次登录", "使用敏感功能"] as AuthTiming[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("timing", t)}
                    className={
                      "rounded-md border px-3 py-2.5 text-sm text-left transition-colors " +
                      (policy.timing === t
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-input hover:bg-accent/50 text-muted-foreground")
                    }
                  >
                    <div className="font-medium text-foreground">{t}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t === "首次登录" ? "用户首次登录即触发实名认证" : "访问指定敏感功能时触发"}
                    </div>
                  </button>
                ))}
              </div>

              {policy.timing === "使用敏感功能" && (
                <div className="mt-3 rounded-md border border-dashed bg-muted/20 p-3 space-y-2">
                  <Label className="text-xs text-muted-foreground">敏感功能列表</Label>
                  <div className="flex gap-2">
                    <Input
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFeature();
                        }
                      }}
                      placeholder="输入敏感功能名称，回车添加，如：发起提现"
                      className="h-9"
                    />
                    <Button type="button" variant="outline" onClick={addFeature}>
                      <Plus className="h-4 w-4" /> 添加
                    </Button>
                  </div>
                  {policy.sensitiveFeatures.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {policy.sensitiveFeatures.map((f) => (
                        <Badge
                          key={f}
                          variant="secondary"
                          className="gap-1 pr-1 font-normal"
                        >
                          {f}
                          <button
                            type="button"
                            onClick={() => removeFeature(f)}
                            className="rounded hover:bg-background/60 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">尚未添加，至少添加一项敏感功能</p>
                  )}
                </div>
              )}
            </div>

            {/* 认证等级 */}
            <div className="space-y-2">
              <Label className="text-sm">
                认证等级
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  （根据租户类型：{tenant?.type ?? "—"}）
                </span>
              </Label>
              <Select value={policy.level} onValueChange={(v) => set("level", v as LevelKey)}>
                <SelectTrigger className="h-auto min-h-10 py-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[--radix-select-trigger-width]">
                  {LEVEL_OPTIONS.map((l) => {
                    const factors = isPersonal ? l.personalFactors : l.enterpriseFactors;
                    const tag = isPersonal ? l.personalTag : l.enterpriseTag;
                    return (
                      <SelectItem key={l.key} value={l.key} className="py-2.5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{l.key} · {l.title}</span>
                            <span className="text-xs text-muted-foreground">{tag}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {factors.map((f) => (
                              <Badge
                                key={f}
                                variant="secondary"
                                className="text-[10px] font-normal py-0 px-1.5"
                              >
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* 人工审核配置 */}
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">人工审核配置</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    开启后认证信息需经人工复核
                  </p>
                </div>
                <Switch
                  checked={policy.manualReview}
                  onCheckedChange={(v) => set("manualReview", v)}
                />
              </div>

              <fieldset disabled={!policy.manualReview} className="grid grid-cols-1 md:grid-cols-2 gap-4 disabled:opacity-60">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">审核超时时间（小时）</Label>
                  <Input
                    type="number"
                    min={1}
                    value={policy.reviewTimeoutHours}
                    onChange={(e) => set("reviewTimeoutHours", Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">认证信息有效期（月，0 表示永久）</Label>
                  <Input
                    type="number"
                    min={0}
                    value={policy.validityMonths}
                    onChange={(e) => set("validityMonths", Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <Label className="text-sm">审核通过后自动激活</Label>
                  <Switch
                    checked={policy.autoActivateAfterReview}
                    onCheckedChange={(v) => set("autoActivateAfterReview", v)}
                  />
                </div>
              </fieldset>
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={() => {
              if (policy.enabled && policy.timing === "使用敏感功能" && policy.sensitiveFeatures.length === 0) {
                toast.error("请至少添加一项敏感功能");
                return;
              }
              onSubmit(policy);
            }}
          >
            {isEdit ? "保存修改" : "保存策略"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}