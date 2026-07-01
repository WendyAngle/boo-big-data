import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/points/recharges")({
  head: () => ({ meta: [{ title: "积分管理系统 · 充值管理 | Boo数据平台" }] }),
  component: RechargesPage,
});

function RechargesPage() {
  return (
    <div className="p-6">
      <Card className="p-4">
        <Button
          asChild
          variant="outline"
          className="h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
        >
          <Link to="/outreach/recharge" search={{ from: "home" }}>
            <Plus className="h-4 w-4" />
            新增充值
          </Link>
        </Button>
      </Card>
    </div>
  );
}