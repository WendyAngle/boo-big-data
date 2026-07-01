import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Wallet,
  Gem,
  Coins,
  ChevronRight,
  Search,
  Plus,
  Download,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { ListPagination } from "@/components/ListPagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/points/tenants")({
  head: () => ({ meta: [{ title: "积分管理系统 · 企业管理 | Boo数据平台" }] }),
  component: PointsTenantsPage,
});

const INDUSTRIES = ["金融", "电商", "制造", "教育", "医疗", "互联网", "物流"];
const CONTACT_NAMES = [
  "张伟", "王芳", "李娜", "刘洋", "陈思", "杨明",
  "赵磊", "黄雨", "周凯", "吴婷",
];
// 与 管理端·企业管理 保持一致的企业名称
const TENANT_NAMES = [
  "字节跳动", "蚂蚁集团", "美团点评", "京东物流", "宁德时代",
  "比亚迪汽车", "顺丰科技", "腾讯云", "阿里云", "网易严选",
];

interface PointsTenant {
  id: string;
  name: string;
  industry: string;
  contact: string;
  contactPhone: string;
  generalBalance: number;
  proBalance: number;
  totalRecharge: number; // 累计充值(元)
  totalSpend: number; // 累计消费(积分)
  enabled: boolean;
  createdAt: string;
}

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}
function nowStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const INITIAL: PointsTenant[] = Array.from({ length: 24 }).map((_, i) => {
  // 简单种子化的余额,保证可读性
  const g = ((i * 1373) % 90 + 5) * 1000;
  const p = ((i * 911) % 50 + 2) * 1000;
  const recharge = ((i * 7) % 20 + 1) * 5000;
  const spend = ((i * 13) % 60 + 4) * 1000;
  return {
    id: `PT${String(202600 + i + 1).padStart(6, "0")}`,
    name: `${TENANT_NAMES[i % TENANT_NAMES.length]}${i > 9 ? `(${i})` : ""}`,
    industry: INDUSTRIES[i % INDUSTRIES.length],
    contact: CONTACT_NAMES[i % CONTACT_NAMES.length],
    contactPhone: "138" + String(10000000 + ((i * 1357) % 89999999)).slice(0, 8),
    generalBalance: g,
    proBalance: p,
    totalRecharge: recharge,
    totalSpend: spend,
    enabled: i % 7 !== 0,
    createdAt: `2026-0${(i % 6) + 1}-${pad(((i * 7) % 27) + 1)} ${pad((i * 3) % 24)}:${pad((i * 11) % 60)}:00`,
  };
});

