import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/_app/points/products/recharge")({
  head: () => ({ meta: [{ title: "产品管理 · 充值产品 | Boo数据平台" }] }),
  component: () => (
    <PagePlaceholder
      breadcrumb={["积分管理系统", "产品管理", "充值产品"]}
      title="充值产品"
      subtitle="该模块功能建设中，敬请期待"
    />
  ),
});