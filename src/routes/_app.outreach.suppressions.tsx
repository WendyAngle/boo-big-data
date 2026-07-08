import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, Mail, Phone, Plus, Search, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
          <div className="ml-auto relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索地址 / 原因 / 来源"
              className="pl-8 h-8"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                  暂无退订记录
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
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
                      onClick={() => {
                        removeSuppression(r.id);
                        toast.success("已移除，后续可再次触达");
                      }}
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