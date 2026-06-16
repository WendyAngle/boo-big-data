import { createFileRoute } from "@tanstack/react-router";
import { VerificationFlow } from "@/components/VerificationFlow";

export const Route = createFileRoute("/_app/auth/user/enterprise")({
  head: () => ({ meta: [{ title: "企业实名认证 · 用户端 | Boo数据平台" }] }),
  component: () => <VerificationFlow />,
});