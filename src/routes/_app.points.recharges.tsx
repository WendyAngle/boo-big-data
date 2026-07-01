import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, RotateCw, Plus, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListPagination } from "@/components/ListPagination";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/points/recharges")({
  head: () => ({ meta: [{ title: "积分管理系统 · 充值管理 | Boo数据平台" }] }),
  component: RechargesPage,
});

type RechargeType = "套餐购买" | "充值购买" | "赠送";

interface AppRef {
  name: string;
  code: string;
}

interface BundleItem {
  service: string;
  serviceCode: string;
  product: string;
  base: number;
  bonus: number;
}

interface RechargeRecord {
  id: string;
  customer: string;
  apps: AppRef[];
  product: string;
  type: RechargeType;
  amount: number;
  base: number;
  bonus: number;
  expireAt: string;
  createdAt: string;
  operator: string;
  bundle?: BundleItem[];
}

const CUSTOMERS = [
  "页面测试企业0630-1438",
  "成都云帆科技有限公司",
  "字节跳动",
  "蚂蚁集团",
  "美团点评",
  "宁德时代",
  "顺丰科技",
];

const APP_POOL: AppRef[] = [
  { name: "AI视频生成", code: "13963001438" },
  { name: "SIS", code: "iso_2070068853661081601" },
  { name: "悦意出海大数据平台", code: "iso_202606300001" },
  { name: "Global Big Data", code: "gbd_20260101" },
  { name: "AI图生视频", code: "aiv_20260321" },
];

const PRODUCTS = [
  "test-1",
  "出海大数据基础套餐",
  "AI视频尊享包",
  "Tiktok获客月度包",
  "全球线索季度包",
];

const TYPES: RechargeType[] = ["套餐购买", "充值购买", "赠送"];

