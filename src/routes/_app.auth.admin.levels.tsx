import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Layers,
  ChevronRight,
  User,
  Building2,
  Plus,
  Save,
  Settings2,
  Pencil,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function LevelsPage() {
  const [levels, setLevels] = useState(LEVELS);

  const toggleEnabled = (key: LevelKey) => {
    setLevels((s) =>
      s.map((l) => (l.key === key ? { ...l, enabled: !l.enabled } : l))
    );
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => toast.info("打开要素配置")}>
            <Settings2 className="h-4 w-4" /> 配置要素
          </Button>
          <Button variant="outline" onClick={() => toast.info("新建自定义等级")}>
            <Plus className="h-4 w-4" /> 新建等级
          </Button>
          <Button onClick={() => toast.success("认证策略已保存")}>
            <Save className="h-4 w-4" /> 保存策略
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {levels.map((l) => (
          <Card
            key={l.key}
            className={`relative overflow-hidden p-5 bg-gradient-to-br ${LEVEL_COLORS[l.key]} border`}
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
        <Tabs defaultValue="compare" className="w-full">
          <TabsList>
            <TabsTrigger value="compare">对比视图</TabsTrigger>
            <TabsTrigger value="personal">
              <User className="h-3.5 w-3.5" /> 个人用户
            </TabsTrigger>
            <TabsTrigger value="enterprise">
              <Building2 className="h-3.5 w-3.5" /> 企业用户
            </TabsTrigger>
          </TabsList>

          {/* Compare view */}
          <TabsContent value="compare" className="mt-4">
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">个人 vs 企业 认证等级对比</div>
                  <div className="text-xs text-muted-foreground mt-0.5">逐级递进，下一等级包含上一等级全部要素</div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">等级</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />个人用户</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />企业用户</div>
                    </TableHead>
                    <TableHead className="w-28 text-center">状态</TableHead>
                    <TableHead className="w-24 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levels.map((l) => (
                    <TableRow key={l.key} className="align-top">
                      <TableCell>
                        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${LEVEL_COLORS[l.key]} border font-semibold text-sm`}>
                          {l.key}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{l.personalDesc}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">（{l.personalTag}）</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {l.personalFactors.map((f) => (
                            <Badge key={f} variant="outline" className="text-[10px] font-normal">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary" /> {f}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{l.enterpriseDesc}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">（{l.enterpriseTag}）</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {l.enterpriseFactors.map((f) => (
                            <Badge key={f} variant="outline" className="text-[10px] font-normal">
                              <CheckCircle2 className="h-2.5 w-2.5 text-accent" /> {f}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={l.enabled}
                            onCheckedChange={() => toggleEnabled(l.key)}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {l.enabled ? "启用中" : "已停用"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toast.info(`编辑 ${l.key} 等级`)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> 编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Personal view */}
          <TabsContent value="personal" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {levels.map((l) => (
                <LevelDetailCard
                  key={l.key}
                  level={l}
                  audience="personal"
                  onToggle={() => toggleEnabled(l.key)}
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
                  onToggle={() => toggleEnabled(l.key)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
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
    <Card className={`relative overflow-hidden bg-gradient-to-br ${LEVEL_COLORS[level.key]} border`}>
      <div className="p-5 bg-card/70 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${LEVEL_COLORS[level.key]} border flex items-center justify-center font-bold`}>
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
          <Switch checked={level.enabled} onCheckedChange={onToggle} />
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