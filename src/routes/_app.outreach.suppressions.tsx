import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, Mail, Phone, Plus, Search, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format-date";
import {
  addSuppression,
  removeSuppression,
  useSuppressions,
  type SuppressionKind,
} from "@/lib/suppressions-store";

export const Route = createFileRoute("/_app/outreach/suppressions")({
  head: () => ({
    meta: [
      { title: "退订名单 | Boo数据平台" },
      {
        name: "description",
        content: "统一维护邮件与短信的退订名单，避免向已退订用户重复触达。",
      },
    ],
  }),
  component: SuppressionsPage,
});

function SuppressionsPage() {
  const list = useSuppressions();
  const [tab, setTab] = useState<SuppressionKind>("email");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removeTargets, setRemoveTargets] = useState<string[] | null>(null);

  // 切换 tab / 搜索时清空选择，避免跨视图误操作
  useEffect(() => {
    setSelected(new Set());
  }, [tab, q]);

  const counts = useMemo(
    () => ({
      email: list.filter((r) => r.kind === "email").length,
      phone: list.filter((r) => r.kind === "phone").length,
    }),
    [list],
  );

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return list
      .filter((r) => r.kind === tab)
      .filter((r) =>
        !kw ||
        r.value.toLowerCase().includes(kw) ||
        r.reason.toLowerCase().includes(kw) ||
        (r.source || "").toLowerCase().includes(kw),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [list, tab, q]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someChecked = filtered.some((r) => selected.has(r.id));
  const selectedInView = filtered.filter((r) => selected.has(r.id));

  function toggleAll(v: boolean) {
    const next = new Set(selected);
    if (v) filtered.forEach((r) => next.add(r.id));
    else filtered.forEach((r) => next.delete(r.id));
    setSelected(next);
  }
  function toggleOne(id: string, v: boolean) {
    const next = new Set(selected);
    if (v) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Ban className="h-5 w-5 text-rose-500" />
            退订名单
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            系统会在收到退订请求、投诉、STOP 关键字或硬退信时自动加入。名单中的地址将被后续所有触达任务跳过。
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            批量导入
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            手动添加
          </Button>
        </div>
      </div>

      <Card className="px-4 py-1">
        <Accordion type="single" collapsible>
          <AccordionItem value="src" className="border-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              来源说明：STOP 关键字 / 硬退信 分别是什么？
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="grid gap-3 md:grid-cols-2 text-xs">
                <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    STOP 关键字（短信）
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    国际短信合规要求：收件人回复退订关键字即视为退订，服务商（Twilio / Vonage 等）会自动拦截后续营销短信，发送方必须同步加入退订名单，否则面临封号与合规处罚（美国 TCPA / CTIA、欧盟 GDPR）。
                  </p>
                  <div className="pt-1 space-y-0.5">
                    <div>
                      <span className="text-muted-foreground">常见关键字：</span>
                      <code className="text-[11px]">STOP · UNSUBSCRIBE · END · CANCEL · 退订 · TD</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">反向恢复：</span>
                      <code className="text-[11px]">START · UNSTOP · YES</code>
                    </div>
                  </div>
                  <p className="text-muted-foreground pt-1">
                    触发链路：用户回复 → 服务商 MO 回调 → 写入退订名单 → 后续任务跳过该号码，扣 0 积分。
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    硬退信 Hard Bounce（邮件）
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    邮件投递时收到的<strong>永久性</strong>失败回执，代表该邮箱根本无法送达（邮箱不存在 / 已注销 / 域名 MX 失效 / 账号被封）。继续发送会拉低发件域与 IP 信誉度，导致其它正常邮件被判为垃圾邮件。
                  </p>
                  <div className="pt-1">
                    <span className="text-muted-foreground">典型 SMTP 状态码：</span>
                    <code className="text-[11px]">550 5.1.1 · 550 5.1.10 · 553</code>
                  </div>
                  <p className="text-muted-foreground pt-1">
                    对比<strong>软退信</strong>（收件箱满 / 服务器超时等临时故障）：可稍后重试，<strong>不</strong>入退订名单。
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2">
          <TabButton
            active={tab === "email"}
            icon={<Mail className="h-3.5 w-3.5" />}
            label="邮箱"
            count={counts.email}
            onClick={() => setTab("email")}
          />
          <TabButton
            active={tab === "phone"}
            icon={<Phone className="h-3.5 w-3.5" />}
            label="手机号"
            count={counts.phone}
            onClick={() => setTab("phone")}
          />
          {selectedInView.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => setRemoveTargets(selectedInView.map((r) => r.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
              批量移除 ({selectedInView.length})
            </Button>
          )}
          <div className="ml-auto relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "email" ? "按邮箱 / 原因 / 来源搜索" : "按手机号 / 原因 / 来源搜索"}
              className="pl-8 h-8"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleAll(v === true)}
                  aria-label="全选"
                />
              </TableHead>
              <TableHead className="w-[280px]">{tab === "email" ? "邮箱" : "手机号"}</TableHead>
              <TableHead>原因</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>加入时间</TableHead>
              <TableHead className="w-16 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                  暂无退订记录
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={(v) => toggleOne(r.id, v === true)}
                      aria-label="选中"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.value}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.source || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-rose-600 hover:text-rose-700"
                      onClick={() => setRemoveTargets([r.id])}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AddOneDialog open={addOpen} onOpenChange={setAddOpen} defaultKind={tab} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} defaultKind={tab} />
      <RemoveDialog
        ids={removeTargets}
        items={list}
        onOpenChange={(o) => {
          if (!o) setRemoveTargets(null);
        }}
        onConfirmed={(ids) => {
          ids.forEach((id) => removeSuppression(id));
          setSelected((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
          setRemoveTargets(null);
          toast.success(`已移除 ${ids.length} 条，该地址已恢复可触达状态`);
        }}
      />
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {icon}
      {label}
      <Badge
        variant="secondary"
        className={cn(
          "ml-1 text-[10px] h-4 px-1.5",
          active && "bg-primary-foreground/20 text-primary-foreground",
        )}
      >
        {count}
      </Badge>
    </button>
  );
}

