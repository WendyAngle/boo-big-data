import { Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  chargeView,
  isRevealed,
  setRevealed,
  useRevealed,
  revealKey,
  maskEmail,
  maskPhone,
  maskHandle,
  maskAddress,
  maskTitle,
  maskSeniority,
  type TargetKind,
  type ViewField,
  COST_VIEW,
} from "@/lib/credits-ledger";

interface Props {
  targetKind: TargetKind;
  targetId: string;
  targetName: string;
  parentRef?: { id: string; name: string };
  field: ViewField;
  value: string;
  subKey?: string; // e.g. social platform name
  className?: string;
  mono?: boolean;
}

function maskFor(field: ViewField, value: string) {
  switch (field) {
    case "email":
      return maskEmail(value);
    case "phone":
      return maskPhone(value);
    case "social":
      return maskHandle(value);
    case "address":
      return maskAddress(value);
    case "title":
      return maskTitle(value);
    case "seniority":
      return maskSeniority(value);
  }
}

export function MaskedField({
  targetKind,
  targetId,
  targetName,
  parentRef,
  field,
  value,
  subKey,
  className,
  mono = false,
}: Props) {
  // 职位信息与详细地址按产品要求始终明文展示,不消耗积分
  if (field === "title" || field === "address") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <span className={cn("select-text", mono && "font-mono tabular-nums text-xs")}>
          {value}
        </span>
      </span>
    );
  }
  const key = revealKey(targetKind, targetId, field, subKey);
  const revealed = useRevealed(key);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (revealed) {
      setRevealed(key, false);
      return;
    }
    // first reveal — charge once per session per key
    if (!isRevealed(key)) {
      chargeView({
        targetKind,
        targetId,
        targetName,
        parentRef,
        field,
        detail: value,
      });
      toast.success(`已扣除 ${COST_VIEW} 积分，可在账单查看`, {
        description: `查看了 ${targetName} 的${
          {
            email: "邮箱",
            phone: "电话",
            social: "社媒账号",
            address: "详细地址",
            title: "职位信息",
            seniority: "职级信息",
          }[field]
        }`,
      });
    }
    setRevealed(key, true);
  };

  const display = revealed ? value : maskFor(field, value);
  const tip = revealed
    ? "点击收起为密文"
    : `查看将消耗 ${COST_VIEW} 积分哦，确认请点击`;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "select-text",
          mono && "font-mono tabular-nums text-xs",
          !revealed && "tracking-wider",
        )}
      >
        {display}
      </span>
      <TooltipProvider delayDuration={80}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onClick}
              aria-label={tip}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
                revealed
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-primary",
              )}
            >
              {revealed ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{tip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}