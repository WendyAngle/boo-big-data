import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ChevronLeft,
  Wallet,
  TrendingUp,
  ShoppingCart,
  TimerReset,
  Building2,
  Smartphone,
  Undo2,
  Gift,
  Coins,
  Banknote,
  HelpCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/points/tenants/$id")({
  head: ({ params }) => ({
    meta: [{ title: `客户详情 · ${params.id} | Boo数据平台` }],
  }),
  loader: ({ params }) => {
    const t = buildTenant(params.id);
    if (!t) throw notFound();
    return t;
  },
  notFoundComponent: () => (
    <div className="p-8">
      <Card className="p-16 text-center text-muted-foreground">未找到该客户</Card>
    </div>
  ),
  component: CustomerDetailPage,
});

/* ---------------- Mock reconstruction (与列表同种子) ---------------- */

const INDUSTRIES = ["金融", "电商", "制造", "教育", "医疗", "互联网", "物流"];
const CONTACT_NAMES = [
  "张伟", "王芳", "李娜", "刘洋", "陈思", "杨明",
  "赵磊", "黄雨", "周凯", "吴婷",
];
const TENANT_NAMES = [
  "字节跳动", "蚂蚁集团", "美团点评", "京东物流", "宁德时代",
  "比亚迪汽车", "顺丰科技", "腾讯云", "阿里云", "网易严选",
];
const APP_POOL = [
  { code: "SIS", label: "SIS" },
  { code: "boopilot", label: "boopilot" },
  { code: "outreach", label: "Outreach" },
  { code: "insight", label: "Insight" },
];

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

interface CustomerDetail {
  id: string;
  cid: string;
  name: string;
  industry: string;
  contact: string;
  contactPhone: string;
  partner: string;
  enabled: boolean;
  apps: Array<{ code: string; label: string; extId: string; phone: string }>;
  /** 资金台账 (元) */
  money: {
    gross: number;      // 累计充值金额
    refunded: number;   // 累计退费金额
    net: number;        // 净充值金额
    refundOrders: number;
  };
  /** 积分流转 (积分)   累计发放 = 已消费 + 已退回 + 已过期 + 剩余可用 */
  points: {
    granted: number;
    consumed: number;
    refunded: number;
    expired: number;
    available: number;
  };
  recharges: Array<{
    orderId: string;
    type: string;
    plan: string;
    amount: number;
    base: number;
    bonus: number;
    total: number;
    remaining: number;
    refundedPoints?: number;
    expireAt: string;
    rechargedAt: string;
    operator: string;
    refund?: {
      amount: number;
      refundedAt: string;
      operator: string;
      remark?: string;
    };
  }>;
}

