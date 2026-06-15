import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Layers,
  ChevronRight,
  User,
  Building2,
  Plus,
  Pencil,
  CheckCircle2,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/auth/admin/levels")({
  component: LevelsPage,
});

type LevelKey = "L1" | "L2" | "L3" | "L4";

type LevelDef = {
  key: LevelKey;
  title: string;
  personalTag: string;
  personalDesc: string;
  personalFactors: string[];
  enterpriseTag: string;
  enterpriseDesc: string;
  enterpriseFactors: string[];
  tenants: number;
  enabled: boolean;
};

const LEVELS: LevelDef[] = [
  {
    key: "L1",
    title: "基础认证",
    personalTag: "二要素",
    personalDesc: "姓名 + 身份证",
    personalFactors: ["姓名", "身份证号"],
    enterpriseTag: "企业 + 法人二要素",
    enterpriseDesc: "企业信息 + 法人姓名 + 身份证",
    enterpriseFactors: ["企业名称", "统一社会信用代码", "法人姓名", "法人身份证号"],
    tenants: 128,
    enabled: true,
  },
  {
    key: "L2",
    title: "三要素认证",
    personalTag: "三要素",
    personalDesc: "+ 手机号",
    personalFactors: ["姓名", "身份证号", "手机号"],
    enterpriseTag: "法人三要素",
    enterpriseDesc: "+ 法人手机号",
    enterpriseFactors: ["企业信息", "法人姓名", "法人身份证号", "法人手机号"],
    tenants: 86,
    enabled: true,
  },
  {
    key: "L3",
    title: "人脸核身",
    personalTag: "人脸核身",
    personalDesc: "+ 人脸识别",
    personalFactors: ["姓名", "身份证号", "手机号", "人脸识别"],
    enterpriseTag: "企业 + 法人人脸核身",
    enterpriseDesc: "+ 营业执照 + 法人人脸识别",
    enterpriseFactors: ["企业信息", "营业执照", "法人三要素", "法人人脸识别"],
    tenants: 54,
    enabled: true,
  },
  {
    key: "L4",
    title: "完整认证",
    personalTag: "四要素",
    personalDesc: "+ 银行卡验证",
    personalFactors: ["姓名", "身份证号", "手机号", "人脸识别", "银行卡"],
    enterpriseTag: "企业完整认证",
    enterpriseDesc: "+ 对公账户验证",
    enterpriseFactors: ["企业信息", "营业执照", "法人四要素", "对公账户"],
    tenants: 21,
    enabled: false,
  },
];

const LEVEL_COLORS: Record<LevelKey, string> = {
  L1: "from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-700 dark:text-sky-300",
  L2: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/30 text-cyan-700 dark:text-cyan-300",
  L3: "from-teal-500/15 to-teal-500/5 border-teal-500/30 text-teal-700 dark:text-teal-300",
  L4: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
};

const DEFAULT_LEVEL_COLOR =
  "from-violet-500/15 to-violet-500/5 border-violet-500/30 text-violet-700 dark:text-violet-300";

const getLevelColor = (key: LevelKey) => LEVEL_COLORS[key] ?? DEFAULT_LEVEL_COLOR;

