import { useMemo, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  KeyRound,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Ban,
  Building2,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { ReachButton } from "@/components/ReachButton";
import {
  useUnlockedContacts,
  groupByEnterprise,
  groupByDay,
  CONTACT_TYPE_LABEL,
  type ContactType,
  type UnlockedContact,
} from "@/lib/unlocked-contacts";
import { isSuppressed } from "@/lib/suppressions-store";

export const Route = createFileRoute("/_app/outreach/unlocked")({
  head: () => ({
    meta: [
      { title: "解锁记录 | Boo数据平台" },
      {
        name: "description",
        content:
          "汇总所有已解锁的企业与联系人联系方式，支持按企业/时间分组、按渠道筛选，避免重复解锁。",
      },
    ],
  }),
  component: UnlockedPage,
});

type TypeFilter = "all" | ContactType;
type OwnerFilter = "all" | "enterprise" | "person";
type TimeFilter = "all" | "7d" | "30d";
type GroupMode = "enterprise" | "day" | "flat";

const REVEAL_LIMIT = 10;

function maskContact(t: ContactType, v: string): string {
  if (t === "email") {
    const [name, domain] = v.split("@");
    if (!domain) return v;
    const head = name.slice(0, 1);
    return `${head}${"*".repeat(Math.max(3, name.length - 1))}@${domain}`;
  }
  if (t === "phone") {
    const digits = v.replace(/\D/g, "");
    if (digits.length <= 4) return v;
    const head = v.slice(0, Math.min(3, v.length - 4));
    const tail = v.slice(-4);
    return `${head}${"*".repeat(Math.max(4, v.length - head.length - tail.length))}${tail}`;
  }
  if (v.length <= 3) return v;
  return `${v.slice(0, 2)}${"*".repeat(Math.max(3, v.length - 3))}${v.slice(-1)}`;
}

function typeIcon(t: ContactType) {
  if (t === "email") return <Mail className="h-3.5 w-3.5" />;
  if (t === "phone") return <Phone className="h-3.5 w-3.5" />;
  return <MessageSquare className="h-3.5 w-3.5" />;
}

function typeTone(t: ContactType) {
  if (t === "email") return "bg-sky-50 text-sky-700 border-sky-200";
  if (t === "phone") return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function ContactRow({
  c,
  revealed,
  onToggle,
}: {
  c: UnlockedContact;
  revealed: boolean;
  onToggle: () => void;
}) {
  const suppressed =
    (c.contact_type === "email" && isSuppressed("email", c.contact_value)) ||
    (c.contact_type === "phone" && isSuppressed("phone", c.contact_value));
  const parentLink =
    c.owner_type === "person" && c.parent_ref
      ? `/outreach/enterprise/${c.parent_ref.id}`
      : c.owner_type === "enterprise"
        ? `/outreach/enterprise/${c.owner_id}`
        : undefined;

  const channel =
    c.contact_type === "email"
      ? "email"
      : c.contact_type === "phone"
        ? "phone"
        : "social";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/40 transition-colors">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
          typeTone(c.contact_type),
        )}
      >
        {typeIcon(c.contact_type)}
        {CONTACT_TYPE_LABEL[c.contact_type]}
        {c.platform ? ` · ${c.platform}` : ""}
      </span>
      <span className="font-mono text-xs text-foreground tracking-wide truncate min-w-0 flex-1">
        {revealed ? c.contact_value : maskContact(c.contact_type, c.contact_value)}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label={revealed ? "隐藏明文" : "查看明文"}
        title={revealed ? "隐藏明文" : "查看明文"}
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
        {c.owner_type === "enterprise" ? (
          <Building2 className="h-3 w-3" />
        ) : (
          <User className="h-3 w-3" />
        )}
        {parentLink ? (
          <Link
            to={parentLink}
            className="hover:text-primary hover:underline underline-offset-2"
          >
            {c.owner_name}
          </Link>
        ) : (
          <span>{c.owner_name}</span>
        )}
        {c.owner_type === "person" && c.parent_ref && (
          <span className="text-muted-foreground/70">· {c.parent_ref.name}</span>
        )}
      </span>
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-32 text-right">
        {formatDateTime(new Date(c.unlock_time).toISOString())}
      </span>
      <span className="text-[11px] text-rose-600 font-medium tabular-nums shrink-0 w-14 text-right">
        -{c.unlock_cost}
      </span>
      <div className="shrink-0">
        {suppressed ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700">
            <Ban className="h-3 w-3" />
            已退订
          </span>
        ) : (
          <ReachButton
            targetKind={c.owner_type === "enterprise" ? "enterprise" : "contact"}
            targetId={c.owner_id}
            targetName={c.owner_name}
            parentRef={c.parent_ref}
            channel={channel}
            platform={c.platform}
            detail={c.contact_value}
          />
        )}
      </div>
    </div>
  );
}

