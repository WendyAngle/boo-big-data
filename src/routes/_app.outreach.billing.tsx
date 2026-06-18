import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Receipt,
  ChevronRight,
  Search,
  X,
  Eye,
  Send,
  Building2,
  UserRound,
  Wallet,
  TrendingDown,
  Mail,
  Phone,
  Globe,
  MapPin,
  Undo2,
  EyeOff,
  Briefcase,
  BadgeCheck,
  HelpCircle,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useLedger,
  seedDemoLedgerIfEmpty,
  syncFailedRefunds,
  REACH_CHANNEL_LABEL,
  VIEW_FIELD_LABEL,
  type LedgerKind,
  type ViewField,
  type ReachChannel,
  type LedgerEntry,
} from "@/lib/credits-ledger";
import {
  useCreditBalance,
  formatExpiry,
  isBalanceLow,
  isExpiringSoon,
} from "@/lib/credits-balance";
import { RulesSheet } from "@/components/billing/RulesSheet";
import {
  DateRangePicker,
  resolvePreset,
  type DateRangeValue,
  type PresetId,
} from "@/components/billing/DateRangePicker";

export const Route = createFileRoute("/_app/outreach/billing")({
  head: () => ({ meta: [{ title: "出海大数据平台 · 账单 | Boo数据平台" }] }),
  component: BillingPage,
});

function fmtTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function BillingPage() {
  useEffect(() => {
    seedDemoLedgerIfEmpty();
    syncFailedRefunds();
    const t = setInterval(() => syncFailedRefunds(), 10000);
    return () => clearInterval(t);
  }, []);
  const ledger = useLedger();
  const balance = useCreditBalance();
  const lowBalance = isBalanceLow(balance);
  const expiringSoon = isExpiringSoon(balance);

  const [tab, setTab] = useState<"all" | LedgerKind>("all");
  const [kw, setKw] = useState("");
  const [datePreset, setDatePreset] = useState<PresetId>("all");
  const [customRange, setCustomRange] = useState<DateRangeValue>(undefined);
  const [rulesOpen, setRulesOpen] = useState(false);

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    const range = resolvePreset(datePreset, customRange);
    const fromMs = range?.from ? range.from.getTime() : undefined;
    const toMs = range?.to ? range.to.getTime() : range?.from ? range.from.getTime() + 86399999 : undefined;
    return ledger.filter((e) => {
      if (tab !== "all" && e.kind !== tab) return false;
      if (fromMs !== undefined) {
        const t = new Date(e.createdAt).getTime();
        if (t < fromMs) return false;
        if (toMs !== undefined && t > toMs) return false;
      }
      if (!k) return true;
      return (
        e.targetName.toLowerCase().includes(k) ||
        (e.parentRef?.name ?? "").toLowerCase().includes(k) ||
        (e.detail ?? "").toLowerCase().includes(k) ||
        (e.platform ?? "").toLowerCase().includes(k)
      );
    });
  }, [ledger, tab, datePreset, customRange, kw]);

  const stats = useMemo(() => {
    const all = ledger;
    const viewSum = all.filter((e) => e.kind === "view").reduce((s, e) => s + e.cost, 0);
    const reachSum = all.filter((e) => e.kind === "reach").reduce((s, e) => s + e.cost, 0);
    const refundSum = all.filter((e) => e.kind === "refund").reduce((s, e) => s + e.cost, 0);
    return {
      total: viewSum + reachSum - refundSum,
      view: viewSum,
      reach: reachSum,
      refund: refundSum,
      count: all.length,
    };
  }, [ledger]);

  const filteredConsume = filtered
    .filter((e) => e.kind !== "refund")
    .reduce((s, e) => s + e.cost, 0);
  const filteredRefund = filtered
    .filter((e) => e.kind === "refund")
    .reduce((s, e) => s + e.cost, 0);

  function handleExport(format: "csv" | "excel") {
    const rows = [
      ["时间", "类型", "对象类型", "对象", "所属企业", "字段/渠道", "平台", "明细", "消耗"],
      ...filtered.map((e) => [
        fmtTime(e.createdAt),
        e.kind === "view" ? "信息查看" : e.kind === "reach" ? "触达消耗" : "失败退还",
        e.targetKind === "enterprise" ? "企业" : "人物",
        e.targetName,
        e.parentRef?.name ?? "",
        e.kind === "view"
          ? VIEW_FIELD_LABEL[e.field!] ?? ""
          : e.channel
            ? REACH_CHANNEL_LABEL[e.channel]
            : "",
        e.platform ?? "",
        e.detail ?? "",
        `${e.kind === "refund" ? "+" : "-"}${e.cost}`,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    // UTF-8 BOM for Excel compatibility
    const blob = new Blob(["\ufeff" + csv], {
      type: format === "excel" ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}`;
    a.href = url;
    a.download = `账单_${stamp}.${format === "excel" ? "csv" : "csv"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${filtered.length} 条账单`);
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>出海大数据平台</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">账单</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">账单</h1>
            <p className="text-white/85 text-sm mt-0.5">
              统一查看关键信息查看与触达动作产生的积分消耗明细
            </p>
          </div>
          <div className="flex items-stretch gap-4">
            <div className="rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2.5 min-w-[180px]">
              <div className="text-[11px] opacity-80 flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                当前积分余额
              </div>
              <div
                className={cn(
                  "text-2xl font-bold tabular-nums mt-0.5",
                  lowBalance && "text-amber-200",
                )}
              >
                {balance.balance.toLocaleString()}
                <span className="text-sm font-normal ml-1 opacity-90">积分</span>
              </div>
              <div
                className={cn(
                  "text-[11px] mt-0.5 flex items-center gap-1",
                  expiringSoon ? "text-amber-200" : "text-white/75",
                )}
              >
                {expiringSoon && <AlertTriangle className="h-3 w-3" />}
                有效期至 {formatExpiry(balance.expiresAt)}
              </div>
            </div>
            <div className="text-right text-white/90 px-2">
              <div className="text-xs opacity-80">净消耗（消耗 - 退还）</div>
              <div className="text-2xl font-bold tabular-nums">
                -{stats.total}
                <span className="text-sm font-normal ml-1">积分</span>
              </div>
              {stats.refund > 0 && (
                <div className="text-[11px] text-white/75 mt-0.5 tabular-nums">
                  含失败退还 +{stats.refund}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            className={cn(
              "h-8 bg-white text-primary hover:bg-white/90 font-medium",
              lowBalance && "ring-2 ring-amber-300",
            )}
          >
            <Link to="/outreach/recharge" search={{ from: "billing" }}>
              <Wallet className="h-3.5 w-3.5 mr-1.5" />
              积分充值
              {lowBalance && (
                <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setRulesOpen(true)}
            className="h-8 bg-white/15 text-white border-white/20 hover:bg-white/25"
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
            积分规则
          </Button>
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="h-8 bg-white/15 text-white border-white/20 hover:bg-white/25"
          >
            <Link to="/outreach/billing-empty">
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              查看空状态演示
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="净消耗"
          value={stats.total}
          unit="积分"
          tone="primary"
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label="信息查看"
          value={stats.view}
          unit="积分"
          tone="sky"
        />
        <StatCard
          icon={<Send className="h-5 w-5" />}
          label="触达消耗"
          value={stats.reach}
          unit="积分"
          tone="violet"
        />
        <StatCard
          icon={<Undo2 className="h-5 w-5" />}
          label="失败退还"
          value={stats.refund}
          unit="积分"
          tone="emerald"
          positive
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="账单条数"
          value={stats.count}
          unit="条"
          tone="slate"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-1 border-b border-border px-5 pt-3">
          <Tab active={tab === "all"} onClick={() => setTab("all")}>
            全部 <span className="ml-1 text-muted-foreground">{ledger.length}</span>
          </Tab>
          <Tab active={tab === "view"} onClick={() => setTab("view")}>
            <Eye className="h-3.5 w-3.5 mr-1 inline" />
            信息查看{" "}
            <span className="ml-1 text-muted-foreground">
              {ledger.filter((e) => e.kind === "view").length}
            </span>
          </Tab>
          <Tab active={tab === "reach"} onClick={() => setTab("reach")}>
            <Send className="h-3.5 w-3.5 mr-1 inline" />
            触达消耗{" "}
            <span className="ml-1 text-muted-foreground">
              {ledger.filter((e) => e.kind === "reach").length}
            </span>
          </Tab>
          <Tab active={tab === "refund"} onClick={() => setTab("refund")}>
            <Undo2 className="h-3.5 w-3.5 mr-1 inline" />
            失败退还{" "}
            <span className="ml-1 text-muted-foreground">
              {ledger.filter((e) => e.kind === "refund").length}
            </span>
          </Tab>
        </div>
        <div className="px-5 py-3 flex items-center gap-3 flex-wrap border-b border-border bg-muted/20">
          <DateRangePicker
            preset={datePreset}
            custom={customRange}
            onChange={(p, c) => {
              setDatePreset(p);
              if (c !== undefined) setCustomRange(c);
            }}
          />
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="输入企业 / 人物 / 明细"
              className="pl-9 h-9 bg-background"
            />
          </div>
          {(kw || datePreset !== "all" || tab !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKw("");
                setDatePreset("all");
                setCustomRange(undefined);
                setTab("all");
              }}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" />
              清除
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled={filtered.length === 0}>
                <Download className="h-3.5 w-3.5" />
                导出
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>导出 CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                导出 Excel（兼容 CSV）
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="text-sm text-muted-foreground ml-auto flex items-center gap-3">
            <span>
              共 <span className="text-foreground font-semibold">{filtered.length}</span> 条
            </span>
            {filteredConsume > 0 && (
              <span>
                消耗{" "}
                <span className="font-semibold text-rose-600 tabular-nums">
                  -{filteredConsume}
                </span>
              </span>
            )}
            {filteredRefund > 0 && (
              <span>
                退还{" "}
                <span className="font-semibold text-emerald-600 tabular-nums">
                  +{filteredRefund}
                </span>
              </span>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Receipt className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-base font-medium">暂无账单记录</div>
            <div className="text-sm text-muted-foreground max-w-md">
              查看企业 / 人物的关键信息或发起触达后，账单会在此处汇总。积分不足？
              <Link
                to="/outreach/recharge"
                search={{ from: "billing" }}
                className="text-primary hover:underline ml-1"
              >
                立即充值
              </Link>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <TableHead className="w-[170px]">时间</TableHead>
                <TableHead className="w-[120px]">类型</TableHead>
                <TableHead className="w-[280px]">对象</TableHead>
                <TableHead className="w-[140px]">字段 / 渠道</TableHead>
                <TableHead>明细</TableHead>
                <TableHead className="w-[110px] text-right">
                  <span className="inline-flex items-center gap-1">
                    消耗
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setRulesOpen(true)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <HelpCircle className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        信息查看 5 / 字段 · 触达 10 / 次 · 失败自动退还
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono tabular-nums text-xs text-muted-foreground">
                    {fmtTime(e.createdAt)}
                  </TableCell>
                  <TableCell>
                    <KindBadge entry={e} />
                  </TableCell>
                  <TableCell>
                    <TargetCell entry={e} />
                  </TableCell>
                  <TableCell>
                    <FieldCell entry={e} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[320px]">
                    {e.kind === "refund"
                      ? `触达失败退还 · ${e.detail ?? "—"}`
                      : (e.detail ?? "—")}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      e.kind === "refund" ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {e.kind === "refund" ? "+" : "-"}
                    {e.cost}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <RulesSheet open={rulesOpen} onOpenChange={setRulesOpen} />
    </div>
    </TooltipProvider>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  tone,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  tone: "primary" | "sky" | "violet" | "slate" | "emerald";
  positive?: boolean;
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary ring-primary/20",
    sky: "bg-sky-50 text-sky-600 ring-sky-200",
    violet: "bg-violet-50 text-violet-600 ring-violet-200",
    slate: "bg-slate-50 text-slate-600 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  } as const;
  return (
    <div className="rounded-xl ring-1 ring-border bg-card p-5 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-lg ring-1 flex items-center justify-center", toneMap[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-2xl font-bold tabular-nums",
              positive && value > 0 && "text-emerald-600",
            )}
          >
            {positive && value > 0 ? "+" : ""}
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function Tab({
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

function KindBadge({ entry }: { entry: LedgerEntry }) {
  if (entry.kind === "view") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-sky-50 text-sky-700 border-sky-200">
        <Eye className="h-3 w-3" />
        信息查看
      </span>
    );
  }
  if (entry.kind === "refund") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
        <Undo2 className="h-3 w-3" />
        失败退还
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-violet-50 text-violet-700 border-violet-200">
      <Send className="h-3 w-3" />
      触达消耗
    </span>
  );
}

function FieldCell({ entry }: { entry: LedgerEntry }) {
  if (entry.kind === "view") {
    const Icon: Record<ViewField, typeof Mail> = {
      email: Mail,
      phone: Phone,
      social: Globe,
      address: MapPin,
      title: Briefcase,
      seniority: BadgeCheck,
    };
    const I = Icon[entry.field!];
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <I className="h-3.5 w-3.5" />
        <span className="text-foreground">{VIEW_FIELD_LABEL[entry.field!]}</span>
      </span>
    );
  }
  // reach or refund — both use channel
  if (!entry.channel) return <span className="text-xs text-muted-foreground">—</span>;
  const Icon: Record<ReachChannel, typeof Mail> = {
    email: Mail,
    phone: Phone,
    social: Globe,
  };
  const I = Icon[entry.channel];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <I className="h-3.5 w-3.5" />
      <span className="text-foreground">{REACH_CHANNEL_LABEL[entry.channel]}</span>
      {entry.platform && <span>· {entry.platform}</span>}
    </span>
  );
}

function TargetCell({ entry: e }: { entry: LedgerEntry }) {
  if (e.targetKind === "enterprise") {
    return (
      <Link
        to="/outreach/enterprise/$id"
        params={{ id: e.targetId }}
        className="group flex items-center gap-2.5 min-w-0"
      >
        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate group-hover:text-primary capitalize text-sm">
            {e.targetName}
          </div>
          <div className="text-xs text-muted-foreground">企业</div>
        </div>
      </Link>
    );
  }
  const [entId, idx] = e.targetId.split(":");
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
        <div className="font-medium truncate group-hover:text-primary capitalize text-sm">
          {e.targetName}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {e.parentRef?.name ?? "—"}
        </div>
      </div>
    </Link>
  );
}