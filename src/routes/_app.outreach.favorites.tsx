import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Star,
  ChevronRight,
  Calendar as CalendarIcon,
  Building2,
  Package,
  FileText,
  UserRound,
  Search,
  X,
  ArrowUpDown,
  Trash2,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  ArrowRight,
  Anchor,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useFavorites,
  removeFavoritesByIds,
  seedDemoFavoritesIfEmpty,
  type FavoriteKind,
  type FavoriteRecord,
} from "@/lib/favorites";
import { MaskedField } from "@/components/MaskedField";
import { ReachButton } from "@/components/ReachButton";

export const Route = createFileRoute("/_app/outreach/favorites")({
  head: () => ({ meta: [{ title: "触达客户管理 · 收藏 | Boo数据平台" }] }),
  component: FavoritesPage,
});

type KindFilter = "all" | FavoriteKind;

const KIND_META: Record<
  FavoriteKind,
  { label: string; icon: typeof Building2; tone: string; toneBg: string }
> = {
  enterprise: {
    label: "企业",
    icon: Building2,
    tone: "text-primary",
    toneBg: "bg-primary/10",
  },
  contact: {
    label: "人物",
    icon: UserRound,
    tone: "text-violet-600",
    toneBg: "bg-violet-500/10",
  },
  bill: {
    label: "提单",
    icon: FileText,
    tone: "text-emerald-600",
    toneBg: "bg-emerald-500/10",
  },
  product: {
    label: "商品",
    icon: Package,
    tone: "text-amber-600",
    toneBg: "bg-amber-500/10",
  },
};

function fmtDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function FavoritesPage() {
  const all = useFavorites();
  useEffect(() => {
    seedDemoFavoritesIfEmpty();
  }, []);
  const [kind, setKind] = useState<KindFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [calOpen, setCalOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: 0,
      enterprise: 0,
      contact: 0,
      bill: 0,
      product: 0,
    };
    for (const r of all) {
      c.all++;
      c[r.kind]++;
    }
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const dKey = date ? fmtDateKey(date) : null;
    const list = all.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (dKey && !r.createdAt.startsWith(dKey)) return false;
      if (k) {
        const hay = [
          r.title,
          r.subtitle || "",
          r.parentRef?.name || "",
          ...Object.values(r.meta || {}),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    });
    list.sort((a, b) =>
      sort === "newest"
        ? a.createdAt < b.createdAt
          ? 1
          : -1
        : a.createdAt < b.createdAt
          ? -1
          : 1,
    );
    return list;
  }, [all, kind, keyword, date, sort]);

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const removeSelected = () => {
    removeFavoritesByIds(Array.from(selected));
    setSelected(new Set());
  };

  const kindOptions: { key: KindFilter; label: string; icon: typeof Building2 }[] = [
    { key: "all", label: "全部", icon: Star },
    { key: "enterprise", label: "企业", icon: Building2 },
    { key: "contact", label: "人物", icon: UserRound },
    { key: "bill", label: "提单", icon: FileText },
    { key: "product", label: "商品", icon: Package },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>触达客户管理</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">收藏</span>
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Star className="h-6 w-6 fill-amber-300 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold">收藏中心</h1>
            <p className="text-white/85 text-sm mt-0.5">
              集中查看您收藏的企业、关联人物、提单与商品，便于回查与持续跟进
            </p>
          </div>
          <div className="ml-auto hidden md:flex items-center gap-6 text-sm">
            {(["enterprise", "contact", "bill", "product"] as FavoriteKind[]).map(
              (k) => (
                <div key={k} className="text-center">
                  <div className="text-2xl font-bold tabular-nums">
                    {counts[k] ?? 0}
                  </div>
                  <div className="text-white/70 text-xs">{KIND_META[k].label}</div>
                </div>
              ),
            )}
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="h-8 bg-white/15 text-white border-white/20 hover:bg-white/25"
          >
            <Link to="/outreach/favorites-empty">
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              查看空状态演示
            </Link>
          </Button>
        </div>
      </section>

      {/* 筛选 */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground mr-1">类型</span>
          {kindOptions.map((opt) => {
            const active = kind === opt.key;
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => setKind(opt.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-1 h-5 px-1.5 text-[11px]",
                    active && "bg-primary-foreground/20 text-primary-foreground",
                  )}
                >
                  {counts[opt.key] ?? 0}
                </Badge>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索标题、副标题、所属企业或元数据"
              className="pl-9 h-9"
            />
          </div>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 justify-start text-left font-normal min-w-[180px]",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {date ? fmtDateKey(date) : "收藏时间"}
                {date && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDate(undefined);
                    }}
                    className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setCalOpen(false);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-9 w-[160px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">最近收藏</SelectItem>
              <SelectItem value="oldest">最早收藏</SelectItem>
            </SelectContent>
          </Select>
          {(date || keyword || kind !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDate(undefined);
                setKeyword("");
                setKind("all");
              }}
            >
              <X className="h-4 w-4 mr-1" />
              清除
            </Button>
          )}
        </div>
      </Card>

      {/* 批量操作栏 */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label="全选"
          />
          <span className="text-muted-foreground">
            已选 <span className="text-foreground font-medium">{selected.size}</span> /{" "}
            {filtered.length} 条
          </span>
          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={removeSelected}
            >
              <Trash2 className="h-4 w-4" />
              取消收藏所选
            </Button>
          )}
        </div>
      )}

      {/* 列表 */}
      {filtered.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center gap-3 border-dashed">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Star className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-base font-medium">
            {all.length === 0 ? "还没有收藏的内容" : "当前筛选条件下没有匹配结果"}
          </div>
          <div className="text-sm text-muted-foreground max-w-md">
            前往
            <Link to="/outreach/enterprise" className="text-primary mx-1 hover:underline">
              企业
            </Link>
            、
            <Link to="/outreach/products" className="text-primary mx-1 hover:underline">
              商品
            </Link>
            或
            <Link to="/outreach/bills" className="text-primary mx-1 hover:underline">
              提单
            </Link>
            页面，点击星标即可收藏感兴趣的数据
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <FavoriteCard
              key={r.id}
              record={r}
              selected={selected.has(r.id)}
              onToggleSelect={() => toggleOne(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({
  record,
  selected,
  onToggleSelect,
}: {
  record: FavoriteRecord;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const meta = KIND_META[record.kind];
  const Icon = meta.icon;

  const target = useTarget(record);

  const inner = (
    <Card
      className={cn(
        "p-4 h-full transition-all relative",
        "hover:shadow-md hover:border-primary/40",
        selected && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label="选择"
          />
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", meta.toneBg, meta.tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 h-4 border-current/40", meta.tone)}
            >
              {meta.label}
            </Badge>
            <span className="ml-auto text-[11px] text-muted-foreground font-mono">
              {record.createdAt.slice(0, 10)}
            </span>
          </div>
          <div className="font-medium text-sm truncate">{record.title}</div>
          {record.subtitle && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {record.subtitle}
            </div>
          )}
          <FavoriteMeta record={record} />
        </div>
      </div>
    </Card>
  );

  if (!target) return inner;

  if (target.kind === "enterprise") {
    return (
      <Link
        to="/outreach/enterprise/$id"
        params={{ id: target.id }}
        hash={target.hash}
        className="group block"
      >
        {inner}
      </Link>
    );
  }
  if (target.kind === "contact") {
    return (
      <Link
        to="/outreach/enterprise/$id/contact/$idx"
        params={{ id: target.id, idx: target.idx }}
        className="group block"
      >
        {inner}
      </Link>
    );
  }
  if (target.kind === "product") {
    return (
      <Link to="/outreach/products/$hs" params={{ hs: target.id }} className="group block">
        {inner}
      </Link>
    );
  }
  return (
    <Link to="/outreach/bills" className="group block">
      {inner}
    </Link>
  );
}

function FavoriteMeta({ record }: { record: FavoriteRecord }) {
  if (record.kind === "enterprise") {
    const m = record.meta || {};
    return (
      <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
        {m.country && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {m.country}
          </span>
        )}
        {m.role && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {m.role}
          </Badge>
        )}
        {m.est && <span className="font-mono">est. {m.est}</span>}
      </div>
    );
  }
  if (record.kind === "contact") {
    const m = record.meta || {};
    const entId = record.parentRef?.id ?? record.refId.split(":")[0];
    const idx = record.refId.split(":")[1] ?? "0";
    const targetId = `${entId}:${idx}`;
    const parentRef = record.parentRef
      ? { id: record.parentRef.id, name: record.parentRef.name }
      : undefined;
    return (
      <div className="text-xs text-muted-foreground mt-1.5 space-y-1">
        {m.email && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Mail className="h-3 w-3 shrink-0" />
            <MaskedField
              targetKind="contact"
              targetId={targetId}
              targetName={record.title}
              parentRef={parentRef}
              field="email"
              value={m.email}
              mono
            />
            <ReachButton
              targetKind="contact"
              targetId={targetId}
              targetName={record.title}
              parentRef={parentRef}
              channel="email"
              detail={m.email}
            />
          </div>
        )}
        {m.phone && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Phone className="h-3 w-3 shrink-0" />
            <MaskedField
              targetKind="contact"
              targetId={targetId}
              targetName={record.title}
              parentRef={parentRef}
              field="phone"
              value={m.phone}
              mono
            />
            <ReachButton
              targetKind="contact"
              targetId={targetId}
              targetName={record.title}
              parentRef={parentRef}
              channel="phone"
              detail={m.phone}
            />
          </div>
        )}
        {record.parentRef && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3 w-3" />
            <span className="truncate text-primary/90">
              {record.parentRef.name}
            </span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </div>
        )}
      </div>
    );
  }
  if (record.kind === "product") {
    const m = record.meta || {};
    return (
      <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
        {m.hs && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
            HS {m.hs}
          </Badge>
        )}
        {m.category && <span className="truncate">{m.category}</span>}
      </div>
    );
  }
  // bill
  const m = record.meta || {};
  return (
    <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
      {(m.exporter || m.importer) && (
        <div className="flex items-center gap-1 truncate">
          <span className="text-foreground/80 truncate">{m.exporter || "—"}</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground/80 truncate">{m.importer}</span>
        </div>
      )}
      {(m.fromPort || m.toPort) && (
        <div className="flex items-center gap-1 font-mono truncate">
          <Anchor className="h-3 w-3" />
          {m.fromPort}
          <ArrowRight className="h-3 w-3" />
          {m.toPort}
        </div>
      )}
      {m.hs && (
        <div className="font-mono">
          HS {m.hs} · {m.date}
        </div>
      )}
    </div>
  );
}

function useTarget(
  r: FavoriteRecord,
):
  | { kind: "enterprise"; id: string; hash?: string }
  | { kind: "contact"; id: string; idx: string }
  | { kind: "product"; id: string }
  | { kind: "bill" }
  | null {
  if (r.kind === "enterprise") return { kind: "enterprise", id: r.refId };
  if (r.kind === "contact") {
    // refId 形如 "<entId>:<idx>"；优先用 parentRef.id 作为企业 id
    const parts = r.refId.split(":");
    const entId = r.parentRef?.id ?? parts[0];
    const contactIdx = parts[1] ?? "0";
    if (!entId) return null;
    return { kind: "contact", id: entId, idx: contactIdx };
  }
  if (r.kind === "product") return { kind: "product", id: r.refId };
  if (r.kind === "bill") return { kind: "bill" };
  return null;
}