function UnlockedPage() {
  const all = useUnlockedContacts();
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [owner, setOwner] = useState<OwnerFilter>("all");
  const [time, setTime] = useState<TimeFilter>("all");
  const [group, setGroup] = useState<GroupMode>("enterprise");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [bulkAcked, setBulkAcked] = useState(false);

  const toggleReveal = useCallback(
    (key: string) => {
      setRevealed((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
          return next;
        }
        if (!bulkAcked && next.size >= REVEAL_LIMIT) {
          setPendingKey(key);
          setConfirmOpen(true);
          return prev;
        }
        next.add(key);
        return next;
      });
    },
    [bulkAcked],
  );

  const confirmReveal = () => {
    setBulkAcked(true);
    setConfirmOpen(false);
    if (pendingKey) {
      setRevealed((prev) => {
        const next = new Set(prev);
        next.add(pendingKey);
        return next;
      });
      setPendingKey(null);
    }
    toast.info("已开启本次会话的批量明示，请注意防止截屏泄露");
  };

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const now = Date.now();
    const windowMs =
      time === "7d" ? 7 * 864e5 : time === "30d" ? 30 * 864e5 : Infinity;
    return all.filter((c) => {
      if (type !== "all" && c.contact_type !== type) return false;
      if (owner !== "all" && c.owner_type !== owner) return false;
      if (now - c.unlock_time > windowMs) return false;
      if (kw) {
        const hay = `${c.owner_name} ${c.contact_value} ${c.parent_ref?.name ?? ""} ${c.platform ?? ""}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [all, q, type, owner, time]);

  const stats = useMemo(() => {
    const cost = filtered.reduce((s, c) => s + c.unlock_cost, 0);
    const enterprises = new Set(
      filtered.map((c) =>
        c.owner_type === "enterprise" ? c.owner_id : c.parent_ref?.id ?? c.owner_id,
      ),
    ).size;
    return { count: filtered.length, cost, enterprises };
  }, [filtered]);

  const groups = useMemo(() => {
    if (group === "enterprise") return groupByEnterprise(filtered);
    if (group === "day") return groupByDay(filtered);
    return [{ key: "all", name: "全部", items: filtered, totalCost: stats.cost }];
  }, [filtered, group, stats.cost]);

  return (
    <div className="p-6 space-y-4">
      <section className="relative overflow-hidden rounded-2xl ring-1 ring-border">
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 80% 30%, rgba(255,255,255,0.45) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.25) 0%, transparent 45%)",
          }}
        />
        <div className="relative px-8 py-10 flex items-center gap-5 text-white">
          <div className="h-14 w-14 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
            <KeyRound className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-wide">解锁记录</h1>
            <p className="text-white/90 text-sm mt-1">
              汇总您已解锁的企业与联系人联系方式，可按渠道 / 归属 / 时间筛选，永久解锁的字段可直接复用发起触达，不会再次扣费。
            </p>
          </div>
          <div className="hidden md:flex items-stretch gap-3">
            <div className="rounded-xl bg-white/15 backdrop-blur-sm px-4 py-3 ring-1 ring-white/25 min-w-[110px]">
              <div className="text-[11px] text-white/80">已解锁</div>
              <div className="text-xl font-bold tabular-nums">{stats.count}</div>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur-sm px-4 py-3 ring-1 ring-white/25 min-w-[110px]">
              <div className="text-[11px] text-white/80">覆盖企业</div>
              <div className="text-xl font-bold tabular-nums">{stats.enterprises}</div>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur-sm px-4 py-3 ring-1 ring-white/25 min-w-[110px]">
              <div className="text-[11px] text-white/80">累计消耗</div>
              <div className="text-xl font-bold tabular-nums">
                {stats.cost}
                <span className="text-xs font-normal opacity-80"> 积分</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索企业 / 联系人 / 邮箱 / 电话 / 社媒"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Tabs value={type} onValueChange={(v) => setType(v as TypeFilter)}>
            <TabsList className="h-9">
              <TabsTrigger value="all">全部渠道</TabsTrigger>
              <TabsTrigger value="email">邮箱</TabsTrigger>
              <TabsTrigger value="phone">电话</TabsTrigger>
              <TabsTrigger value="social_media">社媒</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={owner} onValueChange={(v) => setOwner(v as OwnerFilter)}>
            <TabsList className="h-9">
              <TabsTrigger value="all">全部归属</TabsTrigger>
              <TabsTrigger value="enterprise">企业</TabsTrigger>
              <TabsTrigger value="person">联系人</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={time} onValueChange={(v) => setTime(v as TimeFilter)}>
            <TabsList className="h-9">
              <TabsTrigger value="all">全部时间</TabsTrigger>
              <TabsTrigger value="7d">近 7 天</TabsTrigger>
              <TabsTrigger value="30d">近 30 天</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <span>分组：</span>
            {(
              [
                ["enterprise", "按企业"],
                ["day", "按时间"],
                ["flat", "平铺"],
              ] as [GroupMode, string][]
            ).map(([k, label]) => (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={group === k ? "default" : "outline"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setGroup(k)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          共 <span className="font-medium text-foreground">{stats.count}</span> 条 · 覆盖{" "}
          <span className="font-medium text-foreground">{stats.enterprises}</span> 家企业 · 累计消耗{" "}
          <span className="font-medium text-rose-600">{stats.cost}</span> 积分
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-16 text-center text-sm text-muted-foreground">
          <KeyRound className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <div>还没有匹配的解锁记录。</div>
          <div className="mt-1 text-xs">
            前往「客户发现」查看企业联系方式后，将自动出现在此处。
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Card key={g.key} className="overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/30">
                <div className="font-medium text-sm text-foreground flex items-center gap-2">
                  {group === "enterprise" && <Building2 className="h-4 w-4 text-primary" />}
                  {g.name}
                </div>
                <Badge variant="secondary" className="text-[11px]">
                  {g.items.length} 条
                </Badge>
                <div className="ml-auto text-[11px] text-rose-600 tabular-nums font-medium">
                  -{g.totalCost} 积分
                </div>
              </div>
              <div className="divide-y">
                {g.items.map((c) => (
                  <ContactRow
                    key={`${c.owner_id}:${c.contact_type}:${c.contact_value}`}
                    c={c}
                    revealed={revealed.has(`${c.owner_id}:${c.contact_type}:${c.contact_value}`)}
                    onToggle={() =>
                      toggleReveal(`${c.owner_id}:${c.contact_type}:${c.contact_value}`)
                    }
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>连续揭示超过 {REVEAL_LIMIT} 条</AlertDialogTitle>
            <AlertDialogDescription>
              为防止截屏泄露联系方式，请确认继续以明文展示。确认后本次会话内将不再提示。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingKey(null)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmReveal}>
              我已知晓，继续
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}