import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Route as RouteIcon, ArrowRight, Plus, Trash2, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/outreach/admin/sms-routing")({
  head: () => ({
    meta: [
      { title: "短信路由策略 · 系统管理 | Boo数据平台" },
      {
        name: "description",
        content: "配置目的国家、渠道类型与合规状态对服务商的路由映射与 Failover 规则。",
      },
    ],
  }),
  component: SmsRoutingPage,
});

interface Rule {
  id: string;
  name: string;
  match: {
    country: string;
    channel: "marketing" | "otp" | "notification" | "any";
  };
  primary: string;
  failover: string[];
  minDeliveryRate: number;
  respectQuietHours: boolean;
  enabled: boolean;
  priority: number;
}

const SEED: Rule[] = [
  {
    id: "r1",
    name: "北美 · 营销",
    match: { country: "US/CA", channel: "marketing" },
    primary: "Twilio 主账号",
    failover: ["Sinch A2P"],
    minDeliveryRate: 0.95,
    respectQuietHours: true,
    enabled: true,
    priority: 1,
  },
  {
    id: "r2",
    name: "欧洲 · 通知",
    match: { country: "EU", channel: "notification" },
    primary: "Vonage 备用",
    failover: ["Twilio 主账号"],
    minDeliveryRate: 0.93,
    respectQuietHours: true,
    enabled: true,
    priority: 2,
  },
  {
    id: "r3",
    name: "亚太 · 全渠道",
    match: { country: "APAC", channel: "any" },
    primary: "阿里云国际站",
    failover: ["Vonage 备用", "Twilio 主账号"],
    minDeliveryRate: 0.9,
    respectQuietHours: true,
    enabled: true,
    priority: 3,
  },
  {
    id: "r4",
    name: "全球 · 验证码 OTP",
    match: { country: "全球", channel: "otp" },
    primary: "Infobip",
    failover: ["Twilio 主账号"],
    minDeliveryRate: 0.98,
    respectQuietHours: false,
    enabled: true,
    priority: 4,
  },
];

function SmsRoutingPage() {
  const [rules, setRules] = useState<Rule[]>(SEED);

  function toggle(id: string) {
    setRules((s) => s.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }
  function remove(id: string) {
    setRules((s) => s.filter((r) => r.id !== id));
    toast.success("已删除规则");
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <RouteIcon className="h-5 w-5 text-primary" />
            短信路由策略
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            按「目的国家 × 渠道类型」匹配规则，选择主服务商，主服务商送达率跌破阈值或不可用时自动 Failover。
            规则按优先级从上至下匹配，首个命中即生效。
          </p>
        </div>
        <Button
          onClick={() =>
            toast.info("演示环境：规则编辑器待接入", { description: "生产环境将支持完整可视化编辑与仿真回放" })
          }
        >
          <Plus className="h-4 w-4" />
          新增规则
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
          <div className="col-span-3">规则名 / 匹配条件</div>
          <div className="col-span-4">主 → Failover 服务商链路</div>
          <div className="col-span-2">最低送达率</div>
          <div className="col-span-2">静默时段</div>
          <div className="col-span-1 text-right">操作</div>
        </div>
        {rules.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-12 gap-2 items-center px-4 py-3 border-t"
          >
            <div className="col-span-3">
              <div className="flex items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="font-medium text-sm">{r.name}</span>
              </div>
              <div className="mt-1 ml-5 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {r.match.country}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {r.match.channel === "any"
                    ? "全部渠道"
                    : r.match.channel === "otp"
                    ? "验证码"
                    : r.match.channel === "marketing"
                    ? "营销"
                    : "通知"}
                </Badge>
              </div>
            </div>
            <div className="col-span-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className="bg-primary text-primary-foreground text-[11px]">
                  {r.primary}
                </Badge>
                {r.failover.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-[11px]">
                      {f}
                    </Badge>
                  </span>
                ))}
              </div>
            </div>
            <div className="col-span-2 text-sm font-mono">
              {(r.minDeliveryRate * 100).toFixed(0)}%
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">
              {r.respectQuietHours ? "本地 08:00–21:00" : "24 小时"}
            </div>
            <div className="col-span-1 flex items-center justify-end gap-2">
              <Switch checked={r.enabled} onCheckedChange={() => toggle(r.id)} />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-rose-600"
                onClick={() => remove(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-2 bg-sky-50/60 border-sky-200">
        <div className="text-sm font-medium text-sky-900">路由决策逻辑</div>
        <ol className="list-decimal ml-4 text-xs text-sky-800 space-y-0.5">
          <li>解析手机号 → 归属国家、运营商、A2P 合规状态。</li>
          <li>按渠道类型（营销/通知/验证码）匹配第一条命中的启用规则。</li>
          <li>命中收件人退订名单 → 直接终止，扣 0 积分。</li>
          <li>主服务商健康且未超配额 → 使用主服务商；否则依次尝试 Failover。</li>
          <li>静默时段命中 → 排队至次日窗口。</li>
          <li>写入 <code>sms_messages.provider_id</code> 与 <code>route_reason</code> 供审计。</li>
        </ol>
      </Card>
    </div>
  );
}