import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/_app/points/products")({
  head: () => ({ meta: [{ title: "积分管理系统 · 产品管理 | Boo数据平台" }] }),
  component: () => (
    <PagePlaceholder
      breadcrumb={["积分管理系统", "产品管理"]}
      title="产品管理"
      subtitle="该模块功能建设中，敬请期待"
    />
  ),
});