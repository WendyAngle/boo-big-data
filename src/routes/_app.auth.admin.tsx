import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/auth/admin")({
  head: () => ({ meta: [{ title: "实名认证 · 管理端 | Boo数据平台" }] }),
  component: () => <Outlet />,
});