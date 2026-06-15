import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/_app/auth/user")({
  head: () => ({ meta: [{ title: "实名认证 · 用户端 | Boo数据平台" }] }),
  component: () => (
    <PagePlaceholder
      breadcrumb={["实名认证", "用户端"]}
      title="实名认证 · 用户端"
      subtitle="用户提交认证资料与查看状态"
    />
  ),
});