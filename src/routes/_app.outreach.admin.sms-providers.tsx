import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ServerCog, Activity, CheckCircle2, AlertTriangle, XCircle, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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

type Health = "healthy" | "degraded" | "down";

interface Provider {
  id: string;
  name: string;
  vendor: string;
  regions: string[];
  channels: Array<"marketing" | "otp" | "notification">;
  enabled: boolean;
  health: Health;
  deliveryRate: number; // 0-1
  tps: number;
  quotaUsed: number; // 0-1
  cost: string; // 每段
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
    tps: 100,
    quotaUsed: 0.42,
    cost: "$0.0075/段",
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
    tps: 60,
    quotaUsed: 0.28,
    cost: "$0.0068/段",
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
    tps: 200,
    quotaUsed: 0.76,
    cost: "¥0.045/段",
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
    tps: 300,
    quotaUsed: 0.15,
    cost: "$0.010/段",
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
    tps: 80,
    quotaUsed: 0,
    cost: "$0.008/段",
    lastCheck: "12 分钟前",
  },
];

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
      s.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
    toast.success("已更新服务商状态");
  }

  return (
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
              <TableHead>TPS</TableHead>
              <TableHead>今日配额</TableHead>
              <TableHead>单价</TableHead>
              <TableHead className="text-right">启用</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((p) => (
              <TableRow key={p.id}>
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
                <TableCell className="text-sm text-muted-foreground">{p.cost}</TableCell>
                <TableCell className="text-right">
                  <Switch checked={p.enabled} onCheckedChange={() => toggle(p.id)} />
                </TableCell>
              </TableRow>
            ))}
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
  return (
    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1">
      <XCircle className="h-3 w-3" /> 异常
    </Badge>
  );
}