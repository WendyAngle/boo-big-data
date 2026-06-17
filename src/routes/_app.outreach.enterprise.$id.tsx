import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Building2,
  ChevronRight,
  Briefcase,
  MapPin,
  Users,
  Calendar,
  Globe,
  Mail,
  Phone,
  Linkedin,
  Facebook,
  Twitter,
  ExternalLink,
  Anchor,
  FileText,
  Package,
  PackageSearch,
  ArrowLeftRight,
  Info,
  ArrowLeft,
  Hash,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { findEnterprise } from "@/data/enterprises";
import type { Enterprise } from "@/data/enterprises";
import heroBg from "@/assets/enterprise-hero.jpg";
import { FavoriteToggle } from "@/components/FavoriteToggle";

export const Route = createFileRoute("/_app/outreach/enterprise/$id")({
  head: ({ params }) => ({
    meta: [{ title: `企业详情 · ${params.id} | Boo数据平台` }],
  }),
  loader: ({ params }): { enterprise: Enterprise } => {
    const data = findEnterprise(params.id);
    if (!data) throw notFound();
    return { enterprise: data };
  },
  notFoundComponent: () => (
    <div className="p-8">
      <Card className="p-16 text-center text-muted-foreground">
        未找到该企业
      </Card>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8">
      <Card className="p-16 text-center text-muted-foreground">
        加载失败：{(error as Error).message}
      </Card>
    </div>
  ),
  component: EnterpriseDetailPage,
});