function hex(i: number, len: number) {
  const s = (i * 2654435761).toString(16).padStart(8, "0");
  return (s + s + s + s).slice(0, len);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const RECORDS: RechargeRecord[] = Array.from({ length: 26 }).map((_, i) => {
  const type = TYPES[i % TYPES.length];
  const appCount = 1 + (i % 2);
  const apps = Array.from({ length: appCount }).map(
    (_, k) => APP_POOL[(i + k) % APP_POOL.length],
  );
  const base = [2000, 10000, 5000, 20000, 500][i % 5];
  const bonus = type === "充值购买" ? Math.round(base * 0.1) : Math.round(base * 0.1);
  const amount = type === "赠送" ? 0 : Math.round(base * (type === "套餐购买" ? 1 : 0.9));
  const day = ((i * 3) % 27) + 1;
  const h = (i * 7) % 24;
  const m = (i * 11) % 60;
  return {
    id: hex(i + 1, 32),
    customer: CUSTOMERS[i % CUSTOMERS.length],
    apps,
    product: PRODUCTS[i % PRODUCTS.length],
    type,
    amount,
    base,
    bonus,
    expireAt: `2027-${pad(((i * 2) % 12) + 1)}-${pad(day)}`,
    createdAt: `2026-06-${pad(day)} ${pad(h)}:${pad(m)}:${pad((i * 13) % 60)}`,
    operator: i % 5 === 0 ? "system" : "admin",
    bundle:
      type === "套餐购买"
        ? [
            {
              service: "出海大数据",
              serviceCode: "Global_Big_Data",
              product: "出海大数据",
              base,
              bonus,
            },
          ]
        : undefined,
  };
});

const TYPE_STYLES: Record<RechargeType, string> = {
  套餐购买: "bg-emerald-50 text-emerald-700 border-emerald-200",
  充值购买: "bg-sky-50 text-sky-700 border-sky-200",
  赠送: "bg-amber-50 text-amber-700 border-amber-200",
};

function RechargesPage() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState("");
  const [type, setType] = useState<string>("all");
  const [applied, setApplied] = useState({ customer: "", type: "all" });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [detail, setDetail] = useState<RechargeRecord | null>(null);

  const filtered = useMemo(() => {
    return RECORDS.filter((r) => {
      if (applied.customer && !r.customer.includes(applied.customer)) return false;
      if (applied.type !== "all" && r.type !== applied.type) return false;
      return true;
    });
  }, [applied]);

  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleSearch() {
    setApplied({ customer: customer.trim(), type });
    setPage(1);
  }
  function handleReset() {
    setCustomer("");
    setType("all");
    setApplied({ customer: "", type: "all" });
    setPage(1);
  }

  return (
    <div className="p-6 space-y-4">
      {/* 搜索区 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="请输入客户名称"
            className="w-64 h-9"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-56 h-9">
              <SelectValue placeholder="请选择充值类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部充值类型</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} className="h-9 gap-1.5">
            <Search className="h-4 w-4" />
            搜索
          </Button>
          <Button variant="outline" onClick={handleReset} className="h-9 gap-1.5">
            <RotateCw className="h-4 w-4" />
            重置
          </Button>
        </div>
      </Card>

      {/* 列表区 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="outline"
            className="h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
            onClick={() => navigate({ to: "/outreach/recharge" })}
          >
            <Plus className="h-4 w-4" />
            新增充值
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Search className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setApplied({ ...applied })}
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-center">订单编号</TableHead>
                <TableHead className="text-center">客户名称</TableHead>
                <TableHead className="text-center">关联应用</TableHead>
                <TableHead className="text-center">产品名称</TableHead>
                <TableHead className="text-center">充值类型</TableHead>
                <TableHead className="text-center">充值金额</TableHead>
                <TableHead className="text-center">基础积分</TableHead>
                <TableHead className="text-center">赠送积分</TableHead>
                <TableHead className="text-center">积分到期日</TableHead>
                <TableHead className="text-center">充值时间</TableHead>
                <TableHead className="text-center">操作人</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-10 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
              {pageData.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell className="text-center font-mono text-xs break-all max-w-[180px]">
                    {r.id}
                  </TableCell>
                  <TableCell className="text-center text-sm">{r.customer}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      {r.apps.map((a, i) => (
                        <div
                          key={i}
                          className="inline-block max-w-[220px] rounded-md bg-muted/60 px-2.5 py-1 text-xs text-foreground/80 truncate"
                          title={`${a.name} | ${a.code}`}
                        >
                          {a.name} | {a.code}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">{r.product}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn("font-normal", TYPE_STYLES[r.type])}
                    >
                      {r.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-rose-600 tabular-nums font-medium">
                    ¥{r.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {r.base.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-emerald-600">
                    +{r.bonus.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {r.expireAt}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {r.createdAt}
                  </TableCell>
                  <TableCell className="text-center text-sm">{r.operator}</TableCell>
                  <TableCell className="text-center">
                    <button
                      className="text-primary text-sm hover:underline"
                      onClick={() => setDetail(r)}
                    >
                      查看
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-3">
          <ListPagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>充值详情</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <Row label1="订单编号" value1={<span className="font-mono text-xs break-all">{detail.id}</span>} label2="客户名称" value2={detail.customer} />
                    <Row label1="产品名称" value1={detail.product} label2="充值类型" value2={<Badge variant="outline" className={cn("font-normal", TYPE_STYLES[detail.type])}>{detail.type}</Badge>} />
                    <Row label1="充值金额" value1={<span className="text-rose-600 tabular-nums">¥{detail.amount.toFixed(2)}</span>} label2="积分到期日" value2={detail.expireAt} />
                    <Row label1="基础积分" value1={<span className="tabular-nums">{detail.base.toLocaleString()}</span>} label2="赠送积分" value2={<span className="tabular-nums text-emerald-600">{detail.bonus.toLocaleString()}</span>} />
                  </tbody>
                </table>
              </div>

              {detail.bundle && detail.bundle.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">套餐产品选择</div>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>服务项</TableHead>
                          <TableHead>适用产品</TableHead>
                          <TableHead className="text-right">基础积分</TableHead>
                          <TableHead className="text-right">赠送积分</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.bundle.map((b, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="text-sm">{b.service}</div>
                              <div className="text-xs text-muted-foreground">{b.serviceCode}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal bg-muted/40">
                                {b.product}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{b.base.toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-600">{b.bonus.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
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
      <td className="bg-muted/40 px-4 py-2.5 w-[110px] text-muted-foreground align-middle">{label1}</td>
      <td className="px-4 py-2.5 align-middle">{value1}</td>
      <td className="bg-muted/40 px-4 py-2.5 w-[110px] text-muted-foreground align-middle border-l">{label2}</td>
      <td className="px-4 py-2.5 align-middle">{value2}</td>
    </tr>
  );
}