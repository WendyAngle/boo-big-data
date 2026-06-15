import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  ChevronRight,
  Search,
  RotateCcw,
  Download,
  Eye,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Clock,
  ExternalLink,
  ScanFace,
  Upload,
  CreditCard,
  Smartphone,
  FileText,
  User as UserIcon,
  Building2,
  RefreshCcw,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

export const Route = createFileRoute("/_app/auth/admin/audit")({
  head: () => ({ meta: [{ title: "实名审核 | Boo数据平台" }] }),
  component: AuditPage,
});

type Subject = "个人" | "企业";
type LevelKey = "L1" | "L2" | "L3" | "L4";
type Status = "待审核" | "审核中" | "已通过" | "已驳回";
type ProviderId = "platform" | "alipay" | "wechat" | "unionpay" | "cfca";

type FieldType = "text" | "id" | "phone" | "upload" | "face" | "bank";
type FieldDef = { key: string; label: string; type: FieldType };

const PERSONAL_FIELDS: Record<LevelKey, FieldDef[]> = {
  L1: [
    { key: "name", label: "真实姓名", type: "text" },
    { key: "idNo", label: "身份证号", type: "id" },
  ],
  L2: [
    { key: "name", label: "真实姓名", type: "text" },
    { key: "idNo", label: "身份证号", type: "id" },
    { key: "phone", label: "本人手机号", type: "phone" },
  ],
  L3: [
    { key: "name", label: "真实姓名", type: "text" },
    { key: "idNo", label: "身份证号", type: "id" },
    { key: "phone", label: "本人手机号", type: "phone" },
    { key: "face", label: "人脸识别", type: "face" },
  ],
  L4: [
    { key: "name", label: "真实姓名", type: "text" },
    { key: "idNo", label: "身份证号", type: "id" },
    { key: "phone", label: "本人手机号", type: "phone" },
    { key: "face", label: "人脸识别", type: "face" },
    { key: "bank", label: "本人银行卡", type: "bank" },
  ],
};

const ENTERPRISE_FIELDS: Record<LevelKey, FieldDef[]> = {
  L1: [
    { key: "companyName", label: "企业名称", type: "text" },
    { key: "uscc", label: "统一社会信用代码", type: "text" },
    { key: "legalName", label: "法人姓名", type: "text" },
    { key: "legalIdNo", label: "法人身份证号", type: "id" },
  ],
  L2: [
    { key: "companyName", label: "企业名称", type: "text" },
    { key: "uscc", label: "统一社会信用代码", type: "text" },
    { key: "legalName", label: "法人姓名", type: "text" },
    { key: "legalIdNo", label: "法人身份证号", type: "id" },
    { key: "legalPhone", label: "法人手机号", type: "phone" },
  ],
  L3: [
    { key: "companyName", label: "企业名称", type: "text" },
    { key: "uscc", label: "统一社会信用代码", type: "text" },
    { key: "license", label: "营业执照", type: "upload" },
    { key: "legalName", label: "法人姓名", type: "text" },
    { key: "legalIdNo", label: "法人身份证号", type: "id" },
    { key: "legalPhone", label: "法人手机号", type: "phone" },
    { key: "legalFace", label: "法人人脸识别", type: "face" },
  ],
  L4: [
    { key: "companyName", label: "企业名称", type: "text" },
    { key: "uscc", label: "统一社会信用代码", type: "text" },
    { key: "license", label: "营业执照", type: "upload" },
    { key: "legalName", label: "法人姓名", type: "text" },
    { key: "legalIdNo", label: "法人身份证号", type: "id" },
    { key: "legalPhone", label: "法人手机号", type: "phone" },
    { key: "legalFace", label: "法人人脸识别", type: "face" },
    { key: "bankAccount", label: "对公账户", type: "bank" },
  ],
};

