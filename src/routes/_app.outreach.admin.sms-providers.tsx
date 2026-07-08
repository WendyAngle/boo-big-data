import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ServerCog,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Settings2,
  ShieldOff,
  Info,
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

export const Route = createFileRoute("/_app/outreach/admin/sms-providers")({
  head: () => ({
    meta: [
      { title: "短信服务商 · 系统管理 | Boo数据平台" },
      {
        name: "description",
        content: "查看已对接的短信服务商健康度、送达率与配额，并按国家/渠道分配容量。",
      },
    ],
  }),
  component: SmsProvidersPage,
});

type Health = "healthy" | "degraded" | "down" | "paused";

// USD 记账口径，其他币种保留原始展示。汇率写死为演示值。
const FX_TO_USD: Record<string, number> = { USD: 1, CNY: 0.14 };

interface Provider {
  id: string;
  name: string;
  vendor: string;
  regions: string[];
  channels: Array<"marketing" | "otp" | "notification">;
  enabled: boolean;
  health: Health;
  deliveryRate: number; // 0-1
  respMs: number; // 平均响应耗时
  tps: number;
  quotaUsed: number; // 0-1
  /** 原始计价 */
  cost: { currency: "USD" | "CNY"; perSegment: number };
  lastCheck: string;
}

const SEED: Provider[] = [
  {
    id: "twilio",
    name: "Twilio 主账号",
    vendor: "Twilio",
    regions: ["全球", "US", "EU"],
    channels: ["marketing", "otp", "notification"],
    enabled: true,
    health: "healthy",
    deliveryRate: 0.973,
    respMs: 1800,
    tps: 100,
    quotaUsed: 0.42,
    cost: { currency: "USD", perSegment: 0.0075 },
    lastCheck: "1 分钟前",
  },
  {
    id: "vonage",
    name: "Vonage 备用",
    vendor: "Vonage",
    regions: ["EU", "APAC"],
    channels: ["marketing", "notification"],
    enabled: true,
    health: "healthy",
    deliveryRate: 0.951,
    respMs: 2300,
    tps: 60,
    quotaUsed: 0.28,
    cost: { currency: "USD", perSegment: 0.0068 },
    lastCheck: "刚刚",
  },
  {
    id: "aliyun-intl",
    name: "阿里云国际站",
    vendor: "Aliyun",
    regions: ["APAC", "CN"],
    channels: ["marketing", "notification"],
    enabled: true,
    health: "degraded",
    deliveryRate: 0.881,
    respMs: 6200,
    tps: 200,
    quotaUsed: 0.76,
    cost: { currency: "CNY", perSegment: 0.045 },
    lastCheck: "3 分钟前",
  },
  {
    id: "infobip",
    name: "Infobip",
    vendor: "Infobip",
    regions: ["全球"],
    channels: ["otp"],
    enabled: true,
    health: "healthy",
    deliveryRate: 0.988,
    respMs: 900,
    tps: 300,
    quotaUsed: 0.15,
    cost: { currency: "USD", perSegment: 0.010 },
    lastCheck: "刚刚",
  },
  {
    id: "sinch",
    name: "Sinch A2P",
    vendor: "Sinch",
    regions: ["US", "LATAM"],
    channels: ["marketing"],
    enabled: false,
    health: "down",
    deliveryRate: 0.62,
    respMs: 15200,
    tps: 80,
    quotaUsed: 0,
    cost: { currency: "USD", perSegment: 0.008 },
    lastCheck: "12 分钟前",
  },
];

/** 统一转 USD 显示，tooltip 展示原币值 */
function formatCostUSD(cost: Provider["cost"]) {
  const usd = cost.perSegment * (FX_TO_USD[cost.currency] ?? 1);
  return `$${usd.toFixed(4)}/段`;
}
function formatCostOriginal(cost: Provider["cost"]) {
  const sym = cost.currency === "USD" ? "$" : "¥";
  return `${sym}${cost.perSegment.toFixed(4)}/段（${cost.currency}）`;
}

function SmsProvidersPage() {
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
          toast.error("服务商已触发熔断，无法在此手动启用；请先解决底层问题");
          return p;
        }
        return { ...p, enabled: !p.enabled };
      }),
    );
    toast.success("已更新服务商启用状态");
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ServerCog className="h-5 w-5 text-primary" />
          短信服务商
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          由平台统一对接多家国际/国内短信服务商，按国家、渠道类型与健康度自动分流。
          业务人员发短信时无需关心服务商归属。
        </p>
      </div>

      <Card className="p-4 space-y-2 border-primary/20 bg-primary/[0.03]">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Info className="h-4 w-4 text-primary" />
          健康度判定规则（近 5 分钟滚动窗口）
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
          <RuleCell tone="ok"    label="🟢 正常"   rule="送达率 ≥95% 且 响应 <3s" />
          <RuleCell tone="warn"  label="🟡 降级"   rule="送达率 85–95% 或 响应 3–10s → 路由权重降至 50%" />
          <RuleCell tone="err"   label="🔴 异常"   rule="送达率 <85% 或 响应 >10s → 权重清零、等待人工确认" />
          <RuleCell tone="fatal" label="⛔ 熔断"   rule="连续 3 个窗口 <70% → 自动禁用，30min 后进入观察态" />
        </div>
        <div className="text-[11px] text-muted-foreground pt-1">
          说明：单位「TPS」= 条/秒；单价统一以 <strong>USD</strong> 显示，鼠标悬停可查看原币计价。熔断态下开关强制置灰，需管理员在故障排除后重置。
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
              <TableHead>覆盖区域</TableHead>
              <TableHead>支持渠道</TableHead>
              <TableHead>健康度</TableHead>
              <TableHead>送达率</TableHead>
              <TableHead>
                TPS
                <span className="text-[10px] font-normal text-muted-foreground ml-1">(条/秒)</span>
              </TableHead>
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
                    {p.channels.map((c) => (
                      <Badge
                        key={c}
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          c === "otp" && "bg-sky-50 text-sky-700 border-sky-200",
                          c === "marketing" && "bg-violet-50 text-violet-700 border-violet-200",
                          c === "notification" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        )}
                      >
                        {c === "otp" ? "验证码" : c === "marketing" ? "营销" : "通知"}
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
                    响应 {(p.respMs / 1000).toFixed(1)}s
                  </div>
                </TableCell>
                <TableCell className="text-sm">{p.tps}</TableCell>
                <TableCell className="w-40">
                  <div className="flex items-center gap-2">
                    <Progress value={p.quotaUsed * 100} className="h-1.5 flex-1" />
                    <span className="text-[11px] text-muted-foreground w-9 text-right">
                      {(p.quotaUsed * 100).toFixed(0)}%
                    </span>
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
                      <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 gap-0.5">
                        <ShieldOff className="h-3 w-3" /> 熔断禁用
                      </Badge>
                    )}
                    {p.health === "degraded" && p.enabled && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        权重 50%
                      </Badge>
                    )}
                    <Switch
                      checked={effectiveEnabled}
                      disabled={isDown}
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
          服务商由后台统一管理，业务用户仅可见"营销 / 通知 / 验证码"三种渠道选项。
          详细路由规则见「路由策略」页面。健康度异常时，路由引擎会自动触发 Failover 到备用服务商。
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