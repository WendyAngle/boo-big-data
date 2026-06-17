import { createFileRoute } from "@tanstack/react-router";
import { Star, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/outreach/favorites")({
  head: () => ({ meta: [{ title: "触达客户管理 · 收藏 | Boo数据平台" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>触达客户管理</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">收藏</span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">收藏</h1>
            <p className="text-white/85 text-sm mt-0.5">
              集中管理您收藏的企业、商品与提单，快速回到关注的目标
            </p>
          </div>
        </div>
      </section>

      <Card className="p-12 flex flex-col items-center justify-center text-center gap-3 border-dashed">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <Star className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-base font-medium">功能建设中</div>
        <div className="text-sm text-muted-foreground max-w-md">
          收藏模块将集中展示您标记的企业、商品与提单等内容，后续将补充完整功能。
        </div>
      </Card>
    </div>
  );
}