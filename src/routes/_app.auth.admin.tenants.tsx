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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  coopContent: string;
  coopStatus: CoopStatus;
  authStatus: AuthStatus;
}

const INDUSTRIES = ["金融", "电商", "制造", "教育", "医疗", "互联网", "物流"];

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
            <Button variant="outline" onClick={() => toast.info("打开导入租户")}>
              <Upload className="h-4 w-4" /> 导入租户
            </Button>
            <Button variant="outline" onClick={() => toast.success("已导出当前筛选结果")}>
              <Download className="h-4 w-4" /> 导出租户
            </Button>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="whitespace-nowrap">租户ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead className="min-w-[220px]">简介</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>行业</TableHead>
                <TableHead>主营产品</TableHead>
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
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    暂无匹配的租户
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((t) => (
                  <TableRow key={t.id} className="hover:bg-accent/30">
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">{t.intro}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">{t.type}</Badge>
                    </TableCell>
                    <TableCell>{t.industry}</TableCell>
                    <TableCell>{t.product}</TableCell>
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
                            <TooltipContent>查看 / 设置认证策略</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => toast.info(`查看 ${t.name}`)}>
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

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-muted-foreground">
            第 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} 条 / 共 {total} 条
          </div>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                const p = i + 1;
                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === page}
                      onClick={(e) => { e.preventDefault(); setPage(p); }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
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
    </div>
  );
}

interface TenantFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Tenant | null;
  onSubmit: (t: Tenant) => void;
}

function TenantFormDialog({ open, onOpenChange, editing, onSubmit }: TenantFormProps) {
  const empty: Tenant = {
    id: "",
    name: "",
    intro: "",
    type: "企业用户",
    industry: INDUSTRIES[0],
    product: "",
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
            <Label>类型</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v as TenantType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="个人用户">个人用户</SelectItem>
                <SelectItem value="企业用户">企业用户</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>行业</Label>
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
            <Label>主营产品</Label>
            <Input value={form.product} onChange={(e) => set("product", e.target.value)} placeholder="如：数据中台" />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>合作内容</Label>
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
            {isEdit ? "查看 / 编辑认证策略" : "设置认证策略"}
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