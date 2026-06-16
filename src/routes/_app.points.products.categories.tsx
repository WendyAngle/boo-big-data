import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/_app/points/products/categories")({
  head: () => ({ meta: [{ title: "产品管理 · 产品分类 | Boo数据平台" }] }),
  component: () => (
    <PagePlaceholder
      breadcrumb={["积分管理系统", "产品管理", "产品分类"]}
      title="产品分类"
      subtitle="该模块功能建设中，敬请期待"
    />
  ),
});