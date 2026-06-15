import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/_app/auth/admin")({
  head: () => ({ meta: [{ title: "实名认证 · 管理端 | Boo数据平台" }] }),
  component: () => (
    <PagePlaceholder
      breadcrumb={["实名认证", "管理端"]}
      title="实名认证 · 管理端"
      subtitle="管理员审核与认证流程配置"
    />
  ),
});