function AddOneDialog({
  open,
  onOpenChange,
  defaultKind,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultKind: SuppressionKind;
}) {
  const [kind, setKind] = useState<SuppressionKind>(defaultKind);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("手动添加");
  const [note, setNote] = useState("");

  function submit() {
    if (!value.trim()) {
      toast.error("请输入地址");
      return;
    }
    addSuppression(kind, value.trim(), reason || "手动添加", "手动", note || undefined);
    toast.success("已加入退订名单");
    setValue("");
    setNote("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>手动添加退订记录</DialogTitle>
          <DialogDescription>
            添加后，任何针对该地址的邮件/短信触达都会被拦截。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm">类型</label>
            <div className="col-span-2">
              <Select value={kind} onValueChange={(v) => setKind(v as SuppressionKind)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">邮箱</SelectItem>
                  <SelectItem value="phone">手机号</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm">{kind === "email" ? "邮箱" : "手机号"}</label>
            <Input
              className="col-span-2"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={kind === "email" ? "user@example.com" : "+8613800001111"}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm">原因</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="col-span-2 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="手动添加">手动添加</SelectItem>
                <SelectItem value="退订请求">退订请求</SelectItem>
                <SelectItem value="投诉">投诉</SelectItem>
                <SelectItem value="硬退信">硬退信</SelectItem>
                <SelectItem value="STOP 关键字">STOP 关键字</SelectItem>
                <SelectItem value="法务/合规">法务/合规</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2 items-start">
            <label className="text-sm pt-2">备注</label>
            <Textarea
              className="col-span-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>确认添加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  defaultKind,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultKind: SuppressionKind;
}) {
  const [kind, setKind] = useState<SuppressionKind>(defaultKind);
  const [text, setText] = useState("");

  function submit() {
    const lines = text
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error("请粘贴要导入的地址");
      return;
    }
    lines.forEach((v) => addSuppression(kind, v, "批量导入", "CSV"));
    toast.success(`已导入 ${lines.length} 条`);
    setText("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批量导入退订名单</DialogTitle>
          <DialogDescription>
            每行一个地址，或用逗号/分号分隔。系统会自动去重。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm">类型</label>
            <Select value={kind} onValueChange={(v) => setKind(v as SuppressionKind)}>
              <SelectTrigger className="col-span-2 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">邮箱</SelectItem>
                <SelectItem value="phone">手机号</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              kind === "email"
                ? "user1@example.com\nuser2@example.com"
                : "+8613800001111\n+8613900002222"
            }
            rows={8}
            className="font-mono text-xs"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>确认导入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}