function EnterpriseDetailPage() {
  const { enterprise: e } = Route.useLoaderData() as { enterprise: Enterprise };
  return (
    <div className="p-8 space-y-6">
      {/* 面包屑 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>触达客户管理</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            to="/outreach/enterprise"
            className="hover:text-primary transition-colors"
          >
            企业
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[360px]">
            {e.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FavoriteToggle
            kind="enterprise"
            refId={e.id}
            payload={{
              title: e.name,
              subtitle: e.industry || undefined,
              meta: {
                country: e.country || "",
                role: e.tradeRole,
                est: e.est,
              },
            }}
            stopPropagation={false}
          />
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/outreach/enterprise">
              <ArrowLeft className="h-4 w-4" />
              返回企业列表
            </Link>
          </Button>
        </div>
      </div>

      {/* Hero */}
      <Hero e={e} />

      {/* 基本信息 */}
      <Section icon={<Info className="h-4 w-4" />} title="基本信息">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-5">
          <Field label="企业名称">{e.name}</Field>
          <Field label="所属行业">
            {e.industry || <Muted>未提供</Muted>}
          </Field>
          <Field label="员工规模">{e.employees}</Field>
          <Field label="成立年份">{e.est}</Field>
          <Field label="企业官网">
            <a
              href={`https://${e.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              {e.website}
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          </Field>
        </div>
        <div className="mt-5 pt-5 border-t grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">
          <Field label="联系邮箱">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {e.email}
            </span>
          </Field>
          <Field label="联系电话">
            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {e.phone}
            </span>
          </Field>
          <Field label="创建时间">
            <span className="font-mono tabular-nums">{e.createdAt}</span>
          </Field>
        </div>
        <div className="mt-5 pt-5 border-t">
          <div className="text-xs text-muted-foreground mb-2">企业简介</div>
          <p className="text-sm text-foreground/80 leading-relaxed">{e.desc}</p>
        </div>
      </Section>

      {/* 地址信息 */}
      <Section icon={<MapPin className="h-4 w-4" />} title="地址信息">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
          <Field label="详细地址" className="md:col-span-2 lg:col-span-4">
            {e.address}
          </Field>
          <Field label="国家">
            {e.country ? (
              <span>
                {e.country}{" "}
                <span className="text-muted-foreground">({e.countryCode})</span>
              </span>
            ) : (
              <Muted>未提供</Muted>
            )}
          </Field>
          <Field label="一级行政区">{e.province}</Field>
          <Field label="坐标 / 城市">{e.city}</Field>
          <Field label="社交账号">
            <div className="flex gap-1.5 mt-0.5">
              <SocialBadge active={e.socials.linkedin} kind="linkedin" />
              <SocialBadge active={e.socials.facebook} kind="facebook" />
              <SocialBadge active={e.socials.twitter} kind="twitter" />
            </div>
          </Field>
        </div>
      </Section>

      {/* 关联人物 */}
      <Section
        icon={<Users className="h-4 w-4" />}
        title="关联人物"
        subtitle={`联系人总数 ${e.contacts.length}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {e.contacts.map((c, idx) => (
            <div
              key={idx}
              id={`contact-${idx}`}
              className="rounded-lg border border-border bg-card hover:ring-1 hover:ring-primary/30 transition-shadow"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/70">
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-medium uppercase">
                  {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div className="font-medium flex-1 truncate">{c.name}</div>
                <FavoriteToggle
                  kind="contact"
                  refId={`${e.id}:${idx}`}
                  payload={{
                    title: c.name,
                    subtitle: c.title,
                    meta: { email: c.email, phone: c.phone || "" },
                    parentRef: { kind: "enterprise", id: e.id, name: e.name },
                  }}
                  variant="inline"
                  size="sm"
                />
              </div>
              <div className="px-4 py-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="truncate">{c.title}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate font-mono text-xs">{c.email}</span>
                </div>
                {c.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span className="truncate font-mono text-xs">{c.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 贸易关联 */}
      <Section icon={<FileText className="h-4 w-4" />} title="贸易关联">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            icon={<FileText className="h-7 w-7" />}
            label="累计提单"
            value={e.totalBills}
            unit="票"
          />
          <KpiCard
            icon={<PackageSearch className="h-7 w-7" />}
            label="累计货量"
            value={e.totalVolumeTon}
            unit="吨"
          />
          <KpiCard
            icon={<ArrowLeftRight className="h-7 w-7" />}
            label="贸易角色"
            value={e.tradeRole}
          />
        </div>

        {/* 关联提单企业 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm">
              <Anchor className="h-4 w-4 text-primary" />
              <span className="font-medium">关联提单企业</span>
              <span className="text-muted-foreground">（共 {e.bills.length} 家）</span>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-primary">
              <ExternalLink className="h-4 w-4" />
              出口提单
            </Button>
          </div>
          <div className="rounded-lg ring-1 ring-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">提单企业名</th>
                  <th className="text-left font-medium px-4 py-2.5">国家</th>
                  <th className="text-left font-medium px-4 py-2.5">角色</th>
                  <th className="text-right font-medium px-4 py-2.5">提单数</th>
                  <th className="text-left font-medium px-4 py-2.5">最近提单时间</th>
                  <th className="text-right font-medium px-4 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {e.bills.map((b, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-border/70 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2.5 font-medium">{b.partner}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {b.partnerCountry || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {b.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                      {b.count}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-muted-foreground">
                      {b.lastAt}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-primary h-auto py-1 px-2"
                      >
                        查看提单
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* HS 码 & 商品 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg ring-1 ring-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <Hash className="h-4 w-4 text-primary" />
              HS 码
              <span className="text-muted-foreground font-normal">
                ({e.hsCodes.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {e.hsCodes.map((hs) => (
                <Link
                  key={hs}
                  to="/outreach/products/$hs"
                  params={{ hs }}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted hover:bg-primary/10 hover:text-primary font-mono text-xs transition-colors"
                >
                  {hs}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-lg ring-1 ring-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <Package className="h-4 w-4 text-primary" />
              关联商品
              <span className="text-muted-foreground font-normal">
                ({e.products.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {e.products.length === 0 ? (
                <Muted>暂无关联商品</Muted>
              ) : (
                e.products.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs"
                  >
                    {p}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Hero({ e }: { e: Enterprise }) {
  return (
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-border">
      <img
        src={heroBg}
        alt={e.name}
        width={1920}
        height={360}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(184_70%_42%/0.95)] via-[hsl(184_60%_55%/0.55)] to-transparent" />
      <div className="relative px-8 py-7 flex items-start gap-5 text-white">
        <div className="h-16 w-16 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30 shrink-0">
          <Building2 className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-wide truncate">{e.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm">
              <Briefcase className="h-3.5 w-3.5" />
              {e.industry || "未提供行业"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm">
              <MapPin className="h-3.5 w-3.5" />
              {e.province}
              {e.country ? ` - ${e.country}` : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/95 text-emerald-700 text-sm font-medium">
              {e.tradeRole}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white/90 font-mono text-xs">
              <UserRound className="h-3 w-3" />
              {e.id}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white/90 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              est. {e.est}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 pb-4 mb-5 border-b border-border/70">
        <span className="text-primary">{icon}</span>
        <h2 className="text-base font-semibold text-primary">{title}</h2>
        {subtitle && (
          <span className="text-xs text-muted-foreground">（{subtitle}）</span>
        )}
      </div>
      {children}
    </Card>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-medium text-foreground break-all">
        {children}
      </div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="italic text-muted-foreground">{children}</span>;
}

function KpiCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: string;
}) {
  return (
    <div className="rounded-xl ring-1 ring-border bg-gradient-to-br from-primary/5 to-transparent p-5 flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function SocialBadge({
  active,
  kind,
}: {
  active: boolean;
  kind: "linkedin" | "facebook" | "twitter";
}) {
  const Icon =
    kind === "linkedin" ? Linkedin : kind === "facebook" ? Facebook : Twitter;
  const color =
    kind === "linkedin"
      ? "bg-[#0a66c2] text-white"
      : kind === "facebook"
        ? "bg-[#1877f2] text-white"
        : "bg-foreground text-background";
  return (
    <span
      className={`inline-flex items-center justify-center h-7 w-7 rounded-md ${
        active ? color : "bg-muted text-muted-foreground/60"
      }`}
      aria-label={kind}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}