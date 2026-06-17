import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Briefcase,
  MapPin,
  Linkedin,
  Facebook,
  Twitter,
  Globe,
  Users,
  Calendar,
  Mail,
  Phone,
  X as XIcon,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ListPagination } from "@/components/ListPagination";
import heroBg from "@/assets/enterprise-hero.jpg";

export const Route = createFileRoute("/_app/outreach/enterprise")({
  head: () => ({ meta: [{ title: "触达客户管理 · 企业 | Boo数据平台" }] }),
  component: OutreachEnterprisePage,
});

interface Enterprise {
  id: string;
  name: string;
  industry: string; // empty → 未提供行业
  country: string; // empty → 未提供国家
  est: string; // 成立年份, "-" 表示未提供
  employees: string;
  website: string;
  email: string;
  phone: string;
  desc: string;
  socials: { linkedin: boolean; facebook: boolean; twitter: boolean };
  createdAt: string;
}

const INDUSTRIES = [
  "higher education",
  "marketing and advertising",
  "information technology",
  "financial services",
  "manufacturing",
  "retail",
  "logistics",
  "healthcare",
];
const COUNTRIES = [
  "united states",
  "china",
  "japan",
  "germany",
  "united kingdom",
  "mexico",
  "singapore",
  "france",
];
const NAMES = [
  "Aurora Holdings",
  "Northwind Group",
  "Skyline Education",
  "BlueWave Logistics",
  "Helios Capital",
  "Greenfield Manufacturing",
  "Bright Future Media",
  "Crystal Retail",
  "Pioneer Robotics",
  "Summit Healthcare",
  "Quantum Labs",
  "Pacific Trading Co.",
  "Maple Leaf Foods",
  "Vertex Analytics",
  "Harbor Shipping",
  "Echo Marketing",
  "Stellar University",
  "Mosaic Studios",
  "Atlas Engineering",
  "Lighthouse Ventures",
];

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

const ALL: Enterprise[] = Array.from({ length: 60 }).map((_, i) => {
  // 约 35% 条目缺失行业 / 国家，模拟数据真实性
  const missingIndustry = i % 3 === 1;
  const missingCountry = i % 3 === 1 || i % 7 === 0;
  const missingEst = i % 4 === 1;
  const m = ((i * 11) % 12) + 1;
  const d = ((i * 7) % 27) + 1;
  const yy = 2018 + (i % 7);
  return {
    id: `E${String(2026000 + i + 1).padStart(7, "0")}`,
    name: `${NAMES[i % NAMES.length]}${i >= NAMES.length ? ` ${Math.floor(i / NAMES.length) + 1}` : ""}`,
    industry: missingIndustry ? "" : INDUSTRIES[i % INDUSTRIES.length],
    country: missingCountry ? "" : COUNTRIES[i % COUNTRIES.length],
    est: missingEst ? "-" : String(1831 + ((i * 17) % 190)),
    employees: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"][i % 6],
    website: `www.${NAMES[i % NAMES.length].toLowerCase().replace(/[^a-z]/g, "")}.com`,
    email: `contact@${NAMES[i % NAMES.length].toLowerCase().replace(/[^a-z]/g, "")}.com`,
    phone: `+1 (${200 + (i % 700)}) ${100 + (i % 800)}-${1000 + (i % 9000)}`,
    desc:
      "该企业是行业内具有代表性的服务型组织，业务覆盖产品研发、客户服务与品牌运营等多个领域，与平台已建立长期合作关系。",
    socials: {
      linkedin: i % 2 === 0,
      facebook: i % 3 !== 2,
      twitter: i % 2 === 1 || i % 5 === 0,
    },
    createdAt: `${yy}-${pad(m)}-${pad(d)}T00:00:00`,
  };
});