const LEVEL_META: Record<LevelKey, { title: string; tag: string; color: string }> = {
  L1: { title: "基础认证", tag: "二要素", color: "bg-sky-100 text-sky-700 border-sky-200" },
  L2: { title: "三要素认证", tag: "三要素", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  L3: { title: "人脸核身", tag: "人脸核身", color: "bg-teal-100 text-teal-700 border-teal-200" },
  L4: { title: "完整认证", tag: "四要素 / 对公", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const PROVIDERS: Record<ProviderId, { name: string; short: string; color: string; isThirdParty: boolean; channel: string }> = {
  platform: { name: "平台直连", short: "B", color: "bg-gradient-to-br from-primary to-accent text-primary-foreground", isThirdParty: false, channel: "运营商三要素 / 公安一所" },
  alipay: { name: "支付宝实名", short: "支", color: "bg-blue-500 text-white", isThirdParty: true, channel: "支付宝实人认证 OpenAPI" },
  wechat: { name: "微信支付实名", short: "微", color: "bg-green-500 text-white", isThirdParty: true, channel: "微信小程序人脸核身" },
  unionpay: { name: "银联云闪付", short: "银", color: "bg-rose-500 text-white", isThirdParty: true, channel: "银联四要素鉴权" },
  cfca: { name: "CFCA 数字证书", short: "C", color: "bg-amber-500 text-white", isThirdParty: true, channel: "CFCA 企业证书核验" },
};

const STATUS_BADGE: Record<Status, string> = {
  待审核: "bg-muted text-muted-foreground border-border",
  审核中: "bg-amber-100 text-amber-700 border-amber-200",
  已通过: "bg-emerald-100 text-emerald-700 border-emerald-200",
  已驳回: "bg-rose-100 text-rose-700 border-rose-200",
};

interface AuditItem {
  id: string;
  tenantId: string;
  tenantName: string;
  subject: Subject;
  applicantName: string;
  level: LevelKey;
  provider: ProviderId;
  status: Status;
  submittedAt: string;
  data: Record<string, string>;
  thirdParty?: {
    traceId: string;
    callbackAt: string;
    conclusion: "PASS" | "FAIL" | "REVIEW";
    riskScore: number;
  };
  reviewer?: string;
  reviewedAt?: string;
  rejectReason?: string;
  comment?: string;
}

const TENANT_POOL = [
  ["T202600", "字节跳动"],
  ["T202601", "蚂蚁集团"],
  ["T202602", "美团点评"],
  ["T202603", "京东物流"],
  ["T202604", "宁德时代"],
  ["T202605", "比亚迪汽车"],
  ["T202606", "顺丰科技"],
  ["T202607", "腾讯云"],
  ["T202608", "阿里云"],
  ["T202609", "网易严选"],
] as const;

const PERSON_NAMES = ["张伟", "王芳", "李娜", "刘洋", "陈思", "杨明", "赵磊", "黄雨", "周凯", "吴婷", "徐航", "孙悦"];

const LEVELS: LevelKey[] = ["L1", "L2", "L3", "L4"];
const PROVIDER_IDS: ProviderId[] = ["platform", "alipay", "wechat", "unionpay", "cfca"];
const STATUSES: Status[] = ["待审核", "审核中", "已通过", "已驳回"];

function maskId(s: string) {
  if (s.length < 8) return s;
  return s.slice(0, 4) + "********" + s.slice(-4);
}
function maskPhone(s: string) {
  if (s.length < 7) return s;
  return s.slice(0, 3) + "****" + s.slice(-4);
}

function buildData(subject: Subject, level: LevelKey, personName: string, tenantName: string): Record<string, string> {
  const idNo = "11010119" + String(8000 + Math.floor(Math.random() * 1500)) + String(Math.floor(1000 + Math.random() * 9000));
  const phone = "138" + String(10000000 + Math.floor(Math.random() * 89999999));
  if (subject === "个人") {
    return {
      name: personName,
      idNo,
      phone,
      face: "活体检测通过",
      bank: "6225 **** **** 8821",
    };
  }
  return {
    companyName: tenantName + "有限公司",
    uscc: "9111010" + String(10000000 + Math.floor(Math.random() * 89999999)) + "X",
    license: "营业执照-2026.jpg",
    legalName: personName,
    legalIdNo: idNo,
    legalPhone: phone,
    legalFace: "活体检测通过",
    bankAccount: "工商银行 6228 **** **** 0033",
  };
}

function makeItem(i: number): AuditItem {
  const subject: Subject = i % 3 === 0 ? "企业" : "个人";
  const level = LEVELS[i % 4];
  const provider = PROVIDER_IDS[i % 5];
  const status = STATUSES[i % 4];
  const [tid, tname] = TENANT_POOL[i % TENANT_POOL.length];
  const personName = PERSON_NAMES[i % PERSON_NAMES.length];
  const d = new Date(2026, 5, 15 - (i % 14), 9 + (i % 9), (i * 7) % 60);
  const submittedAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const thirdParty = PROVIDERS[provider].isThirdParty
    ? {
        traceId: provider.toUpperCase() + "-" + String(2026060000 + i),
        callbackAt: submittedAt,
        conclusion: (status === "已驳回" ? "FAIL" : status === "已通过" ? "PASS" : "REVIEW") as "PASS" | "FAIL" | "REVIEW",
        riskScore: 30 + ((i * 13) % 65),
      }
    : undefined;
  return {
    id: "A" + String(202606000 + i),
    tenantId: tid + String(i),
    tenantName: tname,
    subject,
    applicantName: personName,
    level,
    provider,
    status,
    submittedAt,
    data: buildData(subject, level, personName, tname),
    thirdParty,
    reviewer: status === "已通过" || status === "已驳回" ? "admin@boo" : undefined,
    reviewedAt: status === "已通过" || status === "已驳回" ? submittedAt : undefined,
    rejectReason: status === "已驳回" ? "证件照不清晰，请重新上传" : undefined,
  };
}

const INITIAL: AuditItem[] = Array.from({ length: 38 }).map((_, i) => makeItem(i));

const REJECT_REASONS = [
  "资料模糊不清，无法识别",
  "提交信息与权威源不符",
  "疑似风险账户，需进一步核查",
  "证件已过期",
  "其他（见审核意见）",
];

function AuditPage() {
  const [data, setData] = useState<AuditItem[]>(INITIAL);
  const [keyword, setKeyword] = useState("");
  const [subject, setSubject] = useState("all");
  const [level, setLevel] = useState("all");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [passConfirm, setPassConfirm] = useState<
    { kind: "one"; item: AuditItem } | { kind: "batch"; ids: string[] } | null
  >(null);
  const [batchRejectConfirm, setBatchRejectConfirm] = useState<string[] | null>(null);
  const [detail, setDetail] = useState<AuditItem | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [rejectComment, setRejectComment] = useState("");
  const [comment, setComment] = useState("");

  const filtered = useMemo(() => {
    return data.filter((t) => {
      if (keyword && !(`${t.id} ${t.tenantName} ${t.applicantName}`.toLowerCase().includes(keyword.toLowerCase()))) return false;
      if (subject !== "all" && t.subject !== subject) return false;
      if (level !== "all" && t.level !== level) return false;
      if (provider !== "all" && t.provider !== provider) return false;
      if (status !== "all" && t.status !== status) return false;
      return true;
    });
  }, [data, keyword, subject, level, provider, status]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const c = (s: Status) => data.filter((d) => d.status === s).length;
    return { pending: c("待审核"), auditing: c("审核中"), passed: c("已通过"), rejected: c("已驳回") };
  }, [data]);

  const reset = () => {
    setKeyword(""); setSubject("all"); setLevel("all"); setProvider("all"); setStatus("all"); setPage(1);
  };

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    const ids = pageData.filter((t) => t.status === "待审核" || t.status === "审核中").map((t) => t.id);
    setSelected((s) => {
      const allOn = ids.every((id) => s.has(id));
      const n = new Set(s);
      ids.forEach((id) => { if (allOn) n.delete(id); else n.add(id); });
      return n;
    });
  };

  const applyDecision = (ids: string[], decision: "已通过" | "已驳回", reason?: string) => {
    const now = "2026-06-15 14:30";
    setData((arr) => arr.map((t) => ids.includes(t.id) && (t.status === "待审核" || t.status === "审核中") ? {
      ...t,
      status: decision,
      reviewer: "admin@boo",
      reviewedAt: now,
      rejectReason: decision === "已驳回" ? reason : undefined,
    } : t));
    setSelected(new Set());
  };

  const passOne = (t: AuditItem) => {
    setPassConfirm({ kind: "one", item: t });
  };
  const doPassOne = (t: AuditItem) => {
    applyDecision([t.id], "已通过");
    toast.success(`已通过 ${t.id}`);
  };
  const rejectOne = (t: AuditItem) => {
    setDetail(t);
    setRejectOpen(true);
  };
  const confirmReject = () => {
    if (!detail) return;
    applyDecision([detail.id], "已驳回", `${rejectReason}${rejectComment ? " · " + rejectComment : ""}`);
    toast.success(`已驳回 ${detail.id}`);
    setRejectOpen(false);
    setRejectComment("");
    setDetail(null);
  };
  const batchPass = () => {
    if (selected.size === 0) return toast.error("请先选择申请单");
    setPassConfirm({ kind: "batch", ids: Array.from(selected) });
  };
  const batchReject = () => {
    if (selected.size === 0) return toast.error("请先选择申请单");
    setBatchRejectConfirm(Array.from(selected));
  };
  const confirmPass = () => {
    if (!passConfirm) return;
    if (passConfirm.kind === "one") {
      doPassOne(passConfirm.item);
    } else {
      applyDecision(passConfirm.ids, "已通过");
      toast.success(`批量通过 ${passConfirm.ids.length} 条`);
    }
    setPassConfirm(null);
  };
  const confirmBatchReject = () => {
    if (!batchRejectConfirm) return;
    applyDecision(batchRejectConfirm, "已驳回", "批量驳回 · 请补充资料");
    toast.success(`批量驳回 ${batchRejectConfirm.length} 条`);
    setBatchRejectConfirm(null);
  };

  const recheck = (t: AuditItem) => {
    toast.info(`正在重新调用「${PROVIDERS[t.provider].name}」核验通道…`);
    setTimeout(() => toast.success("核验通道已重新调用，结果将异步回传"), 800);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>实名认证</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/auth/admin" className="hover:text-foreground">管理端</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">实名审核</span>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">实名审核</h1>
            <p className="text-white/85 text-sm mt-0.5">
              对个人 / 企业实名认证申请进行人工复核，支持第三方渠道结果联动与批量处理
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<ShieldAlert className="h-5 w-5" />} label="待审核" value={stats.pending} tone="muted" hint="等待人工接单" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="审核中" value={stats.auditing} tone="amber" hint="第三方回调中 / 人工复核中" />
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="已通过" value={stats.passed} tone="emerald" hint="今日 +3" />
        <StatCard icon={<ShieldX className="h-5 w-5" />} label="已驳回" value={stats.rejected} tone="rose" hint="今日 +1" />
      </div>

      {/* Filter */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="xl:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder="搜索申请单号 / 租户 / 申请人" className="pl-9" />
          </div>
          <Select value={subject} onValueChange={(v) => { setSubject(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="主体类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部主体</SelectItem>
              <SelectItem value="个人">个人</SelectItem>
              <SelectItem value="企业">企业</SelectItem>
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={(v) => { setLevel(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="认证等级" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部等级</SelectItem>
              {LEVELS.map((l) => <SelectItem key={l} value={l}>{l} · {LEVEL_META[l].title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={(v) => { setProvider(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="认证渠道" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部渠道</SelectItem>
              {PROVIDER_IDS.map((p) => <SelectItem key={p} value={p}>{PROVIDERS[p].name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="审核状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /> 重置</Button>
          <Button onClick={() => toast.success(`已应用筛选，共 ${total} 条`)}><Search className="h-4 w-4" /> 搜索</Button>
        </div>
      </Card>

      {/* Table + Actions */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{total}</span> 条申请记录
            {selected.size > 0 && <span className="ml-3 text-primary">已选 {selected.size} 条</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={batchPass} disabled={selected.size === 0}><Check className="h-4 w-4" /> 批量通过</Button>
            <Button variant="outline" onClick={batchReject} disabled={selected.size === 0}><X className="h-4 w-4" /> 批量驳回</Button>
            <Button variant="outline" onClick={() => toast.success("已导出当前筛选结果")}><Download className="h-4 w-4" /> 导出</Button>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="whitespace-nowrap">申请单号</TableHead>
                <TableHead>租户 / 申请人</TableHead>
                <TableHead>主体</TableHead>
                <TableHead>认证等级</TableHead>
                <TableHead>认证渠道</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">暂无匹配的申请单</TableCell></TableRow>
              ) : pageData.map((t) => {
                const canAct = t.status === "待审核" || t.status === "审核中";
                const p = PROVIDERS[t.provider];
                return (
                  <TableRow key={t.id} className="hover:bg-accent/30">
                    <TableCell>
                      <Checkbox
                        checked={selected.has(t.id)}
                        disabled={!canAct}
                        onCheckedChange={() => toggle(t.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{t.tenantName}</div>
                      <div className="text-xs text-muted-foreground">{t.applicantName} · {t.tenantId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal gap-1">
                        {t.subject === "个人" ? <UserIcon className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                        {t.subject}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={LEVEL_META[t.level].color}>
                        {t.level} · {LEVEL_META[t.level].title}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold ${p.color}`}>{p.short}</div>
                        <span className="text-sm">{p.name}</span>
                        {p.isThirdParty && <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">第三方</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{t.submittedAt}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_BADGE[t.status]}>{t.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => { setDetail(t); setComment(""); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看审核详情</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button size="sm" variant="ghost" disabled={!canAct} onClick={() => passOne(t)} className="text-emerald-600 hover:text-emerald-700">
                                  <Check className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{canAct ? "审核通过" : "当前状态不可操作"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button size="sm" variant="ghost" disabled={!canAct} onClick={() => rejectOne(t)} className="text-rose-600 hover:text-rose-700">
                                  <X className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{canAct ? "审核驳回" : "当前状态不可操作"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-end">
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} /></PaginationItem>
              {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink isActive={page === i + 1} onClick={() => setPage(i + 1)}>{i + 1}</PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem><PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} /></PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail && !rejectOpen} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>审核详情</span>
                  <Badge variant="outline" className={STATUS_BADGE[detail.status]}>{detail.status}</Badge>
                  <Badge variant="outline" className={LEVEL_META[detail.level].color}>{detail.level} · {LEVEL_META[detail.level].title}</Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-3 flex-wrap pt-1">
                  <span className="font-mono text-xs">{detail.id}</span>
                  <span>·</span>
                  <span>{detail.tenantName} / {detail.applicantName}</span>
                  <span>·</span>
                  <span>提交于 {detail.submittedAt}</span>
                </DialogDescription>
              </DialogHeader>

              <DetailBody detail={detail} comment={comment} setComment={setComment} onRecheck={() => recheck(detail)} />

              {(detail.status === "待审核" || detail.status === "审核中") ? (
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setDetail(null)}>关闭</Button>
                  <Button variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => setRejectOpen(true)}>
                    <X className="h-4 w-4" /> 驳回
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { passOne(detail); setDetail(null); }}>
                    <Check className="h-4 w-4" /> 通过审核
                  </Button>
                </DialogFooter>
              ) : (
                <DialogFooter><Button variant="outline" onClick={() => setDetail(null)}>关闭</Button></DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>驳回申请</DialogTitle>
            <DialogDescription>请选择驳回原因并填写说明，将同步通知申请人</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>驳回原因</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REJECT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>审核备注</Label>
              <Textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="可补充驳回说明，将展示给申请人…" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>取消</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={confirmReject}>确认驳回</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pass confirmation */}
      <AlertDialog open={!!passConfirm} onOpenChange={(o) => !o && setPassConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {passConfirm?.kind === "batch"
                ? `确认批量通过 ${passConfirm.ids.length} 条申请？`
                : `确认通过申请 ${passConfirm?.kind === "one" ? passConfirm.item.id : ""}？`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {passConfirm?.kind === "batch"
                ? "通过后将更新所选申请单的认证状态，仅对状态为「待审核 / 审核中」的申请生效，操作不可撤销。"
                : passConfirm?.kind === "one"
                  ? `该申请将被标记为「已通过」，申请人 ${passConfirm.item.applicantName}（${passConfirm.item.tenantName}）将收到通知，操作不可撤销。`
                  : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={confirmPass}>
              确认通过
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch reject confirmation */}
      <AlertDialog open={!!batchRejectConfirm} onOpenChange={(o) => !o && setBatchRejectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认批量驳回 {batchRejectConfirm?.length ?? 0} 条申请？
            </AlertDialogTitle>
            <AlertDialogDescription>
              驳回原因将统一记录为「批量驳回 · 请补充资料」，仅对状态为「待审核 / 审核中」的申请生效，操作不可撤销。如需为单条申请填写具体原因，请在操作列单条驳回。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={confirmBatchReject}>
              确认驳回
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon, label, value, tone, hint }: { icon: React.ReactNode; label: string; value: number; tone: "muted" | "amber" | "emerald" | "rose"; hint?: string }) {
  const toneCls: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold mt-1 tabular-nums">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneCls[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}

function FieldIcon({ type }: { type: FieldType }) {
  const map: Record<FieldType, React.ReactNode> = {
    text: <FileText className="h-4 w-4" />,
    id: <FileText className="h-4 w-4" />,
    phone: <Smartphone className="h-4 w-4" />,
    upload: <Upload className="h-4 w-4" />,
    face: <ScanFace className="h-4 w-4" />,
    bank: <CreditCard className="h-4 w-4" />,
  };
  return <span className="text-muted-foreground">{map[type]}</span>;
}

function DetailBody({ detail, comment, setComment, onRecheck }: { detail: AuditItem; comment: string; setComment: (v: string) => void; onRecheck: () => void }) {
  const fields = detail.subject === "个人" ? PERSONAL_FIELDS[detail.level] : ENTERPRISE_FIELDS[detail.level];
  const p = PROVIDERS[detail.provider];

  return (
    <div className="space-y-5">
      {/* Channel result card */}
      <Card className={`p-4 border ${p.isThirdParty ? "border-blue-200 bg-blue-50/40" : "border-primary/20 bg-primary/5"}`}>
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold ${p.color}`}>{p.short}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-semibold">{p.name}</div>
              {p.isThirdParty ? (
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">第三方回传</Badge>
              ) : (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">平台直连</Badge>
              )}
              <span className="text-xs text-muted-foreground">底层通道：{p.channel}</span>
            </div>
            {detail.thirdParty ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                <KV k="外部 traceId" v={<span className="font-mono text-xs">{detail.thirdParty.traceId}</span>} />
                <KV k="回调时间" v={detail.thirdParty.callbackAt} />
                <KV k="核验结论" v={
                  <Badge variant="outline" className={
                    detail.thirdParty.conclusion === "PASS" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : detail.thirdParty.conclusion === "FAIL" ? "bg-rose-100 text-rose-700 border-rose-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                  }>{detail.thirdParty.conclusion}</Badge>
                } />
                <KV k="风险评分" v={<span className={`font-semibold ${detail.thirdParty.riskScore < 40 ? "text-emerald-600" : detail.thirdParty.riskScore < 70 ? "text-amber-600" : "text-rose-600"}`}>{detail.thirdParty.riskScore} / 100</span>} />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-sm">
                <KV k="调用通道" v="运营商三要素 + 公安一所" />
                <KV k="响应时间" v="382 ms" />
                <KV k="核验结论" v={<Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">PASS</Badge>} />
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
              <ExternalLink className="h-3 w-3" />
              {p.isThirdParty ? "以下资料由第三方渠道回传，平台不可修改" : "以下资料由用户在平台填写并通过直连通道核验"}
              <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={onRecheck}>
                <RefreshCcw className="h-3.5 w-3.5" /> 重新核验
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Dynamic fields per level */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> 提交资料
          </div>
          <div className="text-xs text-muted-foreground">
            按 <span className="font-medium text-foreground">{detail.level} · {LEVEL_META[detail.level].title}</span> 所需字段展示（共 {fields.length} 项）
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {fields.map((f) => {
            const raw = detail.data[f.key] ?? "—";
            let display: React.ReactNode = raw;
            if (f.type === "id") display = <span className="font-mono">{maskId(raw)}</span>;
            else if (f.type === "phone") display = <span className="font-mono">{maskPhone(raw)}</span>;
            else if (f.type === "upload") {
              display = (
                <div className="flex items-center gap-2">
                  <div className="h-12 w-16 rounded border bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm">{raw}</div>
                    <button className="text-xs text-primary hover:underline" onClick={() => toast.info("打开预览")}>查看大图</button>
                  </div>
                </div>
              );
            } else if (f.type === "face") {
              display = (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">活体检测通过</Badge>
                  <span className="text-xs text-muted-foreground">置信度 99.7%</span>
                </div>
              );
            } else if (f.type === "bank") {
              display = <span className="font-mono">{raw}</span>;
            }
            return (
              <div key={f.key} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-md bg-muted/60 flex items-center justify-center">
                  <FieldIcon type={f.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className="text-sm font-medium mt-0.5 truncate">{display}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          不同等级所需资料不同：L1 二要素 · L2 + 手机号 · L3 + 人脸 · L4 + 银行卡 / 对公账户
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-5">
        <div className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> 核验流程时间线
        </div>
        <ol className="relative border-l border-border ml-3 space-y-4">
          <TimelineNode icon={<UserIcon className="h-3 w-3" />} title="用户提交申请" time={detail.submittedAt} done />
          <TimelineNode
            icon={<ExternalLink className="h-3 w-3" />}
            title={p.isThirdParty ? `跳转 ${p.name} 核验` : "调用平台直连通道"}
            time={detail.submittedAt}
            done
          />
          <TimelineNode
            icon={<CheckCircle2 className="h-3 w-3" />}
            title={`渠道回调：${detail.thirdParty?.conclusion ?? "PASS"}（风险评分 ${detail.thirdParty?.riskScore ?? 22}）`}
            time={detail.thirdParty?.callbackAt ?? detail.submittedAt}
            done
          />
          <TimelineNode
            icon={<ClipboardCheck className="h-3 w-3" />}
            title={detail.status === "已通过" ? `人工复核通过（${detail.reviewer}）` : detail.status === "已驳回" ? `人工驳回：${detail.rejectReason}` : "等待人工复核"}
            time={detail.reviewedAt ?? "—"}
            done={detail.status === "已通过" || detail.status === "已驳回"}
            tone={detail.status === "已驳回" ? "rose" : detail.status === "已通过" ? "emerald" : "muted"}
          />
        </ol>
      </Card>

      {/* Review comment */}
      {(detail.status === "待审核" || detail.status === "审核中") && (
        <div className="space-y-2">
          <Label>审核意见（可选）</Label>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="填写本次审核的备注信息…" rows={2} />
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-sm mt-0.5">{v}</div>
    </div>
  );
}

function TimelineNode({ icon, title, time, done, tone = "primary" }: { icon: React.ReactNode; title: string; time: string; done: boolean; tone?: "primary" | "emerald" | "rose" | "muted" }) {
  const toneCls: Record<string, string> = {
    primary: "bg-primary text-primary-foreground",
    emerald: "bg-emerald-600 text-white",
    rose: "bg-rose-600 text-white",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <li className="ml-4">
      <span className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-background ${done ? toneCls[tone] : "bg-muted text-muted-foreground"}`}>
        {icon}
      </span>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{time}</div>
    </li>
  );
}