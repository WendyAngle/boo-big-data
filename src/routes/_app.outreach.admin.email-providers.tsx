import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Mailbox,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Settings2,
  ShieldOff,
  Info,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/outreach/admin/email-providers")({
  head: () => ({
    meta: [
      { title: "邮件服务商 · 管理后台 | Boo数据平台" },
      {
        name: "description",
        content: "统一管理平台侧对接的邮件发送服务商（SendGrid、Amazon SES、Mailgun 等），监控送达率、退信率与配额。",
      },
    ],
  }),
  component: EmailProvidersPage,
});

type Health = "healthy" | "degraded" | "down" | "paused";
type Kind = "api" | "smtp";

const FX_TO_USD: Record<string, number> = { USD: 1, CNY: 0.14 };

interface Provider {
  id: string;
  name: string;
  vendor: string;
  kind: Kind;
  regions: string[];
  purpose: Array<"marketing" | "transactional">;
  enabled: boolean;
  health: Health;
  deliveryRate: number; // 送达率
  bounceRate: number;   // 退信率
  respMs: number;
  dailyCap: number;     // 日额度
  quotaUsed: number;    // 0-1
  cost: { currency: "USD" | "CNY"; per1k: number }; // 每千封
  lastCheck: string;
}

const SEED: Provider[] = [
  {
    id: "sendgrid",
    name: "SendGrid 主账号",
    vendor: "SendGrid",
    kind: "api",
    regions: ["全球"],
    purpose: ["marketing", "transactional"],
    enabled: true,
    health: "healthy",
    deliveryRate: 0.982,
    bounceRate: 0.012,
    respMs: 620,
    dailyCap: 200000,
    quotaUsed: 0.38,
    cost: { currency: "USD", per1k: 0.85 },
    lastCheck: "刚刚",
  },
  {
    id: "aws-ses",
    name: "Amazon SES",
    vendor: "AWS",
    kind: "api",
    regions: ["US", "EU", "APAC"],
    purpose: ["transactional"],
    enabled: true,
    health: "healthy",
    deliveryRate: 0.991,
    bounceRate: 0.008,
    respMs: 480,
    dailyCap: 500000,
    quotaUsed: 0.22,
    cost: { currency: "USD", per1k: 0.10 },
    lastCheck: "1 分钟前",
  },
  {
    id: "mailgun",
    name: "Mailgun 备用",
    vendor: "Mailgun",
    kind: "api",
    regions: ["US", "EU"],
    purpose: ["marketing"],
    enabled: true,
    health: "degraded",
    deliveryRate: 0.912,
    bounceRate: 0.041,
    respMs: 4200,
    dailyCap: 100000,
    quotaUsed: 0.61,
    cost: { currency: "USD", per1k: 0.80 },
    lastCheck: "3 分钟前",
  },
  {
    id: "aliyun-dm",
    name: "阿里云邮件推送",
    vendor: "Aliyun",
    kind: "api",
    regions: ["CN", "APAC"],
    purpose: ["marketing", "transactional"],
    enabled: true,
    health: "healthy",
    deliveryRate: 0.968,
    bounceRate: 0.019,
    respMs: 890,
    dailyCap: 150000,
    quotaUsed: 0.44,
    cost: { currency: "CNY", per1k: 3.5 },
    lastCheck: "刚刚",
  },
  {
    id: "postmark",
    name: "Postmark",
    vendor: "Postmark",
    kind: "smtp",
    regions: ["US", "EU"],
    purpose: ["transactional"],
    enabled: false,
    health: "down",
    deliveryRate: 0.58,
    bounceRate: 0.12,
    respMs: 18400,
    dailyCap: 50000,
    quotaUsed: 0,
    cost: { currency: "USD", per1k: 1.25 },
    lastCheck: "9 分钟前",
  },
];

function formatCostUSD(cost: Provider["cost"]) {
  const usd = cost.per1k * (FX_TO_USD[cost.currency] ?? 1);
  return `$${usd.toFixed(3)}/千封`;
}
function formatCostOriginal(cost: Provider["cost"]) {
  const sym = cost.currency === "USD" ? "$" : "¥";
  return `${sym}${cost.per1k.toFixed(2)}/千封（${cost.currency}）`;
}

