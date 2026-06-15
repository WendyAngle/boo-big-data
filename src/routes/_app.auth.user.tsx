import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/auth/user")({
  head: () => ({ meta: [{ title: "实名认证 · 用户端 | Boo数据平台" }] }),
  component: () => <Outlet />,
});