import { Eye, Send, Undo2, Wallet, Info, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  COST_VIEW,
  COST_REACH_EMAIL,
  COST_REACH_SMS,
  COST_REACH_SOCIAL,
  COST_AI_EMAIL,
  COST_AI_SMS,
} from "@/lib/credits-ledger";

export function RulesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            积分规则说明
          </SheetTitle>
          <SheetDescription>
            积分用于解锁联系方式与发起触达，规则统一、明示且失败可退。
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          <RuleCard
            tone="sky"
            icon={<Eye className="h-4 w-4" />}
            title="信息查看"
            cost={`${COST_VIEW} 积分 / 字段`}
            desc="解锁邮箱、电话、社媒、地址、职位、资历等敏感字段。已解锁字段不再重复扣费。"
          />
          <RuleCard
            tone="violet"
            icon={<Send className="h-4 w-4" />}
            title="触达-发送内容消耗"
            cost={`邮件 ${COST_REACH_EMAIL} / 短信 ${COST_REACH_SMS} / 社媒 ${COST_REACH_SOCIAL} 积分`}
            desc="按渠道与目标人/企业逐次计费；短信按 70/140 字拆分为多条计费。"
          />
          <RuleCard
            tone="amber"
            icon={<Sparkles className="h-4 w-4" />}
            title="触达-AI生成内容消耗"
            cost={`邮件 ${COST_AI_EMAIL} / 短信 ${COST_AI_SMS} 积分 / 次`}
            desc="使用 AI 自动撰写邮件或短信文案时按次计费；生成失败不扣费，可重新生成。"
          />
          <RuleCard
            tone="emerald"
            icon={<Undo2 className="h-4 w-4" />}
            title="失败自动退还"
            cost="原路全额退还"
            desc="触达失败（如邮箱无效、号码空号、账号注销等）由系统自动检测并退还到积分余额。"
          />
          <RuleCard
            tone="primary"
            icon={<Wallet className="h-4 w-4" />}
            title="有效期"
            cost="365 天"
            desc="每次充值的积分自到账日起 365 天内有效；新一次充值将统一顺延已有余额的到期日。"
          />
        </div>

        <div className="mt-6 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
          积分仅用于功能解锁与触达调用，不可提现。账单中所有 + / − 流水可在「失败退还」筛选下复核。
        </div>
      </SheetContent>
    </Sheet>
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
  cost: string;
  desc: string;
  tone: "sky" | "violet" | "emerald" | "primary" | "amber";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    primary: "bg-primary/10 text-primary ring-primary/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
  } as const;
  return (
    <div className="rounded-xl ring-1 ring-border p-4">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-7 w-7 rounded-md ring-1 items-center justify-center ${tones[tone]}`}>
          {icon}
        </span>
        <div className="font-medium text-sm">{title}</div>
        <span className="ml-auto text-xs font-semibold tabular-nums">{cost}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}