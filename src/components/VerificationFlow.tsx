import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Upload,
  ScanFace,
  CreditCard,
  Smartphone,
  Building2,
  User as UserIcon,
  FileText,
  ArrowRight,
  ArrowLeft,
  Clock,
  XCircle,
  QrCode,
  ExternalLink,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type AuthSubject = "personal" | "enterprise";
export type LevelKey = "L1" | "L2" | "L3" | "L4";

type FieldType = "text" | "id" | "phone" | "upload" | "face" | "bank";
type FieldDef = { key: string; label: string; type: FieldType; placeholder?: string; hint?: string };

type LevelDef = {
  key: LevelKey;
  title: string;
  tag: string;
  desc: string;
  fields: FieldDef[];
};

const PERSONAL_LEVELS: LevelDef[] = [
  {
    key: "L1",
    title: "基础认证",
    tag: "二要素",
    desc: "姓名 + 身份证",
    fields: [
      { key: "name", label: "真实姓名", type: "text", placeholder: "请输入身份证上的姓名" },
      { key: "idNo", label: "身份证号", type: "id", placeholder: "18 位身份证号码" },
    ],
  },
  {
    key: "L2",
    title: "三要素认证",
    tag: "三要素",
    desc: "+ 本人手机号",
    fields: [
      { key: "name", label: "真实姓名", type: "text" },
      { key: "idNo", label: "身份证号", type: "id" },
      { key: "phone", label: "本人手机号", type: "phone", hint: "用于运营商三要素核验" },
    ],
  },
  {
    key: "L3",
    title: "人脸核身",
    tag: "人脸核身",
    desc: "+ 人脸识别",
    fields: [
      { key: "name", label: "真实姓名", type: "text" },
      { key: "idNo", label: "身份证号", type: "id" },
      { key: "phone", label: "本人手机号", type: "phone" },
      { key: "face", label: "人脸识别", type: "face", hint: "调用活体检测 SDK" },
    ],
  },
  {
    key: "L4",
    title: "完整认证",
    tag: "四要素",
    desc: "+ 银行卡验证",
    fields: [
      { key: "name", label: "真实姓名", type: "text" },
      { key: "idNo", label: "身份证号", type: "id" },
      { key: "phone", label: "本人手机号", type: "phone", hint: "银行卡预留手机号" },
      { key: "face", label: "人脸识别", type: "face" },
      { key: "bank", label: "本人银行卡", type: "bank", hint: "银联四要素鉴权" },
    ],
  },
];

const ENTERPRISE_LEVELS: LevelDef[] = [
  {
    key: "L1",
    title: "基础认证",
    tag: "企业 + 法人二要素",
    desc: "企业信息 + 法人姓名 + 身份证",
    fields: [
      { key: "companyName", label: "企业名称", type: "text" },
      { key: "uscc", label: "统一社会信用代码", type: "text", placeholder: "18 位社会信用代码" },
      { key: "legalName", label: "法人姓名", type: "text" },
      { key: "legalIdNo", label: "法人身份证号", type: "id" },
    ],
  },
  {
    key: "L2",
    title: "三要素认证",
    tag: "法人三要素",
    desc: "+ 法人手机号",
    fields: [
      { key: "companyName", label: "企业名称", type: "text" },
      { key: "uscc", label: "统一社会信用代码", type: "text" },
      { key: "legalName", label: "法人姓名", type: "text" },
      { key: "legalIdNo", label: "法人身份证号", type: "id" },
      { key: "legalPhone", label: "法人手机号", type: "phone" },
    ],
  },
  {
    key: "L3",
    title: "人脸核身",
    tag: "企业 + 法人人脸核身",
    desc: "+ 营业执照 + 法人人脸识别",
    fields: [
      { key: "companyName", label: "企业名称", type: "text" },
      { key: "uscc", label: "统一社会信用代码", type: "text" },
      { key: "license", label: "营业执照", type: "upload", hint: "支持 JPG/PNG/PDF，≤ 5MB" },
      { key: "legalName", label: "法人姓名", type: "text" },
      { key: "legalIdNo", label: "法人身份证号", type: "id" },
      { key: "legalPhone", label: "法人手机号", type: "phone" },
      { key: "legalFace", label: "法人人脸识别", type: "face" },
    ],
  },
  {
    key: "L4",
    title: "完整认证",
    tag: "企业完整认证",
    desc: "+ 对公账户验证",
    fields: [
      { key: "companyName", label: "企业名称", type: "text" },
      { key: "uscc", label: "统一社会信用代码", type: "text" },
      { key: "license", label: "营业执照", type: "upload" },
      { key: "legalName", label: "法人姓名", type: "text" },
      { key: "legalIdNo", label: "法人身份证号", type: "id" },
      { key: "legalPhone", label: "法人手机号", type: "phone" },
      { key: "legalFace", label: "法人人脸识别", type: "face" },
      { key: "bankAccount", label: "对公账户", type: "bank", hint: "打款验证或银联鉴权" },
    ],
  },
];

