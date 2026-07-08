import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Building2, UserRound, Clock, ShieldAlert, UserCheck, Inbox, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  TEAM_MEMBERS,
  GROUP_LABEL,
  useThreads,
  threadGroup,
  assignThread,
  type GroupKind,
  type TeamMember,
} from "@/lib/inbox-store";

export const Route = createFileRoute("/_app/outreach/admin/inquiry-dispatch")({
  head: () => ({ meta: [{ title: "询盘分派 | Boo数据平台" }] }),
  component: InboxRoutingAdmin,
});

interface GroupConfig {
  kind: GroupKind;
  slaFirstResponseMin: number;
  slaReplyHour: number;
  members: TeamMember[];
}

function InboxRoutingAdmin() {
  const threads = useThreads();
  // 每个分组的 pending 批量分配目标
  const [batchAssignee, setBatchAssignee] = useState<Record<GroupKind, string>>({
    enterprise: "",
    contact: "",
  });
  const [selected, setSelected] = useState<Record<GroupKind, Set<string>>>({
    enterprise: new Set(),
    contact: new Set(),
  });
  const [config, setConfig] = useState<GroupConfig[]>(() => [
    {
      kind: "enterprise",
      slaFirstResponseMin: 30,
      slaReplyHour: 8,
      members: TEAM_MEMBERS.filter((m) => m.groups.includes("enterprise")),
    },
    {
      kind: "contact",
      slaFirstResponseMin: 20,
      slaReplyHour: 4,
      members: TEAM_MEMBERS.filter((m) => m.groups.includes("contact")),
    },
  ]);

  const workload = useMemo(() => {
    const m = new Map<string, { assigned: number; unread: number }>();
    for (const t of threads) {
      if (!t.meta.assigneeId) continue;
      const w = m.get(t.meta.assigneeId) ?? { assigned: 0, unread: 0 };
      w.assigned++;
      if (t.meta.unread > 0) w.unread++;
      m.set(t.meta.assigneeId, w);
    }
    return m;
  }, [threads]);

  const poolByGroup: Record<GroupKind, number> = useMemo(() => {
    const acc: Record<GroupKind, number> = { enterprise: 0, contact: 0 };
    for (const t of threads) {
      if (!t.meta.assigneeId) acc[threadGroup(t)]++;
    }
    return acc;
  }, [threads]);

  const unassignedByGroup = useMemo(() => {
    const acc: Record<GroupKind, typeof threads> = { enterprise: [], contact: [] };
    for (const t of threads) {
      if (!t.meta.assigneeId) acc[threadGroup(t)].push(t);
    }
    return acc;
  }, [threads]);

  function updateSla(kind: GroupKind, patch: Partial<GroupConfig>) {
    setConfig((prev) =>
      prev.map((g) => (g.kind === kind ? { ...g, ...patch } : g)),
    );
  }

  function toggleOne(kind: GroupKind, id: string, v: boolean) {
    setSelected((prev) => {
      const next = new Set(prev[kind]);
      if (v) next.add(id);
      else next.delete(id);
      return { ...prev, [kind]: next };
    });
  }
  function toggleAll(kind: GroupKind, ids: string[], v: boolean) {
    setSelected((prev) => ({
      ...prev,
      [kind]: v ? new Set(ids) : new Set(),
    }));
  }
  function doBatchAssign(kind: GroupKind) {
    const userId = batchAssignee[kind];
    const ids = Array.from(selected[kind]);
    if (!userId) {
      toast.error("请选择要分配的成员");
      return;
    }
    if (ids.length === 0) {
      toast.error("请先勾选要分配的会话");
      return;
    }
    ids.forEach((id) =>
      assignThread(id, userId, { reason: "管理后台批量派单" }),
    );
    toast.success(`已将 ${ids.length} 条会话分配给该成员`);
    setSelected((prev) => ({ ...prev, [kind]: new Set() }));
  }
  function doAssignOne(id: string, userId: string) {
    assignThread(id, userId, { reason: "管理后台单条分配" });
    toast.success("已分配");
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold">询盘分派</h1>
        <p className="text-sm text-muted-foreground mt-1">
          按目标类型内置两个分组：企业分组、人物分组。全部会话人工分配，不做自动派单。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.map((g) => (
          <Card key={g.kind} className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              {g.kind === "enterprise" ? (
                <Building2 className="h-5 w-5 text-primary" />
              ) : (
                <UserRound className="h-5 w-5 text-primary" />
              )}
              <div className="font-semibold">{GROUP_LABEL[g.kind]}</div>
              <Badge variant="outline" className="ml-auto">
                池中未分配：{poolByGroup[g.kind]}
              </Badge>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" /> SLA
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs space-y-1 block">
                  <span className="text-muted-foreground">首次响应 (分钟)</span>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      value={g.slaFirstResponseMin}
                      onChange={(e) =>
                        updateSla(g.kind, {
                          slaFirstResponseMin: Number(e.target.value) || 0,
                        })
                      }
                      className="h-8 pr-12 tabular-nums"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                      分钟
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-0.5">
                    当前生效：{formatMin(g.slaFirstResponseMin)}
                  </div>
                </label>
                <label className="text-xs space-y-1 block">
                  <span className="text-muted-foreground">每次回复 (小时)</span>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      value={g.slaReplyHour}
                      onChange={(e) =>
                        updateSla(g.kind, {
                          slaReplyHour: Number(e.target.value) || 0,
                        })
                      }
                      className="h-8 pr-12 tabular-nums"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                      小时
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-0.5">
                    当前生效：{formatHour(g.slaReplyHour)}
                  </div>
                </label>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground flex items-start gap-1">
                <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                未分配阶段的 SLA 挂在分组池，超时提醒组长派单；已分配后转由该员工负责。
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" /> 成员（{g.members.length}）
              </div>
              <div className="space-y-1.5">
                {g.members.map((m) => {
                  const w = workload.get(m.id);
                  const assigned = w?.assigned ?? 0;
                  const loadTone =
                    assigned >= 20
                      ? "text-rose-600"
                      : assigned >= 10
                        ? "text-amber-600"
                        : "text-muted-foreground";
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 text-sm border rounded-md px-2.5 py-1.5"
                    >
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                        {m.avatarLetter}
                      </span>
                      <span className="font-medium">{m.name}</span>
                      {m.role === "lead" && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          组长
                        </Badge>
                      )}
                      <span className={`ml-auto text-xs font-medium tabular-nums ${loadTone}`}>
                        在办 {assigned}
                        {w && w.unread > 0 && (
                          <span className="ml-2 text-rose-600">
                            未读 {w.unread}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground">
                成员列表复用系统员工，编辑请前往「员工管理」。负载 ≥10 橙色 / ≥20 红色。
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* IR-02 · 会话分配入口：未分配会话池 + 单条/批量派单 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(unassignedByGroup) as GroupKind[]).map((kind) => {
          const rows = unassignedByGroup[kind];
          const groupMembers = TEAM_MEMBERS.filter((m) => m.groups.includes(kind));
          const sel = selected[kind];
          const allChecked = rows.length > 0 && rows.every((r) => sel.has(r.id));
          const someChecked = rows.some((r) => sel.has(r.id));
          return (
            <Card key={kind} className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-primary" />
                <div className="font-semibold">
                  {GROUP_LABEL[kind]} · 未分配会话池
                </div>
                <Badge variant="outline" className="ml-auto">
                  {rows.length} 条待派单
                </Badge>
              </div>

              {/* 批量派单工具条 */}
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
                <span className="text-xs text-muted-foreground">
                  已选 <span className="text-foreground font-medium">{sel.size}</span> / {rows.length}
                </span>
                <div className="flex-1 min-w-[160px]">
                  <Select
                    value={batchAssignee[kind]}
                    onValueChange={(v) => setBatchAssignee((p) => ({ ...p, [kind]: v }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="选择要分配的成员" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                          {m.role === "lead" ? "（组长）" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  className="h-8"
                  disabled={sel.size === 0 || !batchAssignee[kind]}
                  onClick={() => doBatchAssign(kind)}
                >
                  <Send className="h-3.5 w-3.5" />
                  批量派单
                </Button>
              </div>

              {/* 待派单列表 */}
              <div className="border rounded-md divide-y max-h-80 overflow-auto">
                {rows.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-8 text-center">
                    暂无待分配会话
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/40 text-[11px] text-muted-foreground">
                      <Checkbox
                        checked={allChecked ? true : someChecked ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleAll(kind, rows.map((r) => r.id), v === true)}
                        aria-label="全选"
                      />
                      <span>会话</span>
                      <span className="ml-auto pr-1">快速分配</span>
                    </div>
                    {rows.slice(0, 30).map((t) => (
                      <div key={t.id} className="flex items-center gap-2 px-2 py-2">
                        <Checkbox
                          checked={sel.has(t.id)}
                          onCheckedChange={(v) => toggleOne(kind, t.id, v === true)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">
                            {t.targetName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {t.counterpartyAddress || t.lastPreview}
                          </div>
                        </div>
                        <Select onValueChange={(v) => doAssignOne(t.id, v)}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue placeholder="分配给…" />
                          </SelectTrigger>
                          <SelectContent>
                            {groupMembers.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {rows.length > 30 && (
                      <div className="text-[11px] text-muted-foreground text-center py-2">
                        仅显示前 30 条，其余请在收件箱中处理
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatMin(v: number) {
  if (!v) return "—";
  if (v < 60) return `${v} 分钟`;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`;
}
function formatHour(v: number) {
  if (!v) return "—";
  if (v < 24) return `${v} 小时`;
  const d = Math.floor(v / 24);
  const h = v % 24;
  return h === 0 ? `${d} 天` : `${d} 天 ${h} 小时`;
}