function OutreachEnterprisePage() {
  const [keyword, setKeyword] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [industry, setIndustry] = useState("all");
  const [country, setCountry] = useState("all");
  const [employees, setEmployees] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [viewing, setViewing] = useState<Enterprise | null>(null);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return ALL.filter((e) => {
      if (k && !e.name.toLowerCase().includes(k)) return false;
      if (industry !== "all" && e.industry !== industry) return false;
      if (country !== "all" && e.country !== country) return false;
      if (employees !== "all" && e.employees !== employees) return false;
      return true;
    });
  }, [keyword, industry, country, employees]);

  const total = filtered.length;
  const pageData = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page],
  );

  const resetFilters = () => {
    setIndustry("all");
    setCountry("all");
    setEmployees("all");
    setPage(1);
  };

  const activeFilterCount =
    (industry !== "all" ? 1 : 0) +
    (country !== "all" ? 1 : 0) +
    (employees !== "all" ? 1 : 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>触达客户管理</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">企业</span>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl ring-1 ring-border">
        <img
          src={heroBg}
          alt="企业"
          width={1920}
          height={512}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(184_70%_42%/0.92)] via-[hsl(184_60%_55%/0.55)] to-transparent" />
        <div className="relative px-8 py-10 flex items-center gap-5 text-white">
          <div className="h-14 w-14 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide">企业</h1>
            <p className="text-white/90 text-sm mt-1">
              管理触达客户企业库，支持按名称模糊检索与多维度高级筛选
            </p>
          </div>
        </div>
      </section>

      {/* Search bar */}
      <Card className="p-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="输入企业名称进行搜索..."
            className="pl-9 h-10 border-0 shadow-none focus-visible:ring-0 bg-transparent"
          />
        </div>
        <Button
          onClick={() => setAdvancedOpen((s) => !s)}
          className="gap-1.5 h-10 px-4"
          variant={advancedOpen ? "secondary" : "default"}
        >
          <SlidersHorizontal className="h-4 w-4" />
          高级搜索
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 px-1.5 bg-white text-primary"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </Card>

      {advancedOpen && (
        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">行业</Label>
              <Select
                value={industry}
                onValueChange={(v) => {
                  setIndustry(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部行业</SelectItem>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">国家 / 地区</Label>
              <Select
                value={country}
                onValueChange={(v) => {
                  setCountry(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部国家 / 地区</SelectItem>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">员工规模</Label>
              <Select
                value={employees}
                onValueChange={(v) => {
                  setEmployees(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部规模</SelectItem>
                  {["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].map(
                    (e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={resetFilters} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              重置筛选
            </Button>
          </div>
        </Card>
      )}

      {/* Result count */}
      <div className="text-sm text-muted-foreground">
        共找到 <span className="font-semibold text-foreground">{total}</span> 家企业
      </div>

      {/* Grid */}
      {pageData.length === 0 ? (
        <Card className="p-16 text-center text-muted-foreground">
          没有符合条件的企业
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pageData.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setViewing(e)}
              className="group text-left"
            >
              <Card className="p-5 h-full ring-1 ring-border hover:ring-primary/40 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {e.name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4 shrink-0" />
                    <span className={`truncate ${!e.industry ? "italic" : ""}`}>
                      {e.industry || "未提供行业"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className={`flex-1 truncate ${!e.country ? "italic" : ""}`}>
                      {e.country || "未提供国家"}
                    </span>
                    <span className="font-medium text-foreground/80 tabular-nums whitespace-nowrap">
                      est. {e.est}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                  <SocialBadge active={e.socials.linkedin} kind="linkedin" />
                  <SocialBadge active={e.socials.facebook} kind="facebook" />
                  <SocialBadge active={e.socials.twitter} kind="twitter" />
                  <span className="ml-1 font-mono tabular-nums truncate">
                    {e.createdAt}
                  </span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <ListPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />

      {/* Detail dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          {viewing && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg truncate">
                      {viewing.name}
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs mt-1">
                      {viewing.id}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow icon={<Briefcase className="h-4 w-4" />} label="行业">
                  {viewing.industry || (
                    <span className="italic text-muted-foreground">未提供</span>
                  )}
                </InfoRow>
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="国家 / 地区">
                  {viewing.country || (
                    <span className="italic text-muted-foreground">未提供</span>
                  )}
                </InfoRow>
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="成立年份">
                  {viewing.est}
                </InfoRow>
                <InfoRow icon={<Users className="h-4 w-4" />} label="员工规模">
                  {viewing.employees}
                </InfoRow>
                <InfoRow icon={<Globe className="h-4 w-4" />} label="官网">
                  <span className="text-primary">{viewing.website}</span>
                </InfoRow>
                <InfoRow icon={<Mail className="h-4 w-4" />} label="邮箱">
                  {viewing.email}
                </InfoRow>
                <InfoRow icon={<Phone className="h-4 w-4" />} label="电话">
                  <span className="font-mono">{viewing.phone}</span>
                </InfoRow>
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="创建时间">
                  <span className="font-mono">{viewing.createdAt}</span>
                </InfoRow>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">企业简介</Label>
                <p className="mt-1.5 text-sm text-foreground/80 leading-relaxed">
                  {viewing.desc}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">社交账号</Label>
                <div className="mt-1.5 flex gap-2">
                  <SocialBadge active={viewing.socials.linkedin} kind="linkedin" large />
                  <SocialBadge active={viewing.socials.facebook} kind="facebook" large />
                  <SocialBadge active={viewing.socials.twitter} kind="twitter" large />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewing(null)} className="gap-1.5">
                  <XIcon className="h-4 w-4" />
                  关闭
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-medium truncate">{children}</div>
    </div>
  );
}

function SocialBadge({
  active,
  kind,
  large,
}: {
  active: boolean;
  kind: "linkedin" | "facebook" | "twitter";
  large?: boolean;
}) {
  const Icon =
    kind === "linkedin" ? Linkedin : kind === "facebook" ? Facebook : Twitter;
  const color =
    kind === "linkedin"
      ? "bg-[#0a66c2] text-white"
      : kind === "facebook"
        ? "bg-[#1877f2] text-white"
        : "bg-foreground text-background";
  const size = large ? "h-9 w-9 rounded-lg" : "h-6 w-6 rounded";
  const iconSize = large ? "h-4 w-4" : "h-3 w-3";
  return (
    <span
      className={`inline-flex items-center justify-center ${size} ${
        active ? color : "bg-muted text-muted-foreground/60"
      }`}
      aria-label={kind}
    >
      <Icon className={iconSize} />
    </span>
  );
}