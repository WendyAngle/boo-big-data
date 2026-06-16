import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ShieldCheck, ChevronDown, LayoutDashboard, Users, Building2, ClipboardCheck, UserCog, Coins, LogIn, Send, Package, Receipt } from "lucide-react";

type Leaf = { label: string; to: string; icon?: typeof Users };
type Group = { label: string; to?: string; children: Leaf[] };
type Root = { label: string; icon: typeof ShieldCheck; children: Group[] };

const menu: Root[] = [
  {
    label: "实名认证",
    icon: ShieldCheck,
    children: [
      {
        label: "管理端",
        to: "/auth/admin",
        children: [
          { label: "租户管理", to: "/auth/admin/tenants", icon: Users },
          { label: "用户管理", to: "/auth/admin/users", icon: UserCog },
          { label: "实名审核", to: "/auth/admin/audit", icon: ClipboardCheck },
        ],
      },
      {
        label: "用户端",
        to: "/auth/user",
        children: [
          { label: "企业实名认证", to: "/auth/user/enterprise", icon: Building2 },
          { label: "用户管理", to: "/auth/user/users", icon: UserCog },
          { label: "登录模拟", to: "/auth/user/login-sim", icon: LogIn },
        ],
      },
    ],
  },
  {
    label: "积分管理系统",
    icon: Coins,
    children: [
      {
        label: "产品管理",
        to: "/points/products",
        children: [],
      },
      {
        label: "租户管理",
        to: "/points/tenants",
        children: [],
      },
      {
        label: "业务交易",
        to: "/points/transactions",
        children: [],
      },
    ],
  },
  {
    label: "触达客户管理",
    icon: Send,
    children: [
      {
        label: "功能建设中",
        to: "/outreach",
        children: [],
      },
    ],
  },
];

export function AppSidebar() {
  const { location } = useRouterState();
  const [open, setOpen] = useState<Record<string, boolean>>({
    实名认证: true,
    管理端: true,
  });

  return (
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
          B
        </div>
        <span className="font-semibold text-sidebar-foreground tracking-wide">Boo数据平台</span>
      </div>
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
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
                  {item.children.map((g) => {
                    const hasKids = g.children.length > 0;
                    const gOpen = open[g.label] ?? true;
                    const gActive = g.to ? location.pathname === g.to : false;
                    return (
                      <div key={g.label}>
                        {g.to ? (
                          <div className="flex items-center">
                            <Link
                              to={g.to}
                              className={`flex-1 block px-3 py-1.5 rounded-md text-sm transition-colors ${
                                gActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                              }`}
                            >
                              {g.label}
                            </Link>
                            {hasKids && (
                              <button
                                onClick={() => setOpen((s) => ({ ...s, [g.label]: !gOpen }))}
                                className="p-1 rounded hover:bg-sidebar-accent/60"
                                aria-label="toggle"
                              >
                                <ChevronDown
                                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                                    gOpen ? "" : "-rotate-90"
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setOpen((s) => ({ ...s, [g.label]: !gOpen }))}
                            className="w-full flex items-center px-3 py-1.5 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                          >
                            <span className="flex-1 text-left">{g.label}</span>
                            {hasKids && (
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${gOpen ? "" : "-rotate-90"}`}
                              />
                            )}
                          </button>
                        )}
                        {hasKids && gOpen && (
                          <div className="mt-0.5 ml-4 space-y-0.5 border-l border-sidebar-border pl-3">
                            {g.children.map((c) => {
                              const CI = c.icon;
                              const active = location.pathname === c.to;
                              return (
                                <Link
                                  key={c.to}
                                  to={c.to}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                    active
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                                  }`}
                                >
                                  {CI && <CI className="h-3.5 w-3.5" />}
                                  <span>{c.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
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