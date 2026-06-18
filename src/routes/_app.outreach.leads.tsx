import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Lightbulb,
  Search,
  Loader2,
  RefreshCw,
  Briefcase,
  MapPin,
  Building2,
  Mail,
  Phone,
  Share2,
  Hash,
  Package,
  Target,
  Save,
  X as XIcon,
  Plus,
  ChevronRight,
  Wand2,
  TrendingUp,
  Upload,
  ImageIcon,
  ThumbsDown,
  RotateCcw,
  Eye,
  EyeOff,
  Info,
  Undo2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FavoriteToggle } from "@/components/FavoriteToggle";
import { MaskedField } from "@/components/MaskedField";
import { ReachButton } from "@/components/ReachButton";
import { toast } from "sonner";
import {
  useLeadProfile,
  saveProfile,
  profileCompleteness,
  type LeadProfile,
} from "@/lib/lead-profile";
import {
  generateAiLeads,
  getAiQuotaLeft,
  consumeAiQuota,
  getSearchHistory,
  pushSearchHistory,
  AI_DAILY_FREE,
  type LeadItem,
  type LeadTier,
  getLeadFeedback,
  markLeadsSeen,
  markLeadLiked,
  markLeadIgnored,
  unmarkLeadIgnored,
  resetLeadFeedback,
  type LeadFeedback,
} from "@/lib/leads";
import { searchLeads } from "@/lib/leads";
import { ENTERPRISES } from "@/data/enterprises";

const ENTERPRISES_LOOKUP = new Map(ENTERPRISES.map((e) => [e.id, e]));

