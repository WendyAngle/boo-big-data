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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  summary: {
    available: number;
    recharged: number;
    consumed: number;
    expired: number;
  };
  productPoints: {
    available: number;
    consumed: number;
    expired: number;
    granted: number;
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
    const remaining = Math.max(0, total - Math.floor(consumed / rechargeCount));
    const day = ((i + k) % 27) + 1;
    const month = ((i + k) % 6) + 1;
    const hasRefund = (i + k) % 5 === 0;
    return {
      orderId: `${String(i * 17 + k).padStart(2, "0")}b0c082fe244f14be0f6142d0${pad(k)}`,
      type: "套餐购买",
      plan: `${APP_POOL[(i + k) % APP_POOL.length].label}基础套餐`,
      amount,
      base,
      bonus,
      total,
      remaining,
      expireAt: `2027-${pad(month)}-${pad(day)}`,
      rechargedAt: `2026-${pad(month)}-${pad(day)} ${pad((i * 3) % 24)}:${pad((i * 11) % 60)}:${pad((i * 7) % 60)}`,
      operator: i % 5 === 0 ? "system" : "admin",
      refund: hasRefund
        ? {
            amount: Math.round(amount * 0.5 * 100) / 100,
            refundedAt: `2026-${pad(month)}-${pad(Math.min(28, day + 2))} 10:22:15`,
            operator: "admin",
            remark: "客户申请部分退款",
          }
        : undefined,
    };
  });

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
    summary: { available, recharged, consumed, expired },
    productPoints: {
      available,
      consumed,
      expired,
      granted: available + consumed + expired,
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
                {t.enabled ? "合作中" : "已停用"}
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

      {/* 关联应用账号 / 积分汇总 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-base font-semibold mb-4">关联应用账号</div>
          <div className="space-y-3">
            {t.apps.map((a) => (
              <div
                key={a.code + a.extId}
                className="rounded-lg border bg-muted/20 p-3 space-y-2"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Building2 className="h-4 w-4 text-primary" />
                  {a.label}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <div className="text-muted-foreground">外部客户ID</div>
                    <div className="font-mono mt-0.5">{a.extId || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      手机号码
                    </div>
                    <div className="font-mono mt-0.5 text-right">
                      {a.phone || "-"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-base font-semibold mb-4">积分汇总</div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile
              value={t.summary.available}
              label="剩余可用"
              icon={<Wallet className="h-8 w-8" />}
              gradient="from-sky-500 to-blue-500"
            />
            <SummaryTile
              value={t.summary.recharged}
              label="累计充值"
              icon={<TrendingUp className="h-8 w-8" />}
              gradient="from-emerald-500 to-green-500"
            />
            <SummaryTile
              value={t.summary.consumed}
              label="已消费"
              icon={<ShoppingCart className="h-8 w-8" />}
              gradient="from-amber-500 to-orange-500"
            />
            <SummaryTile
              value={t.summary.expired}
              label="已失效"
              icon={<TimerReset className="h-8 w-8" />}
              gradient="from-rose-500 to-red-500"
            />
          </div>
        </Card>
      </div>

      {/* 积分余额详情 */}
      <Card className="p-5">
        <div className="text-base font-semibold mb-4">积分余额详情</div>
        <div className="rounded-lg border border-sky-200/70 bg-sky-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">产品集合积分</div>
            <div className="text-xs text-muted-foreground">
              剩余可用:{" "}
              <span className="text-sky-600 font-semibold tabular-nums">
                {nf.format(t.productPoints.available)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <MetricLine
              label="可用余额"
              value={t.productPoints.available}
              tone="text-sky-600"
              formatter={nf}
            />
            <MetricLine
              label="已消费"
              value={t.productPoints.consumed}
              tone="text-amber-600"
              formatter={nf}
            />
            <MetricLine
              label="已失效"
              value={t.productPoints.expired}
              tone="text-rose-600"
              formatter={nf}
            />
            <MetricLine
              label="累计发放"
              value={t.productPoints.granted}
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

function SummaryTile({
  value,
  label,
  icon,
  gradient,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br ${gradient}`}
    >
      <div className="text-3xl font-bold tabular-nums leading-tight">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-white/85 mt-1">{label}</div>
      <div className="absolute right-3 bottom-3 text-white/40">{icon}</div>
    </div>
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