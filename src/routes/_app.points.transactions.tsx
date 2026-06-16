import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/_app/points/transactions")({
  head: () => ({ meta: [{ title: "积分管理系统 · 业务交易 | Boo数据平台" }] }),
  component: () => (
    <PagePlaceholder
      breadcrumb={["积分管理系统", "业务交易"]}
      title="业务交易"
      subtitle="该模块功能建设中，敬请期待"
    />
  ),
});