function buildTenant(id: string): CustomerDetail | null {
  if (!/^PT\d{6}$/.test(id)) return null;
  const i = parseInt(id.slice(2), 10) - 202601;
  if (i < 0 || i >= 24) return null;

  const generalBalance = ((i * 1373) % 90 + 5) * 1000;
  const proBalance = ((i * 911) % 50 + 2) * 1000;
  const totalRecharge = ((i * 7) % 20 + 1) * 5000;
  const totalSpend = ((i * 13) % 60 + 4) * 1000;
  const enabled = i % 7 !== 0;
  const name = `${TENANT_NAMES[i % TENANT_NAMES.length]}${i > 9 ? `(${i})` : ""}`;
  const cid = `CID${String(i + 1).padStart(6, "0")}`;

  const available = generalBalance + proBalance;
  const expired = ((i * 5) % 30) * 100;
  const consumed = totalSpend;
  const recharged = consumed + available + expired;

  const appCount = (i % 3) + 1;
  const apps = Array.from({ length: appCount }, (_, k) => {
    const pool = APP_POOL[(i + k) % APP_POOL.length];
    return {
      code: pool.code,
      label: pool.label,
      extId: `${pool.code.toUpperCase()}-${String((i + 1) * 1000 + k).padStart(6, "0")}`,
      phone:
        k === 0 && i % 2 === 0
          ? ""
          : "1" + String(30000000000 + ((i * 991 + k * 137) % 8999999999)).slice(0, 10),
    };
  });

  const rechargeCount = (i % 2) + 1;
  const recharges = Array.from({ length: rechargeCount }, (_, k) => {
    const amount = ((i + k + 1) * 500) % 4500 + 500;
    const base = amount * 10 + k * 500;
    const bonus = Math.floor(base * 0.25);
    const total = base + bonus;
    const day = ((i + k) % 27) + 1;
    const month = ((i + k) % 6) + 1;
    const hasRefund = (i + k) % 5 === 0;
    const refundAmount = hasRefund ? Math.round(amount * 0.5 * 100) / 100 : 0;
    const refundedPoints = hasRefund
      ? Math.round((total * refundAmount) / Math.max(amount, 1))
      : 0;
    const consumedPortion = Math.floor(consumed / rechargeCount);
    const remaining = Math.max(0, total - refundedPoints - consumedPortion);
    return {
      orderId: `${String(i * 17 + k).padStart(2, "0")}b0c082fe244f14be0f6142d0${pad(k)}`,
      type: "套餐购买",
      plan: `${APP_POOL[(i + k) % APP_POOL.length].label}基础套餐`,
      amount,
      base,
      bonus,
      total,
      remaining,
      refundedPoints: refundedPoints || undefined,
      expireAt: `2027-${pad(month)}-${pad(day)}`,
      rechargedAt: `2026-${pad(month)}-${pad(day)} ${pad((i * 3) % 24)}:${pad((i * 11) % 60)}:${pad((i * 7) % 60)}`,
      operator: i % 5 === 0 ? "system" : "admin",
      refund: hasRefund
        ? {
            amount: refundAmount,
            refundedAt: `2026-${pad(month)}-${pad(Math.min(28, day + 2))} 10:22:15`,
            operator: "admin",
            remark: "客户申请部分退款",
          }
        : undefined,
    };
  });

  // 资金台账
  const grossMoney = recharges.reduce((s, r) => s + r.amount, 0);
  const refundedMoney = recharges.reduce(
    (s, r) => s + (r.refund?.amount ?? 0),
    0,
  );
  const refundOrders = recharges.filter((r) => r.refund).length;

  // 积分流转
  const grantedPts = recharges.reduce((s, r) => s + r.total, 0);
  const refundedPts = recharges.reduce(
    (s, r) => s + (r.refundedPoints ?? 0),
    0,
  );
  // 保证恒等式：consumed 上限为 granted - refunded - expired
  const consumedPts = Math.min(consumed, Math.max(0, grantedPts - refundedPts - expired));
  const availablePts = Math.max(0, grantedPts - consumedPts - refundedPts - expired);

  return {
    id,
    cid,
    name,
    industry: INDUSTRIES[i % INDUSTRIES.length],
    contact: CONTACT_NAMES[i % CONTACT_NAMES.length],
    contactPhone:
      "138" + String(10000000 + ((i * 1357) % 89999999)).slice(0, 8),
    partner: "Boo总部",
    enabled,
    apps,
    money: {
      gross: grossMoney,
      refunded: refundedMoney,
      net: grossMoney - refundedMoney,
      refundOrders,
    },
    points: {
      granted: grantedPts,
      consumed: consumedPts,
      refunded: refundedPts,
      expired,
      available: availablePts,
    },
    recharges,
  };
}

/* ---------------- Page ---------------- */

