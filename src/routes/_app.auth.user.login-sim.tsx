import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, Clock, XCircle, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_app/auth/user/login-sim")({
  head: () => ({ meta: [{ title: "登录模拟 · 用户端 | Boo数据平台" }] }),
  component: LoginSimPage,
});

type TenantType = "enterprise";
type AuthTiming = "first_login" | "sensitive";

const FAIL_REASON = "证件信息与权威库比对不一致";

function LoginSimPage() {
  const navigate = useNavigate();
  const [tenantType, setTenantType] = useState<TenantType>("enterprise");
  const [timing, setTiming] = useState<AuthTiming>("first_login");

  const goAuthPage = () => {
    navigate({ to: "/auth/user/enterprise" });
  };

  const handlePending = (currentScene: AuthTiming) => {
    // 触发认证的条件：
    // - 配置为「首次登录」：任意登录场景都会触发
    // - 配置为「使用敏感功能」：仅当用户操作敏感功能时触发
    const shouldTrigger =
      timing === "first_login" ? currentScene === "first_login" : currentScene === "sensitive";
    if (shouldTrigger) {
      toast.warning("您当前未进行认证，请先认证，待认证通过后继续使用系统");
      setTimeout(goAuthPage, 600);
    } else {
      toast.info("已进入系统（当前操作未触发认证时机）");
    }
  };

  const handleAuthing = () => {
    toast.info("您当前仍在认证中，待认证通过后继续使用系统");
    setTimeout(() => navigate({ to: "/" }), 1000);
  };

  const handleFailed = () => {
    toast.error(`非常抱歉，您当前认证未通过，原因：${FAIL_REASON}，请您核实认证资料重新进行认证`);
    setTimeout(goAuthPage, 800);
  };

  const handleSuccess = () => {
    toast.success("恭喜您已通过认证，请开始您的旅程");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            登录模拟
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            模拟不同认证状态的租户登录系统后的交互行为，用于功能演示与验收。
          </p>
        </div>
      </div>

      {/* 全局参数 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">模拟参数</CardTitle>
          <CardDescription>设置当前模拟的租户类型与管理端配置的认证触发时机</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>租户类型</Label>
            <Select value={tenantType} onValueChange={(v) => setTenantType(v as TenantType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enterprise">企业租户</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>管理端 · 认证时机</Label>
            <Select value={timing} onValueChange={(v) => setTiming(v as AuthTiming)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="first_login">首次登录</SelectItem>
                <SelectItem value="sensitive">使用敏感功能</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 四个状态卡片 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 待认证 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> 待认证
              </CardTitle>
              <Badge variant="outline" className="border-amber-500/50 text-amber-600">Pending</Badge>
            </div>
            <CardDescription>
              当前操作与管理端配置的认证时机匹配时，提示并跳转至企业实名认证页。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => handlePending("first_login")} variant="default" size="sm">
              模拟首次登录
            </Button>
            <Button onClick={() => handlePending("sensitive")} variant="secondary" size="sm">
              模拟使用敏感功能
            </Button>
          </CardContent>
        </Card>

        {/* 认证中 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" /> 认证中
              </CardTitle>
              <Badge variant="outline" className="border-blue-500/50 text-blue-600">Reviewing</Badge>
            </div>
            <CardDescription>提示用户认证审核中，随后退出登录返回首页。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAuthing} variant="default" size="sm">
              模拟登录
            </Button>
          </CardContent>
        </Card>

        {/* 认证失败 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" /> 认证失败
              </CardTitle>
              <Badge variant="destructive">Failed</Badge>
            </div>
            <CardDescription>
              提示失败原因并跳转至企业实名认证页重新认证。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFailed} variant="destructive" size="sm">
              模拟登录
            </Button>
          </CardContent>
        </Card>

        {/* 认证成功 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 认证成功
              </CardTitle>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">Passed</Badge>
            </div>
            <CardDescription>欢迎提示，正常进入系统。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSuccess} variant="default" size="sm">
              模拟登录
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="py-4 flex items-start gap-3 text-sm text-muted-foreground">
          <ShieldAlert className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div>
            说明：本页面用于模拟用户端登录后的认证拦截与提示逻辑。实际项目中将由登录接口返回的认证状态自动触发对应行为。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