const LEVEL_COLORS: Record<LevelKey, string> = {
  L1: "from-sky-500/15 to-sky-500/5 border-sky-500/30",
  L2: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/30",
  L3: "from-teal-500/15 to-teal-500/5 border-teal-500/30",
  L4: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
};

type Provider = {
  id: string;
  name: string;
  desc: string;
  badge: string;
  color: string;
  initial: string;
};

const PROVIDERS: Provider[] = [
  { id: "alipay", name: "支付宝实名", desc: "跳转支付宝完成实人认证，回调返回结果", badge: "第三方", color: "from-blue-500/15 to-sky-500/5 border-blue-500/30", initial: "支" },
];

const FIELD_ICON: Record<FieldType, typeof UserIcon> = {
  text: FileText,
  id: FileText,
  phone: Smartphone,
  upload: Upload,
  face: ScanFace,
  bank: CreditCard,
};

type Props = {
  subject: AuthSubject;
};

export function VerificationFlow({ subject }: Props) {
  const isPersonal = subject === "personal";
  const levels = isPersonal ? PERSONAL_LEVELS : ENTERPRISE_LEVELS;
  const SubjectIcon = isPersonal ? UserIcon : Building2;
  const title = isPersonal ? "个人实名认证" : "企业实名认证";
  const subtitle = isPersonal
    ? "按所选认证等级提交个人资料，通过支付宝实人认证完成核验"
    : "提交企业与法人资料，通过支付宝实人认证完成核验";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [levelKey, setLevelKey] = useState<LevelKey>(isPersonal ? "L2" : "L4");
  const [form, setForm] = useState<Record<string, string>>({});
  const provider = "alipay";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<"pending" | "success" | "review" | "failed">("pending");

  const currentLevel = useMemo(() => levels.find((l) => l.key === levelKey)!, [levels, levelKey]);

  const STEPS = (
    isPersonal
      ? [
          { n: 1, title: "选择认证等级", icon: ShieldCheck },
          { n: 2, title: "填写认证资料", icon: FileText },
          { n: 3, title: "提交与结果", icon: CheckCircle2 },
        ]
      : [
          { n: 2, title: "填写认证资料", icon: FileText },
          { n: 3, title: "提交与结果", icon: CheckCircle2 },
        ]
  ) as ReadonlyArray<{ n: 1 | 2 | 3; title: string; icon: typeof ShieldCheck }>;

  // Enterprise skips level selection — start at the fill-in step.
  useEffect(() => {
    if (!isPersonal && step === 1) setStep(2);
  }, [isPersonal, step]);

  const updateField = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const goNext = () => {
    if (step === 2) {
      const missing = currentLevel.fields.find((f) => !form[f.key] && f.type !== "face" && f.type !== "upload");
      if (missing) {
        toast.error(`请填写「${missing.label}」`);
        return;
      }
    }
    setStep((s) => (Math.min(3, s + 1) as 1 | 2 | 3));
  };
  const goPrev = () => setStep((s) => (Math.max(isPersonal ? 1 : 2, s - 1) as 1 | 2 | 3));

  const onSubmit = () => {
    setDialogOpen(true);
  };

  const handleCallback = (ok: boolean) => {
    setDialogOpen(false);
    setResult(ok ? "success" : "failed");
    setStep(3);
    toast[ok ? "success" : "error"](ok ? "第三方认证成功" : "第三方认证失败，请重试");
  };

  const providerName = PROVIDERS.find((p) => p.id === provider)?.name ?? "";

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/30">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">首页</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>实名认证</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>用户端</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{title}</span>
      </div>

      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <SubjectIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Card className="px-4 py-2.5 flex items-center gap-3 bg-card/60 backdrop-blur">
          <div className="text-xs text-muted-foreground">当前状态</div>
          {result === "success" ? (
            <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> 已通过 · {levelKey}</Badge>
          ) : result === "review" ? (
            <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> 人工审核中</Badge>
          ) : result === "failed" ? (
            <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> 认证失败</Badge>
          ) : (
            <Badge variant="outline">未提交</Badge>
          )}
        </Card>
      </div>

      {/* Stepper */}
      <div className="px-8 mt-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const active = step === s.n;
              const done = step > s.n;
              const Icon = s.icon;
              return (
                <div key={s.n} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                        done
                          ? "bg-primary border-primary text-primary-foreground"
                          : active
                          ? "border-primary text-primary bg-primary/10"
                          : "border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className={`text-xs ${active || done ? "text-foreground font-medium" : "text-muted-foreground"}`}>步骤 {s.n}</div>
                      <div className={`text-sm ${active ? "text-primary font-semibold" : done ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</div>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${step > s.n ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Body grid */}
      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {step === 1 && isPersonal && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">选择认证等级</h2>
                  <p className="text-xs text-muted-foreground mt-1">不同等级所需的认证要素不同，等级越高校验越严格</p>
                </div>
                <Badge variant="outline">已选 {levelKey}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {levels.map((l) => {
                  const selected = l.key === levelKey;
                  return (
                    <button
                      key={l.key}
                      onClick={() => setLevelKey(l.key)}
                      className={`text-left rounded-xl border p-4 bg-gradient-to-br ${LEVEL_COLORS[l.key]} transition-all ${
                        selected ? "ring-2 ring-primary shadow-lg shadow-primary/20" : "hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{l.key} · {l.title}</div>
                        {selected ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{l.tag}</div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {l.fields.map((f) => (
                          <Badge key={f.key} variant="secondary" className="text-[10px] font-normal">
                            {f.label}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">填写认证资料</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    当前等级：<span className="text-foreground font-medium">{currentLevel.key} · {currentLevel.title}</span>，共需 {currentLevel.fields.length} 项资料
                  </p>
                </div>
                {isPersonal && (
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>更改等级</Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentLevel.fields.map((f) => {
                  const Icon = FIELD_ICON[f.type];
                  if (f.type === "face") {
                    return (
                      <div key={f.key} className="sm:col-span-2 rounded-lg border border-dashed p-5 flex items-center gap-4 bg-muted/30">
                        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <ScanFace className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{f.label} <span className="text-destructive">*</span></div>
                          <div className="text-xs text-muted-foreground">{f.hint ?? "点击启动活体检测"}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { updateField(f.key, "captured"); toast.success("人脸采集成功"); }}>
                          {form[f.key] ? "重新采集" : "启动采集"}
                        </Button>
                      </div>
                    );
                  }
                  if (f.type === "upload") {
                    return (
                      <div key={f.key} className="sm:col-span-2 rounded-lg border border-dashed p-5 flex items-center gap-4 bg-muted/30">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Upload className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{f.label} <span className="text-destructive">*</span></div>
                          <div className="text-xs text-muted-foreground">{f.hint ?? "支持 JPG / PNG / PDF"}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { updateField(f.key, "uploaded"); toast.success("上传成功"); }}>
                          {form[f.key] ? "已上传" : "选择文件"}
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {f.label} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form[f.key] ?? ""}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        placeholder={f.placeholder ?? `请输入${f.label}`}
                      />
                      {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2 bg-muted/40 rounded-md p-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                所有资料仅用于本次实名认证，加密传输并符合《个人信息保护法》要求
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="p-8 text-center">
              {result === "success" && (
                <>
                  <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">认证已通过</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    认证等级 {levelKey} · 渠道 {providerName}
                  </p>
                </>
              )}
              {result === "review" && (
                <>
                  <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Clock className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">已提交，人工审核中</h3>
                  <p className="mt-1 text-sm text-muted-foreground">预计 24 小时内完成审核，结果将通过站内消息通知</p>
                </>
              )}
              {result === "failed" && (
                <>
                  <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                    <XCircle className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">认证失败</h3>
                  <p className="mt-1 text-sm text-muted-foreground">请核对资料后重新提交，或更换认证渠道</p>
                </>
              )}
              {result === "pending" && (
                <p className="text-sm text-muted-foreground">请先完成前面的步骤</p>
              )}
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button variant="outline" onClick={() => { setStep(1); setResult("pending"); setForm({}); }}>
                  重新发起
                </Button>
                {result === "failed" && (
                  <Button onClick={() => setStep(2)}>修改资料并重试</Button>
                )}
              </div>
            </Card>
          )}

          {/* Step Footer */}
          {step < 3 && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={goPrev} disabled={step === (isPersonal ? 1 : 2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> 上一步
              </Button>
              {step < 2 ? (
                <Button onClick={goNext}>
                  下一步 <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={onSubmit}>
                  提交认证 <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Side: history */}
        <Card className="p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">认证历史</h3>
          </div>
          <ol className="relative border-l border-border ml-2 space-y-4">
            {[
              { t: "2026-06-15 10:24", title: "提交认证申请", desc: `等级 ${levelKey} · ${providerName}` },
              { t: "2026-05-02 14:11", title: "L2 认证通过", desc: "平台直连" },
              { t: "2026-04-01 09:00", title: "L1 认证通过", desc: "平台直连" },
            ].map((e, i) => (
              <li key={i} className="ml-4">
                <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary/80 border border-background" />
                <div className="text-[11px] text-muted-foreground">{e.t}</div>
                <div className="text-sm font-medium mt-0.5">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.desc}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Third-party redirect dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" /> 跳转至 {providerName}
            </DialogTitle>
            <DialogDescription>
              请使用 {providerName} 扫码完成实人核验，完成后系统将自动接收回调结果
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="h-40 w-40 rounded-xl border-2 border-dashed border-primary/30 bg-muted/40 flex items-center justify-center">
              <QrCode className="h-20 w-20 text-primary/70" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">等待第三方回调… (模拟)</p>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            <Button variant="outline" onClick={() => handleCallback(false)}>模拟失败回调</Button>
            <Button onClick={() => handleCallback(true)}>模拟成功回调</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}