function CustomerDetailPage() {
  const t = Route.useLoaderData() as CustomerDetail;
  const nf = useMemo(() => new Intl.NumberFormat("en-US"), []);
  type Recharge = CustomerDetail["recharges"][number];
  const [detail, setDetail] = useState<Recharge | null>(null);
  const [refundDetail, setRefundDetail] = useState<Recharge | null>(null);

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link
          to="/points/tenants"
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-3 py-1.5 text-sm font-medium hover:bg-primary/15 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          返回企业列表
        </Link>
      </div>

      {/* 基础信息 / 联系信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="基础信息">
          <KV label="企业名称" value={<span className="font-medium">{t.name}</span>} />
          <KV label="客户编号" value={<span className="font-mono">{t.cid}</span>} />
          <KV
            label="状态"
            value={
              <Badge
                variant="outline"
                className={
                  t.enabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-muted text-muted-foreground"
                }
              >
                {t.enabled ? "合作中" : "终止合作"}
              </Badge>
            }
          />
        </SectionCard>
        <SectionCard title="联系信息">
          <KV label="联系人" value={t.contact} />
          <KV
            label="联系电话"
            value={<span className="font-mono">{t.contactPhone}</span>}
          />
        </SectionCard>
      </div>

      {/* 关联应用 */}
      <Card className="p-5">
          <div className="text-base font-semibold mb-4">关联应用</div>
          <div className="flex flex-col gap-3">
            {t.apps.map((a) => (
              <div
                key={a.code + a.extId}
                className="rounded-lg border bg-muted/20 px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-3"
              >
                <div className="flex items-center gap-2 font-medium min-w-[10rem]">
                  <Building2 className="h-4 w-4 text-primary" />
                  {a.label}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">外部客户ID</span>
                  <span className="font-mono">{a.extId || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Smartphone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">手机号码</span>
                  <span className="font-mono">{a.phone || "-"}</span>
                </div>
              </div>
            ))}
          </div>
      </Card>

      {/* 积分汇总 (分层：资金台账 + 积分流转) */}
      <Card className="p-5 space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">积分汇总</div>
          <div className="text-xs text-muted-foreground">
            账目恒等式：累计发放 = 已消费 + 已退回 + 已过期 + 剩余可用
          </div>
        </div>

        {/* 第 1 层：资金台账 (元) */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Banknote className="h-4 w-4" /> 资金台账（元）
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MoneyTile
              label="累计充值金额"
              value={t.money.gross}
              tone="from-emerald-500 to-green-500"
              icon={<TrendingUp className="h-8 w-8" />}
              hint="客户历史所有成功充值订单的金额总和（未扣除退费）。"
            />
            <MoneyTile
              label="累计退费金额"
              value={t.money.refunded}
              tone="from-amber-500 to-orange-500"
              icon={<Undo2 className="h-8 w-8" />}
              badge={
                t.money.refundOrders > 0
                  ? `退费 ${t.money.refundOrders} 笔`
                  : undefined
              }
              hint="已成功退回到客户的充值金额总和，仅统计已完成的退费单。"
            />
            <MoneyTile
              label="净充值金额"
              value={t.money.net}
              tone="from-primary to-primary/70"
              icon={<Wallet className="h-8 w-8" />}
              emphasize
              hint="净充值 = 累计充值金额 − 累计退费金额，用作对账主指标。"
            />
          </div>
        </div>

        {/* 第 2 层：积分流转 (积分) */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Coins className="h-4 w-4" /> 积分流转（积分）
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <PointsTile
              label="剩余可用"
              value={t.points.available}
              tone="bg-sky-50 border-sky-200 text-sky-700"
              accent="text-sky-700"
              icon={<Wallet className="h-4 w-4" />}
              emphasize
              hint="当前账户中仍可使用的积分余额（已扣除消费、退回和过期部分）。"
            />
            <PointsTile
              label="累计发放"
              value={t.points.granted}
              tone="bg-slate-50 border-slate-200 text-slate-600"
              accent="text-slate-800"
              icon={<Gift className="h-4 w-4" />}
              hint="历史所有充值订单为客户发放的积分总和（含赠送积分，未扣除后续消费/退回/过期）。"
            />
            <PointsTile
              label="已消费"
              value={t.points.consumed}
              tone="bg-amber-50 border-amber-200 text-amber-700"
              accent="text-amber-700"
              icon={<ShoppingCart className="h-4 w-4" />}
              hint="客户在平台内已实际使用掉的积分总和。"
            />
            <PointsTile
              label="已退回"
              value={t.points.refunded}
              tone="bg-violet-50 border-violet-200 text-violet-700"
              accent="text-violet-700"
              icon={<Undo2 className="h-4 w-4" />}
              hint="因订单退费而从账户回收的积分总和,不再计入可用余额。"
            />
            <PointsTile
              label="已过期"
              value={t.points.expired}
              tone="bg-rose-50 border-rose-200 text-rose-700"
              accent="text-rose-700"
              icon={<TimerReset className="h-4 w-4" />}
              hint="到达有效期后自动作废、不可再使用的积分总和。"
            />
          </div>
        </div>
      </Card>

      {/* 积分余额详情 */}
      <Card className="p-5">
        <div className="text-base font-semibold mb-4">积分余额详情</div>
        <div className="rounded-lg border border-sky-200/70 bg-sky-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">产品集合积分</div>
            <div className="text-xs text-muted-foreground">
              剩余可用:{" "}
              <span className="text-sky-600 font-semibold tabular-nums">
                {nf.format(t.points.available)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <MetricLine
              label="可用余额"
              value={t.points.available}
              tone="text-sky-600"
              formatter={nf}
            />
            <MetricLine
              label="已消费"
              value={t.points.consumed}
              tone="text-amber-600"
              formatter={nf}
            />
            <MetricLine
              label="已退回"
              value={t.points.refunded}
              tone="text-violet-600"
              formatter={nf}
            />
            <MetricLine
              label="已过期"
              value={t.points.expired}
              tone="text-rose-600"
              formatter={nf}
            />
            <MetricLine
              label="累计发放"
              value={t.points.granted}
              tone="text-foreground"
              formatter={nf}
            />
          </div>
        </div>
      </Card>

      {/* 充值记录 */}
      <Card className="p-5">
        <div className="text-base font-semibold mb-4">充值记录</div>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="whitespace-nowrap">订单ID</TableHead>
                <TableHead className="whitespace-nowrap">充值类型</TableHead>
                <TableHead className="whitespace-nowrap">套餐名称</TableHead>
                <TableHead className="text-right whitespace-nowrap">充值金额</TableHead>
                <TableHead className="text-right whitespace-nowrap">基础积分</TableHead>
                <TableHead className="text-right whitespace-nowrap">赠送积分</TableHead>
                <TableHead className="text-right whitespace-nowrap">总积分</TableHead>
                <TableHead className="text-right whitespace-nowrap">剩余积分</TableHead>
                <TableHead className="whitespace-nowrap">过期时间</TableHead>
                <TableHead className="whitespace-nowrap">充值时间</TableHead>
                <TableHead className="text-center whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.recharges.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center py-10 text-muted-foreground"
                  >
                    暂无充值记录
                  </TableCell>
                </TableRow>
              ) : (
                t.recharges.map((r) => (
                  <TableRow key={r.orderId} className="hover:bg-accent/30">
                    <TableCell className="font-mono text-xs max-w-[160px] truncate">
                      {r.orderId}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-100">
                        {r.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.plan}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-rose-600">
                      ¥{nf.format(r.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sky-600 font-semibold">
                      {nf.format(r.base)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 font-semibold">
                      +{nf.format(r.bonus)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600 font-semibold">
                      {nf.format(r.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {nf.format(r.remaining)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.expireAt || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {r.rechargedAt}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-3 text-sm">
                        <button
                          className="text-primary hover:underline"
                          onClick={() => setDetail(r)}
                        >
                          查看详情
                        </button>
                        {r.refund && (
                          <button
                            className="text-amber-600 hover:underline"
                            onClick={() => setRefundDetail(r)}
                          >
                            查看退费详情
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 充值详情 */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>充值详情</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <Row
                    label1="订单编号"
                    value1={
                      <span className="font-mono text-xs break-all">
                        {detail.orderId}
                      </span>
                    }
                    label2="企业名称"
                    value2={t.name}
                  />
                  <Row
                    label1="套餐名称"
                    value1={detail.plan}
                    label2="充值类型"
                    value2={
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal bg-sky-50 text-sky-700 border-sky-200",
                        )}
                      >
                        {detail.type}
                      </Badge>
                    }
                  />
                  <Row
                    label1="充值金额"
                    value1={
                      <span className="text-rose-600 tabular-nums">
                        ¥{nf.format(detail.amount)}
                      </span>
                    }
                    label2="积分到期日"
                    value2={detail.expireAt || "-"}
                  />
                  <Row
                    label1="基础积分"
                    value1={
                      <span className="tabular-nums text-sky-600">
                        {nf.format(detail.base)}
                      </span>
                    }
                    label2="赠送积分"
                    value2={
                      <span className="tabular-nums text-emerald-600">
                        +{nf.format(detail.bonus)}
                      </span>
                    }
                  />
                  <Row
                    label1="总积分"
                    value1={
                      <span className="tabular-nums text-amber-600 font-medium">
                        {nf.format(detail.total)}
                      </span>
                    }
                    label2="剩余积分"
                    value2={
                      <span className="tabular-nums">
                        {nf.format(detail.remaining)}
                      </span>
                    }
                  />
                  <Row
                    label1="充值时间"
                    value1={
                      <span className="text-muted-foreground">
                        {detail.rechargedAt}
                      </span>
                    }
                    label2="操作人"
                    value2={detail.operator}
                  />
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 退费详情 */}
      <Dialog
        open={!!refundDetail}
        onOpenChange={(o) => !o && setRefundDetail(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>退费详情</DialogTitle>
          </DialogHeader>
          {refundDetail?.refund && (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <Row
                    label1="订单编号"
                    value1={
                      <span className="font-mono text-xs break-all">
                        {refundDetail.orderId}
                      </span>
                    }
                    label2="企业名称"
                    value2={t.name}
                  />
                  <Row
                    label1="充值金额"
                    value1={
                      <span className="text-rose-600 tabular-nums">
                        ¥{nf.format(refundDetail.amount)}
                      </span>
                    }
                    label2="退款金额"
                    value2={
                      <span className="text-amber-600 tabular-nums font-medium">
                        ¥{refundDetail.refund.amount.toFixed(2)}
                      </span>
                    }
                  />
                  <Row
                    label1="退款时间"
                    value1={
                      <span className="text-muted-foreground">
                        {refundDetail.refund.refundedAt}
                      </span>
                    }
                    label2="操作人"
                    value2={refundDetail.refund.operator}
                  />
                  <tr className="border-b last:border-b-0">
                    <td className="bg-muted/40 px-4 py-2.5 w-[110px] text-muted-foreground align-top">
                      备注
                    </td>
                    <td
                      colSpan={3}
                      className="px-4 py-2.5 align-top whitespace-pre-wrap break-words"
                    >
                      {refundDetail.refund.remark || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDetail(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label1,
  value1,
  label2,
  value2,
}: {
  label1: string;
  value1: React.ReactNode;
  label2: string;
  value2: React.ReactNode;
}) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="bg-muted/40 px-4 py-2.5 w-[110px] text-muted-foreground align-middle">
        {label1}
      </td>
      <td className="px-4 py-2.5 align-middle">{value1}</td>
      <td className="bg-muted/40 px-4 py-2.5 w-[110px] text-muted-foreground align-middle border-l">
        {label2}
      </td>
      <td className="px-4 py-2.5 align-middle">{value2}</td>
    </tr>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="text-base font-semibold border-b pb-3 mb-4">{title}</div>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function MoneyTile({
  value,
  label,
  tone,
  icon,
  emphasize,
  badge,
  hint,
}: {
  value: number;
  label: string;
  tone: string;
  icon: React.ReactNode;
  emphasize?: boolean;
  badge?: string;
  hint?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br ${tone} ${
        emphasize ? "ring-2 ring-primary/40 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-white/90">
          <span>{label}</span>
          {hint && <HintIcon text={hint} className="text-white/80 hover:text-white" />}
        </div>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white">
            {badge}
          </span>
        )}
      </div>
      <div
        className={`mt-2 font-bold tabular-nums leading-tight ${
          emphasize ? "text-3xl" : "text-2xl"
        }`}
      >
        ¥{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="absolute right-3 bottom-3 text-white/30">{icon}</div>
    </div>
  );
}

function PointsTile({
  value,
  label,
  tone,
  accent,
  icon,
  emphasize,
  hint,
}: {
  value: number;
  label: string;
  tone: string;
  accent: string;
  icon: React.ReactNode;
  emphasize?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${tone} ${
        emphasize ? "ring-2 ring-sky-400/50 shadow-md" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs">
        {icon}
        <span>{label}</span>
        {hint && <HintIcon text={hint} className="ml-auto opacity-70 hover:opacity-100" />}
      </div>
      <div
        className={`mt-1 font-bold tabular-nums leading-tight ${accent} ${
          emphasize ? "text-2xl" : "text-xl"
        }`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function HintIcon({ text, className }: { text: string; className?: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="说明"
            className={cn("inline-flex items-center justify-center", className)}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground border shadow-md">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MetricLine({
  label,
  value,
  tone,
  formatter,
}: {
  label: string;
  value: number;
  tone: string;
  formatter: Intl.NumberFormat;
}) {
  return (
    <div className="flex items-center justify-between border-b border-sky-200/40 pb-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>
        {formatter.format(value)}
      </span>
    </div>
  );
}