function EmailProvidersPage() {
  const [list, setList] = useState<Provider[]>(SEED);

  const summary = useMemo(() => {
    const active = list.filter((p) => p.enabled);
    const avg = active.length
      ? active.reduce((s, p) => s + p.deliveryRate, 0) / active.length
      : 0;
    return {
      total: list.length,
      active: active.length,
      avg,
      degraded: list.filter((p) => p.health !== "healthy").length,
    };
  }, [list]);

  function toggle(id: string) {
    setList((s) =>
      s.map((p) => {
        if (p.id !== id) return p;
        if (p.health === "down") {
          toast.error("服务商已触发熔断，无法手动启用；请先解决底层问题");
          return p;
        }
        return { ...p, enabled: !p.enabled };
      }),
    );
    toast.success("已更新服务商启用状态");
  }

  function resetToObservation(id: string) {
    setList((s) =>
      s.map((p) =>
        p.id === id
          ? { ...p, health: "paused", enabled: false, lastCheck: "刚刚" }
          : p,
      ),
    );
    toast.success("已重置为观察态，30 分钟内不参与路由");
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Mailbox className="h-5 w-5 text-primary" />
          邮件服务商
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          平台侧统一对接的邮件发送通道（API/SMTP），按用途、区域与健康度自动分流。
          企业租户在「发信邮箱」中配置的自建 SMTP 不在此列。
        </p>
      </div>

      <Card className="p-4 space-y-2 border-primary/20 bg-primary/[0.03]">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Info className="h-4 w-4 text-primary" />
          健康度判定规则（近 15 分钟滚动窗口）
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
          <RuleCell tone="ok"    label="🟢 正常"   rule="送达率 ≥95% 且 退信率 <3%" />
          <RuleCell tone="warn"  label="🟡 降级"   rule="送达率 85–95% 或 退信率 3–8% → 路由权重降至 50%" />
          <RuleCell tone="err"   label="🔴 异常"   rule="送达率 <85% 或 退信率 >8% → 权重清零、等待人工确认" />
          <RuleCell tone="fatal" label="⛔ 熔断"   rule="连续 3 个窗口 <70% → 自动禁用，30min 后进入观察态" />
        </div>
        <div className="text-[11px] text-muted-foreground pt-1">
          说明：单价统一以 <strong>USD</strong> 显示，鼠标悬停可查看原币计价。熔断态下开关强制置灰，需管理员在故障排除后重置。
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="总服务商" value={summary.total.toString()} />
        <StatCard label="启用中" value={summary.active.toString()} />
        <StatCard
          label="平均送达率"
          value={(summary.avg * 100).toFixed(1) + "%"}
          tone={summary.avg > 0.95 ? "good" : "warn"}
        />
        <StatCard
          label="异常/降级"
          value={summary.degraded.toString()}
          tone={summary.degraded > 0 ? "warn" : "good"}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>服务商</TableHead>
              <TableHead>接入方式</TableHead>
              <TableHead>覆盖区域</TableHead>
              <TableHead>用途</TableHead>
              <TableHead>健康度</TableHead>
              <TableHead>送达 / 退信</TableHead>
              <TableHead>今日配额</TableHead>
              <TableHead>
                单价
                <span className="text-[10px] font-normal text-muted-foreground ml-1">(USD)</span>
              </TableHead>
              <TableHead className="text-right">启用</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((p) => {
              const isDown = p.health === "down";
              const effectiveEnabled = isDown ? false : p.enabled;
              return (
              <TableRow key={p.id} className={cn(isDown && "opacity-70")}>
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.vendor} · 最近检查 {p.lastCheck}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {p.kind}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.regions.map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px]">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.purpose.map((c) => (
                      <Badge
                        key={c}
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          c === "transactional" && "bg-sky-50 text-sky-700 border-sky-200",
                          c === "marketing" && "bg-violet-50 text-violet-700 border-violet-200",
                        )}
                      >
                        {c === "transactional" ? "事务" : "营销"}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <HealthBadge health={p.health} />
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "text-sm font-mono",
                      p.deliveryRate < 0.9 ? "text-rose-600" : p.deliveryRate < 0.95 ? "text-amber-600" : "text-emerald-600",
                    )}
                  >
                    {(p.deliveryRate * 100).toFixed(1)}%
                  </span>
                  <div className="text-[10px] text-muted-foreground">
                    退信 {(p.bounceRate * 100).toFixed(1)}% · {(p.respMs / 1000).toFixed(1)}s
                  </div>
                </TableCell>
                <TableCell className="w-44">
                  <div className="flex items-center gap-2">
                    <Progress value={p.quotaUsed * 100} className="h-1.5 flex-1" />
                    <span className="text-[11px] text-muted-foreground w-9 text-right">
                      {(p.quotaUsed * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    上限 {p.dailyCap.toLocaleString()} 封/日
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-mono cursor-help border-b border-dotted border-muted-foreground/40">
                        {formatCostUSD(p.cost)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      原币计价：{formatCostOriginal(p.cost)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {isDown && (
                      <>
                        <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 gap-0.5">
                          <ShieldOff className="h-3 w-3" /> 熔断禁用
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => resetToObservation(p.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          重置观察
                        </Button>
                      </>
                    )}
                    {p.health === "degraded" && p.enabled && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        权重 50%
                      </Badge>
                    )}
                    {p.health === "paused" && (
                      <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                        观察中
                      </Badge>
                    )}
                    <Switch
                      checked={effectiveEnabled}
                      disabled={isDown || p.health === "paused"}
                      onCheckedChange={() => toggle(p.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4 flex items-start gap-3 bg-amber-50/60 border-amber-200">
        <Settings2 className="h-4 w-4 text-amber-600 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          此处为平台侧统一对接的邮件通道，用于系统事务邮件（验证码、通知）与平台代发营销邮件。
          企业租户员工在「系统管理 → 发信邮箱」中配置的自建 SMTP 由租户自行维护，不受此处路由控制。
        </div>
      </Card>
    </div>
    </TooltipProvider>
  );
}

function RuleCell({ tone, label, rule }: { tone: "ok" | "warn" | "err" | "fatal"; label: string; rule: string }) {
  return (
    <div
      className={cn(
        "rounded-md border p-2 space-y-0.5",
        tone === "ok" && "border-emerald-200 bg-emerald-50/60",
        tone === "warn" && "border-amber-200 bg-amber-50/60",
        tone === "err" && "border-rose-200 bg-rose-50/60",
        tone === "fatal" && "border-neutral-300 bg-neutral-100",
      )}
    >
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[11px] text-muted-foreground leading-snug">{rule}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
}) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold",
          tone === "good" && "text-emerald-600",
          tone === "warn" && "text-amber-600",
        )}
      >
        {value}
      </div>
    </Card>
  );
}

function HealthBadge({ health }: { health: Health }) {
  if (health === "healthy")
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle2 className="h-3 w-3" /> 正常
      </Badge>
    );
  if (health === "degraded")
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <AlertTriangle className="h-3 w-3" /> 降级
      </Badge>
    );
  if (health === "paused")
    return (
      <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 gap-1">
        <AlertTriangle className="h-3 w-3" /> 暂停
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 gap-1">
      <XCircle className="h-3 w-3" /> 熔断
    </Badge>
  );
}