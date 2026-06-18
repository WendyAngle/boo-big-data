import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Boo数据平台" },
      { name: "description", content: "Boo数据平台 - 数据驱动业务增长" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="p-8 space-y-6">
      <section className="relative overflow-hidden rounded-2xl p-10 text-white" style={{ background: "var(--gradient-hero)" }}>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight">Boo数据平台</h1>
          <p className="mt-3 text-white/90 text-lg">从数据到决策，构建可信的业务底座</p>
        </div>
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-20 top-6 h-32 w-32 rounded-2xl bg-white/10 backdrop-blur-sm rotate-12" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link to="/outreach/users" className="group rounded-xl border bg-card p-6 hover:border-primary hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">出海大数据平台 · 我的员工</h3>
              <p className="text-sm text-muted-foreground">管理本企业的员工账号与登录状态</p>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}