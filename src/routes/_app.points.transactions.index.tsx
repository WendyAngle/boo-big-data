import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/points/transactions/")({
  component: () => <Navigate to="/points/transactions/points-ledger" />,
});