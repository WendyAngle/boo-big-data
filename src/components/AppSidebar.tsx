import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ShieldCheck, ChevronDown, LayoutDashboard } from "lucide-react";

const menu = [
  {
    label: "实名认证",
    icon: ShieldCheck,
    children: [
      { label: "管理端", to: "/auth/admin" },
      { label: "用户端", to: "/auth/user" },
    ],
  },
];

export function AppSidebar() {
  const { location } = useRouterState();
  const [open, setOpen] = useState<Record<string, boolean>>({ 实名认证: true });

  return (
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
          B
        </div>
        <span className="font-semibold text-sidebar-foreground tracking-wide">Boo数据平台</span>
      </div>
      <nav className="p-3 space-y-1 flex-1">
        {menu.map((item) => {
          const Icon = item.icon;
          const isOpen = open[item.label];
          return (
            <div key={item.label}>
              <button
                onClick={() => setOpen((s) => ({ ...s, [item.label]: !isOpen }))}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </button>
              {isOpen && (
                <div className="mt-1 ml-6 space-y-0.5 border-l border-sidebar-border pl-3">
                  {item.children.map((c) => {
                    const active = location.pathname === c.to;
                    return (
                      <Link
                        key={c.to}
                        to={c.to}
                        className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                        }`}
                      >
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-muted-foreground border-t border-sidebar-border flex items-center gap-2">
        <LayoutDashboard className="h-3.5 w-3.5" /> v1.0.0
      </div>
    </aside>
  );
}