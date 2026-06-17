import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Zap,
  ChevronRight,
  Mail,
  Phone,
  Globe,
  Search,
  X,
  Building2,
  UserRound,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  RefreshCw,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import {
  useLedger,
  getReachStatus,
  seedDemoLedgerIfEmpty,
  resetDemoLedger,
  syncFailedRefunds,
  isReachRefunded,
  COST_REACH,
  REACH_STATUS_LABEL,
  REACH_STATUS_COLOR,
  REACH_CHANNEL_LABEL,
  type ReachStatus,
  type ReachChannel,
} from "@/lib/credits-ledger";

export const Route = createFileRoute("/_app/outreach/reach")({
  head: () => ({ meta: [{ title: "触达客户管理 · 触达 | Boo数据平台" }] }),
  component: ReachPage,
});

function fmtTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function relative(iso: string, now: number) {
  const diff = (now - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

function ReachPage() {
  useEffect(() => {
    seedDemoLedgerIfEmpty();
    syncFailedRefunds();
  }, []);

  const ledger = useLedger();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      syncFailedRefunds();
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const [statusTab, setStatusTab] = useState<"all" | ReachStatus>("all");
  const [channel, setChannel] = useState<"all" | ReachChannel>("all");
  const [kw, setKw] = useState("");

  const reachRows = useMemo(() => {
    return ledger
      .filter((e) => e.kind === "reach")
      .map((e) => ({ ...e, status: getReachStatus(e, now) }));
  }, [ledger, now]);

  const counts = useMemo(() => {
    const c: Record<ReachStatus, number> = {
      pending: 0,
      in_progress: 0,
      success: 0,
      failed: 0,
    };
    for (const r of reachRows) c[r.status]++;
    return c;
  }, [reachRows]);

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    return reachRows.filter((r) => {
      if (statusTab !== "all" && r.status !== statusTab) return false;
      if (channel !== "all" && r.channel !== channel) return false;
      if (!k) return true;
      return (
        r.targetName.toLowerCase().includes(k) ||
        (r.parentRef?.name ?? "").toLowerCase().includes(k) ||
        (r.detail ?? "").toLowerCase().includes(k) ||
        (r.platform ?? "").toLowerCase().includes(k)
      );
    });
  }, [reachRows, statusTab, channel, kw]);

  const grossCost = reachRows.reduce((s, r) => s + r.cost, 0);
  const refundTotal = reachRows
    .filter((r) => r.status === "failed")
    .reduce((s, r) => s + (isReachRefunded(r.id) ? COST_REACH : 0), 0);
  const netCost = grossCost - refundTotal;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>触达客户管理</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">触达</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => {
            if (confirm("将清空当前触达记录并重新加载演示数据，确认？")) {
              resetDemoLedger();
            }
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          重置演示数据
        </Button>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Zap className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">触达</h1>
            <p className="text-white/85 text-sm mt-0.5">
              统一管理对目标企业 / 关键人物的触达动作、渠道与跟进结果
            </p>
          </div>
          <div className="text-right text-white/90">
            <div className="text-xs opacity-80">净消耗（消耗 - 退还）</div>
            <div className="text-2xl font-bold tabular-nums">
              -{netCost}
              <span className="text-sm font-normal ml-1">积分</span>
            </div>
            {refundTotal > 0 && (
              <div className="text-[11px] text-white/75 mt-0.5 tabular-nums">
                含失败退还 +{refundTotal}
              </div>
            )}
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="h-8 bg-white/15 text-white border-white/20 hover:bg-white/25"
          >
            <Link to="/outreach/reach-empty">
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              查看空状态演示
            </Link>
          </Button>
        </div>
      </section>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label={REACH_STATUS_LABEL.pending}
          value={counts.pending}
          tone="slate"
        />
        <KpiCard
          icon={<Loader2 className="h-5 w-5" />}
          label={REACH_STATUS_LABEL.in_progress}
          value={counts.in_progress}
          tone="amber"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label={REACH_STATUS_LABEL.success}
          value={counts.success}
          tone="emerald"
        />
        <KpiCard
          icon={<XCircle className="h-5 w-5" />}
          label={REACH_STATUS_LABEL.failed}
          value={counts.failed}
          tone="rose"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {/* Tab + filter */}
        <div className="flex items-center gap-1 border-b border-border px-5 pt-3">
          <StatusTab active={statusTab === "all"} onClick={() => setStatusTab("all")}>
            全部 <span className="ml-1 text-muted-foreground">{reachRows.length}</span>
          </StatusTab>
          {(["pending", "in_progress", "success", "failed"] as ReachStatus[]).map((s) => (
            <StatusTab key={s} active={statusTab === s} onClick={() => setStatusTab(s)}>
              {REACH_STATUS_LABEL[s]} <span className="ml-1 text-muted-foreground">{counts[s]}</span>
            </StatusTab>
          ))}
        </div>
        <div className="px-5 py-3 flex items-center gap-3 flex-wrap border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">触达渠道</span>
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger className="h-9 w-[140px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部渠道</SelectItem>
                <SelectItem value="email">邮件</SelectItem>
                <SelectItem value="phone">电话</SelectItem>
                <SelectItem value="social">社媒</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="输入企业 / 人物 / 平台 / 明细"
              className="pl-9 h-9 bg-background"
            />
          </div>
          {(kw || channel !== "all" || statusTab !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKw("");
                setChannel("all");
                setStatusTab("all");
              }}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" />
              清除
            </Button>
          )}
          <div className="text-sm text-muted-foreground ml-auto">
            共 <span className="text-foreground font-semibold">{filtered.length}</span> 条
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Send className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-base font-medium">暂无触达记录</div>
            <div className="text-sm text-muted-foreground max-w-md">
              前往企业 / 人物详情页，针对邮箱、电话或社媒账号发起触达
            </div>
            <Button asChild variant="outline" size="sm" className="mt-2 gap-1.5">
              <Link to="/outreach/enterprise">
                <Building2 className="h-4 w-4" />
                去企业列表
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <TableHead className="w-[280px]">触达对象</TableHead>
                <TableHead className="w-[140px]">渠道</TableHead>
                <TableHead>触达明细</TableHead>
                <TableHead className="w-[110px]">状态</TableHead>
                <TableHead className="w-[170px]">触达时间</TableHead>
                <TableHead className="w-[90px] text-right">消耗</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell>
                    <TargetCell row={r} />
                  </TableCell>
                  <TableCell>
                    <ChannelBadge channel={r.channel!} platform={r.platform} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[320px]">
                    {r.detail}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-xs text-muted-foreground">
                    <div>{fmtTime(r.createdAt)}</div>
                    <div className="text-[11px] opacity-70">{relative(r.createdAt, now)}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="font-semibold text-rose-600">-{r.cost}</div>
                    {r.status === "failed" && isReachRefunded(r.id) && (
                      <div className="text-[11px] font-medium text-emerald-600 mt-0.5">
                        已退还 +{COST_REACH}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "slate" | "amber" | "emerald" | "rose";
}) {
  const toneMap = {
    slate: "bg-slate-50 text-slate-600 ring-slate-200",
    amber: "bg-amber-50 text-amber-600 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    rose: "bg-rose-50 text-rose-600 ring-rose-200",
  } as const;
  return (
    <div className="rounded-xl ring-1 ring-border bg-card p-5 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-lg ring-1 flex items-center justify-center", toneMap[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function StatusTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ChannelBadge({ channel, platform }: { channel: ReachChannel; platform?: string }) {
  const Icon = channel === "email" ? Mail : channel === "phone" ? Phone : Globe;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium text-foreground">
        {REACH_CHANNEL_LABEL[channel]}
      </span>
      {platform && <span className="text-muted-foreground">· {platform}</span>}
    </span>
  );
}

function StatusBadge({ status }: { status: ReachStatus }) {
  const Icon =
    status === "pending"
      ? Clock
      : status === "in_progress"
        ? Loader2
        : status === "success"
          ? CheckCircle2
          : XCircle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium",
        REACH_STATUS_COLOR[status],
      )}
    >
      <Icon className={cn("h-3 w-3", status === "in_progress" && "animate-spin")} />
      {REACH_STATUS_LABEL[status]}
    </span>
  );
}

function TargetCell({
  row,
}: {
  row: { targetKind: "enterprise" | "contact"; targetId: string; targetName: string; parentRef?: { id: string; name: string } };
}) {
  if (row.targetKind === "enterprise") {
    return (
      <Link
        to="/outreach/enterprise/$id"
        params={{ id: row.targetId }}
        className="group flex items-center gap-2.5 min-w-0"
      >
        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate group-hover:text-primary capitalize">
            {row.targetName}
          </div>
          <div className="text-xs text-muted-foreground">企业</div>
        </div>
      </Link>
    );
  }
  // contact: refId like ENT-0001:0
  const [entId, idx] = row.targetId.split(":");
  return (
    <Link
      to="/outreach/enterprise/$id/contact/$idx"
      params={{ id: entId, idx }}
      className="group flex items-center gap-2.5 min-w-0"
    >
      <div className="h-8 w-8 rounded-full bg-accent/20 text-accent-foreground flex items-center justify-center shrink-0">
        <UserRound className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-medium truncate group-hover:text-primary capitalize">
          {row.targetName}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {row.parentRef?.name ?? "—"}
        </div>
      </div>
    </Link>
  );
}