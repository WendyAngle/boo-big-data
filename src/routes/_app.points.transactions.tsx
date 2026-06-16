import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/points/transactions")({
  head: () => ({ meta: [{ title: "积分管理系统 · 业务交易 | Boo数据平台" }] }),
  component: () => <Outlet />,
});

export const TransactionsIndexRedirect = () => <Navigate to="/points/transactions/points-ledger" />;