export const Route = createFileRoute("/_app/outreach/leads")({
  head: () => ({
    meta: [
      { title: "线索 | Boo数据平台" },
      {
        name: "description",
        content:
          "AI 智能推荐与主动搜索两种方式获取潜在客户线索，统一管理触达与转化。",
      },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const [tab, setTab] = useState<"ai" | "search" | "profile">("ai");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>触达客户管理</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">线索</span>
      </div>

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
            <Lightbulb className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-wide">线索</h1>
            <p className="text-white/90 text-sm mt-1">
              AI 智能推荐 + 主动搜索双轨获客，结果免费查看，查看联系方式 / 触达按规则扣减积分
            </p>
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-11 bg-muted/60 p-1">
          <TabsTrigger value="ai" className="gap-1.5 px-4">
            <Sparkles className="h-4 w-4" /> AI 智能推荐
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5 px-4">
            <Search className="h-4 w-4" /> 主动搜索
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5 px-4">
            <Target className="h-4 w-4" /> 我的企业画像
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-5">
          <AiTab onGoProfile={() => setTab("profile")} />
        </TabsContent>
        <TabsContent value="search" className="mt-5">
          <SearchTab />
        </TabsContent>
        <TabsContent value="profile" className="mt-5">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================ AI 推荐 ============================ */

type AiView = "new" | "seen" | "ignored";

function useLeadFeedbackState(): LeadFeedback {
  const [fb, setFb] = useState<LeadFeedback>(() => getLeadFeedback());
  useEffect(() => {
    const onChange = () => setFb(getLeadFeedback());
    window.addEventListener("lead-feedback-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("lead-feedback-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return fb;
}

function AiTab({ onGoProfile }: { onGoProfile: () => void }) {
  const profile = useLeadProfile();
  const completeness = profileCompleteness(profile);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [quotaLeft, setQuotaLeft] = useState(() => getAiQuotaLeft());
  const [seed, setSeed] = useState(1);
  const [view, setView] = useState<AiView>("new");
  const [filteredOut, setFilteredOut] = useState(0);
  const fb = useLeadFeedbackState();

  const handleGenerate = () => {
    if (quotaLeft <= 0) {
      toast.error("今日免费推荐次数已用完", {
        description: "明日 00:00 自动重置，或联系商务购买扩容包",
      });
      return;
    }
    setLoading(true);
    setView("new");
    // 把当前展示中的企业先记入"已浏览"，下一轮自动去重
    const prevIds = leads.map((l) => l.enterprise.id);
    if (prevIds.length > 0) markLeadsSeen(prevIds);

    setTimeout(() => {
      const next = generateAiLeads(profile, seed, 9);
      const seenBefore = new Set(getLeadFeedback().seen);
      const skipped = next.filter((l) => seenBefore.has(l.enterprise.id)).length;
      setFilteredOut(prevIds.length === 0 ? 0 : Math.max(0, prevIds.length - skipped));
      // 简化：用上一轮 id 数近似展示"已过滤"数量
      setFilteredOut(prevIds.length);
      setLeads(next);
      setSeed((s) => s + 1);
      const left = consumeAiQuota();
      setQuotaLeft(left);
      setLoading(false);
      const desc = prevIds.length > 0
        ? `已为您过滤 ${prevIds.length} 家已浏览企业，本批含拓展 / 探索分层`
        : "结果免费查看，查看联系方式 / 触达按规则扣减积分";
      toast.success(`已为您匹配 ${next.length} 条潜在线索`, { description: desc });
    }, 1100);
  };

  const handleIgnore = (l: LeadItem) => {
    markLeadIgnored(l.enterprise.id);
    setLeads((cur) => cur.filter((x) => x.enterprise.id !== l.enterprise.id));
    toast("已标记为不感兴趣", {
      description: `${l.enterprise.name} 将不再出现在推荐流中`,
      action: {
        label: "撤销",
        onClick: () => {
          unmarkLeadIgnored(l.enterprise.id);
          setLeads((cur) =>
            cur.some((x) => x.enterprise.id === l.enterprise.id)
              ? cur
              : [l, ...cur],
          );
        },
      },
    });
  };

  const handleLike = (l: LeadItem) => {
    markLeadLiked(l.enterprise.id);
  };

  const handleRestore = (id: string) => {
    unmarkLeadIgnored(id);
    toast.success("已恢复推荐", { description: "该企业将参与下一轮匹配" });
  };

  const handleReset = () => {
    resetLeadFeedback();
    setLeads([]);
    setSeed(1);
    setFilteredOut(0);
    setView("new");
    toast.success("推荐偏好已重置", {
      description: "已清空浏览 / 收藏 / 忽略记录，可重新演示推荐效果",
    });
  };

  // 已查看 / 已忽略 视图所用的企业列表（从 mock 库中查找）
  const seenLeads = useMemo<LeadItem[]>(() => {
    return fb.seen
      .map((id) => {
        const ent = ENTERPRISES_LOOKUP.get(id);
        if (!ent) return null;
        return {
          enterprise: ent,
          source: "ai" as const,
          matchScore: 70,
          matchReasons: ["历史推荐"],
          generatedAt: new Date().toISOString(),
        } as LeadItem;
      })
      .filter(Boolean) as LeadItem[];
  }, [fb.seen]);

  const ignoredLeads = useMemo<LeadItem[]>(() => {
    return fb.ignored
      .map((id) => {
        const ent = ENTERPRISES_LOOKUP.get(id);
        if (!ent) return null;
        return {
          enterprise: ent,
          source: "ai" as const,
          matchScore: 65,
          matchReasons: ["已忽略"],
          generatedAt: new Date().toISOString(),
        } as LeadItem;
      })
      .filter(Boolean) as LeadItem[];
  }, [fb.ignored]);

  const visibleLeads =
    view === "new" ? leads : view === "seen" ? seenLeads : ignoredLeads;

  return (
    <div className="space-y-5">
      {/* 画像摘要 + 操作 */}
      <Card className="p-5 flex flex-col md:flex-row gap-5 items-stretch md:items-center">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20 shrink-0">
            <Target className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-semibold">当前企业画像</div>
              <Badge
                variant="secondary"
                className="text-[10px] bg-primary/10 text-primary"
              >
                完整度 {completeness}%
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              <span>
                行业：
                <span className="text-foreground">
                  {profile.industries.join("、") || "未填写"}
                </span>
              </span>
              <span>
                主营：
                <span className="text-foreground">
                  {profile.mainProducts.join("、") || "未填写"}
                </span>
              </span>
              <span>
                目标市场：
                <span className="text-foreground">
                  {profile.targetCountries.join("、") || "未填写"}
                </span>
              </span>
            </div>
            <Progress value={completeness} className="mt-2 h-1.5" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={onGoProfile} className="gap-1.5">
            <Wand2 className="h-4 w-4" />
            完善画像
          </Button>
        </div>
      </Card>

      {/* 演示提示 + 偏好控制 */}
      <Card className="px-4 py-3 flex flex-wrap items-center gap-3 bg-amber-50/60 border-amber-200/70 text-amber-900">
        <Info className="h-4 w-4 shrink-0 text-amber-600" />
        <div className="text-xs leading-relaxed flex-1 min-w-[260px]">
          <span className="font-semibold">演示提示：</span>
          连续点击 <span className="font-mono">「重新生成推荐」</span> 体验"去重 + 分层"——
          已浏览企业不再重复，结果含
          <span className="mx-1 inline-flex items-center gap-1"><TierDot tier="precise" />精准</span>+
          <span className="mx-1 inline-flex items-center gap-1"><TierDot tier="expand" />拓展</span>+
          <span className="mx-1 inline-flex items-center gap-1"><TierDot tier="explore" />探索</span>
          三层。收藏 / 触达 → 偏好加权；点 <ThumbsDown className="h-3 w-3 inline" /> → 永不再推。
        </div>
        <div className="flex items-center gap-3 text-[11px] text-amber-800/80">
          <span>已浏览 <b className="tabular-nums">{fb.seen.length}</b></span>
          <span>已收藏 <b className="tabular-nums">{fb.liked.length}</b></span>
          <span>已忽略 <b className="tabular-nums">{fb.ignored.length}</b></span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-7 gap-1 border-amber-300 text-amber-900 hover:bg-amber-100"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 重置推荐偏好
        </Button>
      </Card>

      {/* 生成按钮 */}
      <Card className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, hsl(var(--primary)) 0%, transparent 45%), radial-gradient(circle at 70% 70%, hsl(var(--accent)) 0%, transparent 45%)",
          }}
        />
        <div className="relative p-6 flex flex-col md:flex-row items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shrink-0">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="font-semibold text-lg">基于您的企业画像，匹配全球潜在客户</div>
            <div className="text-sm text-muted-foreground mt-1">
              结合主营产品、目标市场、HS 编码及竞品客户网络综合排序 ·
              <span className="text-primary font-medium">
                {" "}今日剩余免费推荐 {quotaLeft}/{AI_DAILY_FREE} 次
              </span>
            </div>
          </div>
          <Button
            size="lg"
            disabled={loading}
            onClick={handleGenerate}
            className="gap-2 h-11 px-6 shrink-0 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI 正在匹配…
              </>
            ) : leads.length > 0 ? (
              <>
                <RefreshCw className="h-4 w-4" />
                重新生成推荐
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                生成 AI 推荐线索
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* 视图切换 */}
      {(leads.length > 0 || fb.seen.length > 0 || fb.ignored.length > 0) && !loading && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Tabs value={view} onValueChange={(v) => setView(v as AiView)}>
            <TabsList className="h-9 bg-muted/60 p-1">
              <TabsTrigger value="new" className="gap-1.5 px-3 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> 本轮推荐
                {leads.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                    {leads.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="seen" className="gap-1.5 px-3 text-xs">
                <Eye className="h-3.5 w-3.5" /> 历史已查看
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                  {fb.seen.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="ignored" className="gap-1.5 px-3 text-xs">
                <EyeOff className="h-3.5 w-3.5" /> 已忽略
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                  {fb.ignored.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {view === "new" && filteredOut > 0 && (
            <div className="text-xs text-muted-foreground">
              已为您过滤 <b className="text-foreground">{filteredOut}</b> 家已浏览企业
            </div>
          )}
        </div>
      )}

      {visibleLeads.length === 0 && !loading && view === "new" && (
        <Card className="p-12 text-center border-dashed">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="font-medium">点击上方按钮开始 AI 推荐</div>
          <div className="text-sm text-muted-foreground mt-1">
            画像越完整，匹配越精准
          </div>
        </Card>
      )}

      {visibleLeads.length === 0 && !loading && view !== "new" && (
        <Card className="p-10 text-center border-dashed">
          <div className="text-sm text-muted-foreground">
            {view === "seen" ? "尚无历史浏览记录" : "尚无被忽略的企业"}
          </div>
        </Card>
      )}

      {visibleLeads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleLeads.map((l) => (
            <LeadCard
              key={l.enterprise.id}
              lead={l}
              onIgnore={view === "new" ? () => handleIgnore(l) : undefined}
              onLike={view === "new" ? () => handleLike(l) : undefined}
              onRestore={
                view === "ignored" ? () => handleRestore(l.enterprise.id) : undefined
              }
              isIgnoredView={view === "ignored"}
              isSeenView={view === "seen"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const TIER_META: Record<LeadTier, { label: string; cls: string; dot: string }> = {
  precise: {
    label: "精准匹配",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  expand: {
    label: "相邻拓展",
    cls: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  explore: {
    label: "探索惊喜",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
};

function TierDot({ tier }: { tier: LeadTier }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${TIER_META[tier].dot}`} />;
}

/* ============================ 线索卡片 ============================ */

function LeadCard({
  lead,
  onIgnore,
  onLike,
  onRestore,
  isIgnoredView,
  isSeenView,
}: {
  lead: LeadItem;
  onIgnore?: () => void;
  onLike?: () => void;
  onRestore?: () => void;
  isIgnoredView?: boolean;
  isSeenView?: boolean;
}) {
  const e = lead.enterprise;
  const firstContact = e.contacts[0];
  const tierMeta = lead.tier ? TIER_META[lead.tier] : null;
  return (
    <Card
      className={`p-5 ring-1 hover:shadow-md transition-all flex flex-col relative ${
        isIgnoredView
          ? "ring-border opacity-70"
          : "ring-border hover:ring-primary/40"
      }`}
    >
      {tierMeta && !isIgnoredView && !isSeenView && (
        <div
          className={`absolute top-0 left-5 -translate-y-1/2 inline-flex items-center gap-1 px-2 h-5 rounded-full text-[10px] font-medium border ${tierMeta.cls}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${tierMeta.dot}`} />
          {tierMeta.label}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary flex items-center justify-center ring-1 ring-primary/20 shrink-0">
            {lead.source === "ai" ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <Link
              to="/outreach/enterprise/$id"
              params={{ id: e.id }}
              className="font-semibold truncate block hover:text-primary"
            >
              {e.name}
            </Link>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {e.country || "未提供"}
              </span>
              <span>·</span>
              <span>{e.employees}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <span onClick={onLike} className="inline-flex">
            <FavoriteToggle
              kind="enterprise"
              refId={e.id}
              payload={{
                title: e.name,
                subtitle: e.industry || undefined,
                meta: { country: e.country || "", role: e.tradeRole, est: e.est },
              }}
              variant="inline"
              size="sm"
            />
          </span>
          {onIgnore && (
            <button
              onClick={onIgnore}
              title="不感兴趣，不再推荐"
              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          )}
          {onRestore && (
            <button
              onClick={onRestore}
              title="恢复推荐"
              className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-xs text-primary hover:bg-primary/10 transition-colors"
            >
              <Undo2 className="h-3.5 w-3.5" /> 恢复
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5 shrink-0" />
        <span className={`truncate ${!e.industry ? "italic" : ""}`}>
          {e.industry || "未提供行业"}
        </span>
      </div>

      {/* AI 匹配徽章 */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-semibold text-emerald-700 tabular-nums">
            {lead.matchScore}
          </span>
          <span className="text-muted-foreground">匹配度</span>
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-primary"
            style={{ width: `${lead.matchScore}%` }}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {lead.matchReasons.map((r) => (
          <Badge
            key={r}
            variant="secondary"
            className="text-[10px] bg-primary/8 text-primary border border-primary/15"
          >
            {r}
          </Badge>
        ))}
      </div>

      {/* 联系方式（密文 + 触达） */}
      <div className="mt-4 pt-3 border-t space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> 邮箱
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <MaskedField
              targetKind="enterprise"
              targetId={e.id}
              targetName={e.name}
              field="email"
              value={e.email}
              mono
            />
            <ReachButton
              targetKind="enterprise"
              targetId={e.id}
              targetName={e.name}
              channel="email"
              detail={e.email}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> 电话
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <MaskedField
              targetKind="enterprise"
              targetId={e.id}
              targetName={e.name}
              field="phone"
              value={e.phone}
              mono
            />
            <ReachButton
              targetKind="enterprise"
              targetId={e.id}
              targetName={e.name}
              channel="phone"
              detail={e.phone}
            />
          </div>
        </div>
        {firstContact && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground truncate">
              <Share2 className="h-3.5 w-3.5 shrink-0" />
              关键联系人：{firstContact.name}
            </span>
            <Link
              to="/outreach/enterprise/$id"
              params={{ id: e.id }}
              className="text-primary hover:underline shrink-0"
            >
              查看详情
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ============================ 主动搜索 ============================ */

const HOT = [
  "花岗岩",
  "大理石",
  "石膏板",
  "680100",
  "manufacturing",
  "germany",
];

function SearchTab() {
  const [kw, setKw] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeadItem[]>([]);
  const [activeKws, setActiveKws] = useState<string[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const history = useMemo(() => getSearchHistory(), [historyTick, results]);

  const parseKeywords = (raw: string): string[] => {
    // 支持 逗号/分号/顿号（中英文）/ 换行 / 中英文空格
    const parts = raw
      .split(/[,，;；、\s\u3000\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    // 去重，保持顺序
    return Array.from(new Set(parts));
  };

  const submit = (override?: { kw?: string }) => {
    const raw = override?.kw ?? kw;
    const words = parseKeywords(raw);
    if (words.length === 0) {
      toast.error("请输入搜索关键词");
      return;
    }
    words.forEach((w) => pushSearchHistory(w));
    setHistoryTick((n) => n + 1);
    setActiveKws(words);
    if (override?.kw !== undefined) setKw(raw);
    setLoading(true);
    setTimeout(() => {
      // 多关键词合并：以企业 id 聚合，取最高匹配度，合并理由（去重）
      const merged = new Map<string, LeadItem>();
      for (const w of words) {
        const part = searchLeads(w, "all", 24);
        for (const item of part) {
          const prev = merged.get(item.enterprise.id);
          if (!prev) {
            merged.set(item.enterprise.id, { ...item });
          } else {
            prev.matchScore = Math.max(prev.matchScore, item.matchScore);
            const reasons = Array.from(
              new Set([...prev.matchReasons, ...item.matchReasons]),
            ).slice(0, 4);
            prev.matchReasons = reasons;
          }
        }
      }
      const list = Array.from(merged.values())
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 12);
      setResults(list);
      setLoading(false);
    }, 500);
  };

  const clear = () => {
    setResults([]);
    setActiveKws([]);
    setLoading(false);
  };

  const hasResults = results.length > 0;
  const hasSearched = activeKws.length > 0 && !loading;
  const activeKwJoined = activeKws.join(" / ");

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Textarea
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="输入企业 / 商品 / HS 编码关键词，支持多关键词：逗号、分号、顿号、换行或空格分隔（如：花岗岩, 大理石；680100 钢材）"
              className="pl-9 pt-2 min-h-[64px] resize-y"
              rows={2}
            />
          </div>
          <Button onClick={() => submit()} className="h-10 px-5 gap-1.5 shrink-0">
            <Search className="h-4 w-4" /> 搜索线索
          </Button>
        </div>
        <div className="text-[11px] text-muted-foreground -mt-2">
          支持多关键词：<span className="font-mono">,</span> <span className="font-mono">，</span>{" "}
          <span className="font-mono">;</span> <span className="font-mono">；</span>{" "}
          <span className="font-mono">、</span> 换行 或 空格 分隔 · Enter 搜索，Shift+Enter 换行
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">热门搜索</div>
          <div className="flex flex-wrap gap-1.5">
            {HOT.map((h) => (
              <button
                key={h}
                onClick={() => {
                  setKw(h);
                  submit({ kw: h });
                }}
                className="px-2.5 h-6 rounded-full text-xs bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">最近搜索</div>
            <div className="flex flex-wrap gap-1.5">
              {history.map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    setKw(h);
                    submit({ kw: h });
                  }}
                  className="px-2.5 h-6 rounded-full text-xs bg-background border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 搜索结果区 */}
      {loading && (
        <Card className="p-12 text-center border-dashed">
          <Loader2 className="h-7 w-7 mx-auto text-primary animate-spin" />
          <div className="mt-3 font-medium">
            正在为「{activeKwJoined}」匹配线索…
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            扫描企业库、贸易记录与联系方式
          </div>
        </Card>
      )}

      {hasSearched && hasResults && (
        <>
          <Card className="px-5 py-3 flex flex-wrap items-center gap-3 bg-primary/[0.04] border-primary/15">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Search className="h-4 w-4 text-primary shrink-0" />
              <span className="shrink-0">
                找到{" "}
                <span className="font-semibold text-primary tabular-nums">
                  {results.length}
                </span>{" "}
                条线索 · 关键词
              </span>
              <div className="flex flex-wrap gap-1">
                {activeKws.map((w) => (
                  <span
                    key={w}
                    className="inline-flex items-center px-2 h-5 rounded-full text-[11px] bg-primary/10 text-primary font-medium"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={clear}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-3.5 w-3.5" /> 清除结果
              </button>
              <Link
                to="/outreach/enterprise"
                search={{ q: activeKws.join(" ") }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                在企业库中查看完整结果 <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((l) => (
              <LeadCard key={l.enterprise.id} lead={l} />
            ))}
          </div>
        </>
      )}

      {hasSearched && !hasResults && (
        <Card className="p-12 text-center border-dashed">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
            <Search className="h-7 w-7" />
          </div>
          <div className="font-medium">
            没有找到与「{activeKwJoined}」匹配的线索
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            建议放宽搜索类型 · 换个关键词 · 或前往
            <Link
              to="/outreach/enterprise"
              search={{ q: activeKws.join(" ") }}
              className="text-primary hover:underline mx-1"
            >
              企业库
            </Link>
            做更精细的多维筛选
          </div>
        </Card>
      )}

      {/* 快捷入口 —— 未搜索时展开网格；已有结果时折叠为一行 */}
      {!hasSearched && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <ShortcutCard
            icon={<Package className="h-5 w-5" />}
            title="按商品类目"
            desc="从商品库进入，反向找到出口/进口该类商品的企业"
            to="/outreach/products"
          />
          <ShortcutCard
            icon={<Hash className="h-5 w-5" />}
            title="按 HS 编码"
            desc="精确锁定海关编码，查全部相关贸易企业"
            to="/outreach/products"
          />
          <ShortcutCard
            icon={<Building2 className="h-5 w-5" />}
            title="企业库"
            desc="按行业、国家、规模等多维筛选企业"
            to="/outreach/enterprise"
          />
          <ShortcutCard
            icon={<Target className="h-5 w-5" />}
            title="按提单"
            desc="通过历史贸易记录挖掘潜在客户"
            to="/outreach/bills"
          />
        </div>
      )}

      {hasSearched && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>换个方式继续找：</span>
          <Link to="/outreach/products" className="hover:text-primary inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5" /> 商品类目
          </Link>
          <Link to="/outreach/enterprise" className="hover:text-primary inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> 企业库
          </Link>
          <Link to="/outreach/bills" className="hover:text-primary inline-flex items-center gap-1">
            <Target className="h-3.5 w-3.5" /> 提单挖掘
          </Link>
        </div>
      )}
    </div>
  );
}

function ShortcutCard({
  icon,
  title,
  desc,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group block p-4 rounded-xl ring-1 ring-border bg-card hover:ring-primary/40 hover:shadow-sm transition-all"
    >
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
    </Link>
  );
}

/* ============================ 企业画像 ============================ */

const INDUSTRY_OPTIONS = [
  "manufacturing",
  "retail",
  "logistics",
  "marketing and advertising",
  "information technology",
  "financial services",
  "healthcare",
  "higher education",
];
const COUNTRY_OPTIONS = [
  "united states",
  "china",
  "japan",
  "germany",
  "united kingdom",
  "mexico",
  "singapore",
  "france",
];
const SCALE_OPTIONS = ["1-50", "51-200", "201-1000", "1000+"];
const REVENUE_OPTIONS = ["<500 万", "500 万 - 5000 万", "5000 万 - 5 亿", ">5 亿"];

function ProfileTab() {
  const current = useLeadProfile();
  const [draft, setDraft] = useState<LeadProfile>(current);
  const completeness = profileCompleteness(draft);

  const set = <K extends keyof LeadProfile>(k: K, v: LeadProfile[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = () => {
    saveProfile(draft);
    toast.success("企业画像已保存", {
      description: `当前完整度 ${profileCompleteness(draft)}%，AI 推荐结果将更精准`,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
      <div className="space-y-5">
        <Section title="基础信息" icon={<Building2 className="h-4 w-4" />}>
          <Grid2>
            <Field label="企业名称">
              <Input value={draft.companyName} disabled />
            </Field>
            <Field label="统一社会信用代码">
              <Input value={draft.uscc} disabled />
            </Field>
          </Grid2>
        </Section>

        <Section title="主营业务" icon={<Briefcase className="h-4 w-4" />}>
          <Field label="所属行业（多选）">
            <MultiPick
              options={INDUSTRY_OPTIONS}
              value={draft.industries}
              onChange={(v) => set("industries", v)}
              allowCustom
              addPlaceholder="输入行业名后回车，可自定义添加"
            />
          </Field>
          <Field label="主营产品">
            <ChipInput
              placeholder="输入产品名后回车，可添加多个"
              value={draft.mainProducts}
              onChange={(v) => set("mainProducts", v)}
            />
          </Field>
          <Field label="主要 HS 编码">
            <ChipInput
              placeholder="输入 HS 编码后回车"
              value={draft.hsCodes}
              onChange={(v) => set("hsCodes", v)}
              mono
            />
          </Field>
          <Grid2>
            <Field label="企业规模">
              <Select value={draft.scale} onValueChange={(v) => set("scale", v)}>
                <SelectTrigger><SelectValue placeholder="选择规模" /></SelectTrigger>
                <SelectContent>
                  {SCALE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="年营业额">
              <Select value={draft.revenue} onValueChange={(v) => set("revenue", v)}>
                <SelectTrigger><SelectValue placeholder="选择区间" /></SelectTrigger>
                <SelectContent>
                  {REVENUE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Grid2>
        </Section>

        <Section title="目标市场" icon={<Target className="h-4 w-4" />}>
          <Field label="目标国家 / 地区（多选）">
            <MultiPick
              options={COUNTRY_OPTIONS}
              value={draft.targetCountries}
              onChange={(v) => set("targetCountries", v)}
              allowCustom
              addPlaceholder="输入国家 / 地区后回车，可自定义添加"
            />
          </Field>
          <Field label="目标客户行业（多选）">
            <MultiPick
              options={INDUSTRY_OPTIONS}
              value={draft.targetIndustries}
              onChange={(v) => set("targetIndustries", v)}
              allowCustom
              addPlaceholder="输入目标行业后回车，可自定义添加"
            />
          </Field>
          <Field label="目标客户规模">
            <Select
              value={draft.targetScale}
              onValueChange={(v) => set("targetScale", v)}
            >
              <SelectTrigger><SelectValue placeholder="选择规模" /></SelectTrigger>
              <SelectContent>
                {SCALE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="竞争情报" icon={<TrendingUp className="h-4 w-4" />}>
          <Field label="主要竞品企业">
            <ChipInput
              placeholder="输入竞品企业名后回车"
              value={draft.competitors}
              onChange={(v) => set("competitors", v)}
            />
          </Field>
          <Field label="差异化优势">
            <CountedTextarea
              rows={3}
              max={2000}
              value={draft.advantage}
              onChange={(v) => set("advantage", v)}
              placeholder="简述您的产品 / 服务相较竞品的核心差异化优势"
            />
          </Field>
        </Section>

        <Section title="附加资料（可选）" icon={<Sparkles className="h-4 w-4" />}>
          <Grid2>
            <Field label="企业官网">
              <Input
                value={draft.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://"
              />
            </Field>
            <Field label="认证资质">
              <ChipInput
                placeholder="ISO 9001、CE…"
                value={draft.certifications}
                onChange={(v) => set("certifications", v)}
              />
            </Field>
          </Grid2>
          <Field label="品牌故事 / 简介">
            <CountedTextarea
              rows={4}
              max={2000}
              value={draft.brandStory}
              onChange={(v) => set("brandStory", v)}
              placeholder="一段简短的企业故事，将用于 AI 理解品牌定位"
            />
          </Field>
          <Field label="出口资质">
            <div className="space-y-2.5">
              <ChipInput
                placeholder="自营进出口权、AEO 认证…"
                value={draft.exportQualifications}
                onChange={(v) => set("exportQualifications", v)}
              />
              <QualificationUploader
                files={draft.exportQualificationFiles}
                onChange={(f) => set("exportQualificationFiles", f)}
                onRecognize={(name) => {
                  if (!draft.exportQualifications.includes(name)) {
                    set("exportQualifications", [
                      ...draft.exportQualifications,
                      name,
                    ]);
                  }
                }}
              />
            </div>
          </Field>
        </Section>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDraft(current)}>
            重置
          </Button>
          <Button onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" /> 保存画像
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 self-start">
        <Card className="p-5 space-y-4">
          <div className="text-sm font-medium">画像完整度</div>
          <div className="relative h-32 w-32 mx-auto">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle
                cx="50" cy="50" r="42"
                strokeWidth="10"
                className="fill-none stroke-muted"
              />
              <circle
                cx="50" cy="50" r="42"
                strokeWidth="10"
                strokeLinecap="round"
                className="fill-none stroke-primary transition-all"
                strokeDasharray={`${(completeness / 100) * 263.9} 263.9`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold tabular-nums">
                {completeness}
                <span className="text-base text-muted-foreground">%</span>
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            完整度越高，AI 推荐越精准。建议至少填写
            <span className="text-foreground"> 行业、主营产品、目标市场 </span>
            三项。
          </div>
        </Card>
      </aside>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function MultiPick({
  options,
  value,
  onChange,
  allowCustom,
  addPlaceholder,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  allowCustom?: boolean;
  addPlaceholder?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draftInput, setDraftInput] = useState("");

  const toggle = (o: string) => {
    if (value.includes(o)) onChange(value.filter((x) => x !== o));
    else onChange([...value, o]);
  };

  const commitAdd = () => {
    const v = draftInput.trim();
    if (!v) {
      setAdding(false);
      return;
    }
    if (!value.includes(v)) onChange([...value, v]);
    setDraftInput("");
    setAdding(false);
  };

  // 把自定义添加的（不在 options 内的）也一并显示为选项 chip（已选状态）
  const merged = [
    ...options,
    ...value.filter((v) => !options.includes(v)),
  ];

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {merged.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={`px-2.5 h-7 rounded-full text-xs font-medium border transition-colors ${
              on
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {o}
          </button>
        );
      })}
      {allowCustom &&
        (adding ? (
          <span className="inline-flex items-center gap-1">
            <Input
              autoFocus
              value={draftInput}
              onChange={(e) => setDraftInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitAdd();
                } else if (e.key === "Escape") {
                  setDraftInput("");
                  setAdding(false);
                }
              }}
              onBlur={commitAdd}
              placeholder={addPlaceholder ?? "输入后回车"}
              className="h-7 w-48 text-xs"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-2.5 h-7 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> 添加
          </button>
        ))}
    </div>
  );
}

function ChipInput({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={mono ? "font-mono" : ""}
        />
        <Button type="button" variant="outline" onClick={add} className="gap-1 shrink-0">
          <Plus className="h-4 w-4" /> 添加
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span
              key={v}
              className={`inline-flex items-center gap-1 pl-2.5 pr-1 h-6 rounded-full text-xs bg-primary/10 text-primary ${
                mono ? "font-mono" : ""
              }`}
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-black/10"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
/* ============================ 受控字数 Textarea ============================ */

function CountedTextarea({
  value,
  onChange,
  max,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
  rows?: number;
  placeholder?: string;
}) {
  const len = value.length;
  const near = len >= max * 0.9;
  const full = len >= max;
  return (
    <div className="relative">
      <Textarea
        rows={rows}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder={placeholder}
        className="pr-2 pb-6"
      />
      <div
        className={`pointer-events-none absolute bottom-1.5 right-2.5 text-[11px] tabular-nums ${
          full ? "text-destructive" : near ? "text-amber-600" : "text-muted-foreground"
        }`}
      >
        {len}/{max}
      </div>
    </div>
  );
}

/* ============================ 出口资质附件上传 ============================ */

const QUALIFICATION_DICT = [
  "AEO 高级认证",
  "自营进出口经营权",
  "出口食品生产企业备案",
  "CCIC 检验证书",
  "FORM E 原产地证",
  "CE 认证",
  "FDA 注册",
  "ISO 9001 质量管理体系",
  "海关 RCEP 优惠认证",
  "进出口商品检验检疫证明",
];

function QualificationUploader({
  files,
  onChange,
  onRecognize,
}: {
  files: { id: string; name: string; dataUrl: string }[];
  onChange: (next: { id: string; name: string; dataUrl: string }[]) => void;
  onRecognize: (name: string) => void;
}) {
  const MAX = 10;
  const inputId = "qualification-upload-input";
  const remaining = MAX - files.length;

  const handleFiles = async (list: FileList | null) => {
    if (!list || !list.length) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) {
      toast.error("仅支持图片格式");
      return;
    }
    const room = MAX - files.length;
    if (imgs.length > room) {
      toast.warning(`最多上传 ${MAX} 张，已为您截取前 ${room} 张`);
    }
    const picked = imgs.slice(0, room);
    const next = [...files];
    for (const f of picked) {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.readAsDataURL(f);
      });
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      next.push({ id, name: f.name, dataUrl });
    }
    onChange(next);

    // 模拟 AI 识别
    setTimeout(() => {
      const recognized = picked
        .map(
          (_, i) =>
            QUALIFICATION_DICT[
              (next.length - picked.length + i) % QUALIFICATION_DICT.length
            ],
        )
        .filter(Boolean);
      const uniq = Array.from(new Set(recognized));
      uniq.forEach((n) => onRecognize(n));
      if (uniq.length) {
        toast.success(`AI 已识别 ${uniq.length} 项资质`, {
          description: uniq.join("、"),
        });
      }
    }, 600);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5" />
          上传资质图片，AI 自动识别（支持 PNG / JPG，最多 {MAX} 张）
        </span>
        <span className="tabular-nums">{files.length}/{MAX}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {files.map((f) => (
          <div
            key={f.id}
            className="group relative aspect-square rounded-lg ring-1 ring-border overflow-hidden bg-muted/30"
          >
            <img
              src={f.dataUrl}
              alt={f.name}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(files.filter((x) => x.id !== f.id))}
              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="删除"
            >
              <XIcon className="h-3 w-3" />
            </button>
            <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 text-[10px] text-white bg-gradient-to-t from-black/70 to-transparent truncate">
              {f.name}
            </div>
          </div>
        ))}

        {remaining > 0 && (
          <label
            htmlFor={inputId}
            className="aspect-square rounded-lg ring-1 ring-dashed ring-border hover:ring-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer text-muted-foreground"
          >
            <Upload className="h-4 w-4" />
            <span className="text-[11px]">点击上传</span>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