function LevelsPage() {
  const [levels, setLevels] = useState(LEVELS);
  const [confirmTarget, setConfirmTarget] = useState<{ key: LevelKey; next: boolean } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const requestToggle = (key: LevelKey) => {
    const current = levels.find((l) => l.key === key);
    if (!current) return;
    setConfirmTarget({ key, next: !current.enabled });
  };

  const confirmToggle = () => {
    if (!confirmTarget) return;
    setLevels((s) =>
      s.map((l) => (l.key === confirmTarget.key ? { ...l, enabled: confirmTarget.next } : l))
    );
    toast.success(`${confirmTarget.key} 已${confirmTarget.next ? "启用" : "停用"}`);
    setConfirmTarget(null);
  };

  const confirmLevel = confirmTarget ? levels.find((l) => l.key === confirmTarget.key) : null;

  const handleCreate = (l: LevelDef) => {
    setLevels((s) => [...s, l]);
    toast.success(`已新建认证等级 ${l.key} · ${l.title}`);
    setCreateOpen(false);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/30">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">首页</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>实名认证</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/auth/admin" className="hover:text-foreground transition-colors">管理端</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">认证等级</span>
      </div>

      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">认证等级</h1>
            <p className="text-sm text-muted-foreground">配置个人 / 企业租户的实名认证分级策略</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {levels.map((l) => (
          <Card
            key={l.key}
            className={`relative overflow-hidden p-5 bg-gradient-to-br ${getLevelColor(l.key)} border`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium opacity-80">{l.key} · {l.title}</div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                  {l.tenants}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">已配置租户</div>
              </div>
              <div className="h-9 w-9 rounded-lg bg-background/60 backdrop-blur flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={l.enabled ? "default" : "secondary"} className="text-[10px]">
                {l.enabled ? "启用中" : "已停用"}
              </Badge>
              <span className="text-[11px] text-muted-foreground">{l.personalTag}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-8 mt-6 pb-10">
        <Tabs defaultValue="personal" className="w-full">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList>
              <TabsTrigger value="personal">
                <User className="h-3.5 w-3.5" /> 个人用户
              </TabsTrigger>
              <TabsTrigger value="enterprise">
                <Building2 className="h-3.5 w-3.5" /> 企业用户
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> 新建等级
            </Button>
          </div>

          {/* Personal view */}
          <TabsContent value="personal" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {levels.map((l) => (
                <LevelDetailCard
                  key={l.key}
                  level={l}
                  audience="personal"
                  onToggle={() => requestToggle(l.key)}
                />
              ))}
            </div>
          </TabsContent>

          {/* Enterprise view */}
          <TabsContent value="enterprise" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {levels.map((l) => (
                <LevelDetailCard
                  key={l.key}
                  level={l}
                  audience="enterprise"
                  onToggle={() => requestToggle(l.key)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认{confirmTarget?.next ? "启用" : "停用"} {confirmTarget?.key} · {confirmLevel?.title}？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.next
                ? `启用后，该等级将可被租户认证策略选用，当前已配置 ${confirmLevel?.tenants ?? 0} 个租户。`
                : `停用后，新的认证策略将无法选择该等级，已配置该等级的 ${confirmLevel?.tenants ?? 0} 个租户的存量认证不受影响，但后续无法发起新认证。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              确认{confirmTarget?.next ? "启用" : "停用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateLevelDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingKeys={levels.map((l) => l.key)}
        onCreate={handleCreate}
      />
    </div>
  );
}

function LevelDetailCard({
  level,
  audience,
  onToggle,
}: {
  level: LevelDef;
  audience: "personal" | "enterprise";
  onToggle: () => void;
}) {
  const isPersonal = audience === "personal";
  const tag = isPersonal ? level.personalTag : level.enterpriseTag;
  const desc = isPersonal ? level.personalDesc : level.enterpriseDesc;
  const factors = isPersonal ? level.personalFactors : level.enterpriseFactors;
  const Icon = isPersonal ? User : Building2;

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${getLevelColor(level.key)} border`}>
      <div className="p-5 bg-card/70 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${getLevelColor(level.key)} border flex items-center justify-center font-bold`}>
              {level.key}
            </div>
            <div>
              <div className="text-base font-semibold flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {level.title}
              </div>
              <div className="text-xs text-muted-foreground">{tag}</div>
            </div>
          </div>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Switch checked={level.enabled} onCheckedChange={onToggle} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {level.enabled ? `点击停用 ${level.key} · ${level.title}` : `点击启用 ${level.key} · ${level.title}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="mt-4 text-sm text-foreground/90">{desc}</div>

        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">认证要素</div>
          <div className="flex flex-wrap gap-1.5">
            {factors.map((f) => (
              <Badge key={f} variant="secondary" className="text-[11px] font-normal">
                <CheckCircle2 className="h-3 w-3 text-primary" /> {f}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>已配置租户：<span className="text-foreground font-medium tabular-nums">{level.tenants}</span></span>
          <Button size="sm" variant="ghost" onClick={() => toast.info(`编辑 ${level.key}`)}>
            <Pencil className="h-3.5 w-3.5" /> 编辑要素
          </Button>
        </div>
      </div>
    </Card>
  );
}

const PRESET_PERSONAL_FACTORS = [
  "姓名",
  "身份证号",
  "手机号",
  "人脸识别",
  "银行卡",
  "活体检测",
  "邮箱",
];
const PRESET_ENTERPRISE_FACTORS = [
  "企业名称",
  "统一社会信用代码",
  "营业执照",
  "法人姓名",
  "法人身份证号",
  "法人手机号",
  "法人人脸识别",
  "对公账户",
];

function CreateLevelDialog({
  open,
  onOpenChange,
  existingKeys,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingKeys: LevelKey[];
  onCreate: (l: LevelDef) => void;
}) {
  const suggestedKey = `L${existingKeys.length + 1}` as LevelKey;

  const [key, setKey] = useState<string>(suggestedKey);
  const [title, setTitle] = useState("");
  const [enabled, setEnabled] = useState(true);

  const [personalTag, setPersonalTag] = useState("");
  const [personalDesc, setPersonalDesc] = useState("");
  const [personalFactors, setPersonalFactors] = useState<string[]>([]);

  const [enterpriseTag, setEnterpriseTag] = useState("");
  const [enterpriseDesc, setEnterpriseDesc] = useState("");
  const [enterpriseFactors, setEnterpriseFactors] = useState<string[]>([]);

  const reset = () => {
    setKey(`L${existingKeys.length + 1}`);
    setTitle("");
    setEnabled(true);
    setPersonalTag("");
    setPersonalDesc("");
    setPersonalFactors([]);
    setEnterpriseTag("");
    setEnterpriseDesc("");
    setEnterpriseFactors([]);
  };

  const handleSubmit = () => {
    const trimmedKey = key.trim().toUpperCase();
    if (!trimmedKey) return toast.error("请填写等级编码");
    if (existingKeys.includes(trimmedKey as LevelKey))
      return toast.error(`等级编码 ${trimmedKey} 已存在`);
    if (!title.trim()) return toast.error("请填写等级名称");
    if (personalFactors.length === 0 && enterpriseFactors.length === 0)
      return toast.error("请至少为个人或企业用户配置一项认证要素");

    onCreate({
      key: trimmedKey as LevelKey,
      title: title.trim(),
      personalTag: personalTag.trim() || "—",
      personalDesc: personalDesc.trim() || "—",
      personalFactors,
      enterpriseTag: enterpriseTag.trim() || "—",
      enterpriseDesc: enterpriseDesc.trim() || "—",
      enterpriseFactors,
      tenants: 0,
      enabled,
    });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[680px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> 新建认证等级
          </DialogTitle>
          <DialogDescription>
            自定义认证等级编码、名称及个人 / 企业用户的认证要素组合，启用后可在租户认证策略中选用。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* 基础信息 */}
          <section className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              基础信息
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lvl-key">等级编码 *</Label>
                <Input
                  id="lvl-key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="如 L5"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lvl-title">等级名称 *</Label>
                <Input
                  id="lvl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="如 高强度认证"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <div className="text-sm font-medium">启用此等级</div>
                <div className="text-xs text-muted-foreground">
                  停用后租户策略将无法选用该等级
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </section>

          {/* 个人用户 */}
          <FactorSection
            icon={<User className="h-3.5 w-3.5" />}
            title="个人用户配置"
            tag={personalTag}
            onTagChange={setPersonalTag}
            tagPlaceholder="如 三要素"
            desc={personalDesc}
            onDescChange={setPersonalDesc}
            descPlaceholder="如 姓名 + 身份证 + 手机号"
            factors={personalFactors}
            onFactorsChange={setPersonalFactors}
            presets={PRESET_PERSONAL_FACTORS}
          />

          {/* 企业用户 */}
          <FactorSection
            icon={<Building2 className="h-3.5 w-3.5" />}
            title="企业用户配置"
            tag={enterpriseTag}
            onTagChange={setEnterpriseTag}
            tagPlaceholder="如 法人三要素"
            desc={enterpriseDesc}
            onDescChange={setEnterpriseDesc}
            descPlaceholder="如 企业信息 + 法人三要素"
            factors={enterpriseFactors}
            onFactorsChange={setEnterpriseFactors}
            presets={PRESET_ENTERPRISE_FACTORS}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            <CheckCircle2 className="h-4 w-4" /> 确认新建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FactorSection({
  icon,
  title,
  tag,
  onTagChange,
  tagPlaceholder,
  desc,
  onDescChange,
  descPlaceholder,
  factors,
  onFactorsChange,
  presets,
}: {
  icon: React.ReactNode;
  title: string;
  tag: string;
  onTagChange: (v: string) => void;
  tagPlaceholder: string;
  desc: string;
  onDescChange: (v: string) => void;
  descPlaceholder: string;
  factors: string[];
  onFactorsChange: (v: string[]) => void;
  presets: string[];
}) {
  const [draft, setDraft] = useState("");

  const addFactor = (v: string) => {
    const t = v.trim();
    if (!t) return;
    if (factors.includes(t)) return;
    onFactorsChange([...factors, t]);
    setDraft("");
  };

  const removeFactor = (v: string) => {
    onFactorsChange(factors.filter((f) => f !== v));
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card/50 p-4">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {icon} {title}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>简称标签</Label>
          <Input value={tag} onChange={(e) => onTagChange(e.target.value)} placeholder={tagPlaceholder} />
        </div>
        <div className="space-y-1.5">
          <Label>说明</Label>
          <Input value={desc} onChange={(e) => onDescChange(e.target.value)} placeholder={descPlaceholder} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>认证要素</Label>
        <div className="flex flex-wrap gap-1.5 min-h-9 rounded-md border bg-background px-2 py-1.5">
          {factors.length === 0 && (
            <span className="text-xs text-muted-foreground self-center px-1">
              未添加任何要素
            </span>
          )}
          {factors.map((f) => (
            <Badge key={f} variant="secondary" className="text-[11px] gap-1 pr-1">
              <CheckCircle2 className="h-3 w-3 text-primary" /> {f}
              <button
                type="button"
                onClick={() => removeFactor(f)}
                className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                aria-label={`移除 ${f}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFactor(draft);
              }
            }}
            placeholder="输入要素名称，回车添加"
          />
          <Button type="button" variant="outline" onClick={() => addFactor(draft)}>
            <Plus className="h-4 w-4" /> 添加
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground self-center">推荐：</span>
          {presets.map((p) => {
            const active = factors.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => (active ? removeFactor(p) : addFactor(p))}
                className={`text-[11px] rounded-full border px-2 py-0.5 transition-colors ${
                  active
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}