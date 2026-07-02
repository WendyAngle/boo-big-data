import { Mail, Phone, Share2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const RULES = [
  {
    tone: "sky" as const,
    icon: <Mail className="h-4 w-4" />,
    title: "查看邮箱",
    cost: 10,
    desc: "解锁联系人邮箱字段，已解锁后不再重复扣费。",
  },
  {
    tone: "violet" as const,
    icon: <Phone className="h-4 w-4" />,
    title: "查看电话",
    cost: 60,
    desc: "解锁联系人电话字段，已解锁后不再重复扣费。",
  },
  {
    tone: "emerald" as const,
    icon: <Share2 className="h-4 w-4" />,
    title: "查看社媒账号",
    cost: 30,
    desc: "解锁联系人社媒账号字段，已解锁后不再重复扣费。",
  },
];

export function RulesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/8 via-primary/4 to-transparent px-6 pt-6 pb-5 border-b">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                <Info className="h-4 w-4" />
              </span>
              积分规则说明
            </DialogTitle>
            <DialogDescription>
              以下业务操作将从积分余额中扣除相应积分，同一字段解锁后不再重复扣费。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-2.5">
          {RULES.map((r) => (
            <RuleCard key={r.title} {...r} />
          ))}
        </div>

        <div className="mx-6 mb-6 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
          积分仅用于功能解锁，不可提现。所有扣费流水可在账单列表中查询与复核。
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RuleCard({
  icon,
  title,
  cost,
  desc,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  cost: number;
  desc: string;
  tone: "sky" | "violet" | "emerald";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  } as const;
  return (
    <div className="group rounded-xl ring-1 ring-border p-3.5 hover:ring-primary/30 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex h-8 w-8 rounded-lg ring-1 items-center justify-center ${tones[tone]}`}>
          {icon}
        </span>
        <div className="font-medium text-sm">{title}</div>
        <span className="ml-auto inline-flex items-baseline gap-0.5 rounded-md bg-rose-50 text-rose-600 ring-1 ring-rose-200 px-2 py-0.5">
          <span className="text-[11px]">−</span>
          <span className="text-sm font-semibold tabular-nums">{cost}</span>
          <span className="text-[11px] ml-0.5">积分</span>
        </span>
      </div>
      <p className="mt-2 pl-[42px] text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}