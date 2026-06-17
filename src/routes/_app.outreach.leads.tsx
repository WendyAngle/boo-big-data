import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_app/outreach/leads")({
  head: () => ({
    meta: [
      { title: "线索 | Boo数据平台" },
      { name: "description", content: "线索模块（功能建设中）" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          线索
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          线索模块，用于沉淀来自各渠道的潜在商机与跟进任务。
        </p>
      </div>

      <Card className="relative overflow-hidden border-dashed">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, hsl(var(--primary)) 0%, transparent 40%), radial-gradient(circle at 70% 80%, hsl(var(--accent)) 0%, transparent 40%)",
          }}
        />
        <div className="relative px-6 py-20 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">功能建设中</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            「线索」模块正在规划中，后续将补充线索获取、分配、跟进与转化等能力。
          </p>
          <Badge variant="secondary" className="mt-5 text-[10px]">COMING SOON</Badge>
        </div>
      </Card>
    </div>
  );
}