type Tone = "primary" | "amber" | "emerald" | "cyan";
const toneMap: Record<Tone, { bg: string; icon: string; ring: string }> = {
  primary: { bg: "from-primary/15 to-primary/0", icon: "bg-primary/15 text-primary", ring: "ring-primary/10" },
  amber: { bg: "from-amber-200/40 to-amber-100/0", icon: "bg-amber-100 text-amber-700", ring: "ring-amber-200/40" },
  emerald: { bg: "from-emerald-200/40 to-emerald-100/0", icon: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200/40" },
  cyan: { bg: "from-cyan-200/40 to-cyan-100/0", icon: "bg-cyan-100 text-cyan-700", ring: "ring-cyan-200/40" },
};
function StatCard({
  icon, label, mainValue, tone,
}: {
  icon: React.ReactNode;
  label: string;
  mainValue: string | number;
  tone: Tone;
}) {
  const t = toneMap[tone];
  return (
    <Card className={`relative overflow-hidden p-5 ring-1 ${t.ring}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${t.bg} pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{mainValue}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${t.icon}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function PointsTenantsPage() {
  const [data, setData] = useState<PointsTenant[]>(INITIAL);
  const [seq, setSeq] = useState(INITIAL.length);

  const [keyword, setKeyword] = useState("");
  const [industry, setIndustry] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PointsTenant | null>(null);
  const [viewing, setViewing] = useState<PointsTenant | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<PointsTenant | null>(null);
  const [delTarget, setDelTarget] = useState<PointsTenant | null>(null);

  const filtered = useMemo(() => {
    return data.filter((t) => {
      if (keyword) {
        const k = keyword.toLowerCase();
        if (!t.name.toLowerCase().includes(k) && !t.id.toLowerCase().includes(k)) return false;
      }
      if (industry !== "all" && t.industry !== industry) return false;
      if (status !== "all") {
        const want = status === "enabled";
        if (t.enabled !== want) return false;
      }
      return true;
    });
  }, [data, keyword, industry, status]);

  const total = filtered.length;
  const pageData = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  const stats = useMemo(() => {
    return {
      total: data.length,
      general: data.reduce((s, t) => s + t.generalBalance, 0),
      pro: data.reduce((s, t) => s + t.proBalance, 0),
      recharge: data.reduce((s, t) => s + t.totalRecharge, 0),
    };
  }, [data]);

  const reset = () => {
    setKeyword("");
    setIndustry("all");
    setStatus("all");
    setPage(1);
  };

  const exportData = () => {
    toast.success(`已导出 ${total} 条企业积分数据`);
  };

  const toggleEnabled = (t: PointsTenant) => {
    setData((d) => d.map((x) => (x.id === t.id ? { ...x, enabled: !x.enabled } : x)));
    toast.success(`已${t.enabled ? "停用" : "启用"} ${t.name}`);
  };

  const handleSubmit = (values: Omit<PointsTenant, "id" | "createdAt">) => {
    if (editing) {
      setData((d) => d.map((x) => (x.id === editing.id ? { ...editing, ...values } : x)));
      toast.success(`已更新 ${values.name}`);
    } else {
      const id = `PT${String(202600 + seq + 1).padStart(6, "0")}`;
      setData((d) => [{ id, createdAt: nowStr(), ...values }, ...d]);
      setSeq(seq + 1);
      toast.success(`已新增 ${values.name} (${id})`);
    }
    setFormOpen(false);
  };

  const handleAdjust = (
    target: PointsTenant,
    pointType: "general" | "pro",
    direction: "add" | "deduct",
    amount: number,
    reason: string,
  ) => {
    setData((d) =>
      d.map((x) => {
        if (x.id !== target.id) return x;
        const delta = direction === "add" ? amount : -amount;
        const cur = pointType === "general" ? x.generalBalance : x.proBalance;
        const next = Math.max(0, cur + delta);
        return pointType === "general"
          ? { ...x, generalBalance: next }
          : { ...x, proBalance: next };
      })
    );
    toast.success(
      `已${direction === "add" ? "增加" : "扣减"} ${target.name} ${pointType === "general" ? "通用" : "专业"}积分 ${amount.toLocaleString()}${reason ? ` · ${reason}` : ""}`
    );
    setAdjustTarget(null);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>积分管理系统</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">企业管理</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">企业管理</h1>
            <p className="text-white/85 text-sm mt-0.5">
              维护接入积分体系的企业基础信息、积分余额与充值消费台账,支持调整积分与启用状态
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="企业总数" mainValue={stats.total} tone="primary" />
        <StatCard icon={<Coins className="h-5 w-5" />} label="通用积分总余额" mainValue={stats.general.toLocaleString()} tone="cyan" />
        <StatCard icon={<Gem className="h-5 w-5" />} label="专业积分总余额" mainValue={stats.pro.toLocaleString()} tone="emerald" />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="累计充值 (元)" mainValue={stats.recharge.toLocaleString()} tone="amber" />
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              placeholder="搜索企业ID / 企业名称"
              className="pl-9"
            />
          </div>
          <Select value={industry} onValueChange={(v) => { setIndustry(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="全部行业" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部行业</SelectItem>
              {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="全部启用状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部启用状态</SelectItem>
              <SelectItem value="enabled">已启用</SelectItem>
              <SelectItem value="disabled">已停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> 重置
          </Button>
          <Button onClick={() => toast.success(`已应用筛选,共 ${total} 条`)}>
            <Search className="h-4 w-4" /> 搜索
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{total}</span> 条企业
          </div>
          <div className="flex flex-wrap gap-2" />
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="whitespace-nowrap">企业ID</TableHead>
                <TableHead className="whitespace-nowrap">企业名称</TableHead>
                <TableHead>行业</TableHead>
                <TableHead className="whitespace-nowrap">联系方式</TableHead>
                <TableHead className="text-right whitespace-nowrap">通用积分余额</TableHead>
                <TableHead className="text-right whitespace-nowrap">专业积分余额</TableHead>
                <TableHead className="text-right whitespace-nowrap">累计充值(元)</TableHead>
                <TableHead className="text-right whitespace-nowrap">累计消费积分</TableHead>
                <TableHead className="whitespace-nowrap">启用状态</TableHead>
                <TableHead className="whitespace-nowrap">创建时间</TableHead>
                <TableHead className="text-right whitespace-nowrap w-40">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">暂无匹配的企业</TableCell>
                </TableRow>
              ) : (
                pageData.map((t) => (
                  <TableRow key={t.id} className="hover:bg-accent/30">
                    <TableCell className="font-mono text-xs whitespace-nowrap">{t.id}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{t.name}</TableCell>
                    <TableCell>{t.industry}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">{t.contact}</div>
                      <div className="text-xs text-muted-foreground font-mono">{t.contactPhone}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {t.generalBalance.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                        {t.proBalance.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{t.totalRecharge.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{t.totalSpend.toLocaleString()}</TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={t.enabled}
                              onClick={() => toggleEnabled(t)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${t.enabled ? "bg-primary" : "bg-input"}`}
                            >
                              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition-transform ${t.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t.enabled ? "点击停用" : "点击启用"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">{t.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setViewing(t)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看详情</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(t)}>
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>调整积分</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setFormOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDelTarget(t)}>
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

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={handleSubmit}
      />

      <TenantDetailDialog tenant={viewing} onOpenChange={(o) => !o && setViewing(null)} />

      <AdjustPointsDialog
        target={adjustTarget}
        onOpenChange={(o) => !o && setAdjustTarget(null)}
        onSubmit={handleAdjust}
      />

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该企业?</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复,{delTarget?.name} 的积分余额与历史台账将被清除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!delTarget) return;
                setData((d) => d.filter((x) => x.id !== delTarget.id));
                toast.success(`已删除 ${delTarget.name}`);
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

/* ============== Dialogs ============== */

function TenantFormDialog({
  open, onOpenChange, editing, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: PointsTenant | null;
  onSubmit: (v: Omit<PointsTenant, "id" | "createdAt">) => void;
}) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [contact, setContact] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [generalBalance, setGeneralBalance] = useState("0");
  const [proBalance, setProBalance] = useState("0");
  const [enabled, setEnabled] = useState(true);

  // 同步打开
  useMemo(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setIndustry(editing.industry);
        setContact(editing.contact);
        setContactPhone(editing.contactPhone);
        setGeneralBalance(String(editing.generalBalance));
        setProBalance(String(editing.proBalance));
        setEnabled(editing.enabled);
      } else {
        setName("");
        setIndustry(INDUSTRIES[0]);
        setContact("");
        setContactPhone("");
        setGeneralBalance("0");
        setProBalance("0");
        setEnabled(true);
      }
    }
  }, [open, editing]);

  const submit = () => {
    if (!name.trim()) return toast.error("请输入企业名称");
    if (!contact.trim()) return toast.error("请输入联系人");
    if (!/^1\d{10}$/.test(contactPhone.trim())) return toast.error("请输入正确的手机号");
    onSubmit({
      name: name.trim(),
      industry,
      contact: contact.trim(),
      contactPhone: contactPhone.trim(),
      generalBalance: Math.max(0, Number(generalBalance) || 0),
      proBalance: Math.max(0, Number(proBalance) || 0),
      totalRecharge: editing?.totalRecharge ?? 0,
      totalSpend: editing?.totalSpend ?? 0,
      enabled,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑企业" : "新增企业"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改企业基础信息与初始余额" : "新增接入积分体系的企业"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>企业名称<span className="text-destructive ml-0.5">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入企业名称" maxLength={50} />
          </div>
          <div>
            <Label>行业</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>启用状态</Label>
            <Select value={enabled ? "1" : "0"} onValueChange={(v) => setEnabled(v === "1")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">启用</SelectItem>
                <SelectItem value="0">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>联系人<span className="text-destructive ml-0.5">*</span></Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="联系人姓名" maxLength={20} />
          </div>
          <div>
            <Label>联系电话<span className="text-destructive ml-0.5">*</span></Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="11 位手机号" maxLength={11} />
          </div>
          <div>
            <Label>初始通用积分</Label>
            <Input value={generalBalance} onChange={(e) => setGeneralBalance(e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </div>
          <div>
            <Label>初始专业积分</Label>
            <Input value={proBalance} onChange={(e) => setProBalance(e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit}>{editing ? "保存" : "新增"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TenantDetailDialog({
  tenant, onOpenChange,
}: {
  tenant: PointsTenant | null;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={!!tenant} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>企业详情</DialogTitle>
          <DialogDescription>{tenant?.name} · {tenant?.id}</DialogDescription>
        </DialogHeader>
        {tenant && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <KV label="企业ID" value={<span className="font-mono">{tenant.id}</span>} />
              <KV label="企业名称" value={tenant.name} />
              <KV label="行业" value={tenant.industry} />
              <KV label="启用状态" value={
                <Badge variant="outline" className={tenant.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"}>
                  {tenant.enabled ? "已启用" : "已停用"}
                </Badge>
              } />
              <KV label="联系人" value={tenant.contact} />
              <KV label="联系电话" value={<span className="font-mono">{tenant.contactPhone}</span>} />
              <KV label="创建时间" value={<span className="font-mono text-xs">{tenant.createdAt}</span>} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <BalanceCard label="通用积分余额" value={tenant.generalBalance} tone="bg-blue-50 text-blue-700" />
              <BalanceCard label="专业积分余额" value={tenant.proBalance} tone="bg-violet-50 text-violet-700" />
              <BalanceCard label="累计充值 (元)" value={tenant.totalRecharge} tone="bg-amber-50 text-amber-700" />
              <BalanceCard label="累计消费积分" value={tenant.totalSpend} tone="bg-rose-50 text-rose-700" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
function BalanceCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${tone}`}>
      <div className="text-xs opacity-75">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

function AdjustPointsDialog({
  target, onOpenChange, onSubmit,
}: {
  target: PointsTenant | null;
  onOpenChange: (o: boolean) => void;
  onSubmit: (
    target: PointsTenant,
    pointType: "general" | "pro",
    direction: "add" | "deduct",
    amount: number,
    reason: string,
  ) => void;
}) {
  const [pointType, setPointType] = useState<"general" | "pro">("general");
  const [direction, setDirection] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useMemo(() => {
    if (target) {
      setPointType("general");
      setDirection("add");
      setAmount("");
      setReason("");
    }
  }, [target]);

  const submit = () => {
    if (!target) return;
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("请输入正确的积分数量");
    const cur = pointType === "general" ? target.generalBalance : target.proBalance;
    if (direction === "deduct" && n > cur)
      return toast.error(`扣减数量不能超过当前余额 ${cur.toLocaleString()}`);
    onSubmit(target, pointType, direction, n, reason.trim());
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>调整积分</DialogTitle>
          <DialogDescription>
            {target?.name} · 当前通用 {target?.generalBalance.toLocaleString()} / 专业 {target?.proBalance.toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>积分类型</Label>
              <Select value={pointType} onValueChange={(v) => setPointType(v as "general" | "pro")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">通用积分</SelectItem>
                  <SelectItem value="pro">专业积分</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>操作方向</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as "add" | "deduct")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">增加</SelectItem>
                  <SelectItem value="deduct">扣减</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>积分数量<span className="text-destructive ml-0.5">*</span></Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="请输入积分数量" />
          </div>
          <div>
            <Label>调整原因</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请输入调整原因(可选)" rows={3} maxLength={200} />
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            提示:调整将生成一条积分流水记录。
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit}>提交</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}