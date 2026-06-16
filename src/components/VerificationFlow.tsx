import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Upload,
  ScanFace,
  CreditCard,
  Smartphone,
  Building2,
  User as UserIcon,
  FileText,
  ArrowRight,
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

type FieldType = "text" | "id" | "phone" | "upload" | "face" | "bank";
type FieldDef = { key: string; label: string; type: FieldType; placeholder?: string; hint?: string };

// 企业完整认证（L4）资料项
const ENTERPRISE_FIELDS: FieldDef[] = [
  { key: "companyName", label: "企业名称", type: "text" },
  { key: "uscc", label: "统一社会信用代码", type: "text", placeholder: "18 位社会信用代码" },
  { key: "license", label: "营业执照", type: "upload", hint: "支持 JPG/PNG/PDF，≤ 5MB" },
  { key: "legalName", label: "法人姓名", type: "text" },
  { key: "legalIdNo", label: "法人身份证号", type: "id" },
  { key: "legalPhone", label: "法人手机号", type: "phone" },
  { key: "legalFace", label: "法人人脸识别", type: "face" },
  { key: "bankAccount", label: "对公账户", type: "bank", hint: "打款验证或银联鉴权" },
];

const PROVIDER_NAME = "支付宝实名";

const FIELD_ICON: Record<FieldType, typeof UserIcon> = {
  text: FileText,
  id: FileText,
  phone: Smartphone,
  upload: Upload,
  face: ScanFace,
  bank: CreditCard,
};

export function VerificationFlow() {
  const title = "企业实名认证";
  const subtitle = "提交企业与法人资料，通过支付宝实人认证完成核验";

  const [form, setForm] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<"pending" | "success" | "review" | "failed">("pending");
  const [submitted, setSubmitted] = useState(false);

  const updateField = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = () => {
    const missing = ENTERPRISE_FIELDS.find((f) => !form[f.key] && f.type !== "face" && f.type !== "upload");
    if (missing) {
      toast.error(`请填写「${missing.label}」`);
      return;
    }
    setDialogOpen(true);
  };

  const handleCallback = (ok: boolean) => {
    setDialogOpen(false);
    setResult(ok ? "success" : "failed");
    setSubmitted(true);
    toast[ok ? "success" : "error"](ok ? "第三方认证成功" : "第三方认证失败，请重试");
  };

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
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Card className="px-4 py-2.5 flex items-center gap-3 bg-card/60 backdrop-blur">
          <div className="text-xs text-muted-foreground">当前状态</div>
          {result === "success" ? (
            <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> 已通过 · 完整认证</Badge>
          ) : result === "review" ? (
            <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> 人工审核中</Badge>
          ) : result === "failed" ? (
            <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> 认证失败</Badge>
          ) : (
            <Badge variant="outline">未提交</Badge>
          )}
        </Card>
      </div>

      {/* Body grid */}
      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {!submitted && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">填写认证资料</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    企业完整认证，共需 {ENTERPRISE_FIELDS.length} 项资料
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ENTERPRISE_FIELDS.map((f) => {
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
              <div className="mt-5 flex items-center justify-end">
                <Button onClick={onSubmit}>
                  提交认证 <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>
          )}

          {submitted && (
            <Card className="p-8 text-center">
              {result === "success" && (
                <>
                  <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">认证已通过</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    企业完整认证 · 渠道 {PROVIDER_NAME}
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
                  <p className="mt-1 text-sm text-muted-foreground">请核对资料后重新提交</p>
                </>
              )}
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button variant="outline" onClick={() => { setSubmitted(false); setResult("pending"); setForm({}); }}>
                  重新发起
                </Button>
                {result === "failed" && (
                  <Button onClick={() => setSubmitted(false)}>修改资料并重试</Button>
                )}
              </div>
            </Card>
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
              { t: "2026-06-15 10:24", title: "提交完整认证申请", desc: `企业完整认证 · ${PROVIDER_NAME}` },
              { t: "2026-05-20 16:42", title: "认证未通过", desc: "法人人脸核身失败 · 已重新提交" },
              { t: "2026-05-18 09:15", title: "上传企业资料", desc: "营业执照 · 统一社会信用代码" },
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
              <ExternalLink className="h-4 w-4" /> 跳转至 {PROVIDER_NAME}
            </DialogTitle>
            <DialogDescription>
              请使用 {PROVIDER_NAME} 扫码完成实人核验，完成后系统将自动接收回调结果
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
