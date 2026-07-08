import { useSyncExternalStore } from "react";

export type SmsTplStatus = "approved" | "pending" | "rejected";
export type SmsTplChannel = "marketing" | "otp" | "notification";

export interface SmsTemplate {
  id: string;
  name: string;
  channel: SmsTplChannel;
  locale: string;
  content: string;
  status: SmsTplStatus;
  updatedAt: string;
  submittedBy: string;
  reviewer?: string;
  rejectReason?: string;
}

const KEY = "boo:sms-templates:v1";

const SEED: SmsTemplate[] = [
  {
    id: "t1",
    name: "首触 · 产品介绍 EN",
    channel: "marketing",
    locale: "en-US",
    content:
      "Hi {{联系人名}}, this is {{我的姓名}} from {{我的公司}}. We help {{行业}} companies cut sourcing cost by 20%. Interested in a 15-min chat? Reply STOP to opt out.",
    status: "approved",
    updatedAt: "2026-07-01",
    submittedBy: "李经理",
    reviewer: "合规组",
  },
  {
    id: "t2",
    name: "跟进 · 报价请求 中文",
    channel: "marketing",
    locale: "zh-CN",
    content:
      "{{联系人名}}您好，我是{{我的公司}}的{{我的姓名}}。上次沟通提到的报价已整理好，可否留个邮箱？回复T退订。",
    status: "approved",
    updatedAt: "2026-07-02",
    submittedBy: "王销售",
    reviewer: "合规组",
  },
  {
    id: "t3",
    name: "通知 · 订单发货",
    channel: "notification",
    locale: "zh-CN",
    content: "您的订单已发货，物流单号：{{运单号}}，预计近期送达。",
    status: "approved",
    updatedAt: "2026-06-20",
    submittedBy: "系统",
    reviewer: "合规组",
  },
  {
    id: "t4",
    name: "验证码 · 登录",
    channel: "otp",
    locale: "multi",
    content: "【Boo】您的验证码是 {{code}}，5 分钟内有效，请勿泄露。",
    status: "approved",
    updatedAt: "2026-06-10",
    submittedBy: "系统",
    reviewer: "合规组",
  },
  {
    id: "t5",
    name: "促销 · 618 大促",
    channel: "marketing",
    locale: "zh-CN",
    content: "{{联系人名}}亲，618 全场 5 折起，速抢！回复 TD 退订。",
    status: "pending",
    updatedAt: "2026-07-06",
    submittedBy: "运营组",
  },
  {
    id: "t6",
    name: "催单 · 未回复",
    channel: "marketing",
    locale: "en-US",
    content:
      "Hey {{联系人名}}, just checking in on my last email — worth a quick call? --{{我的姓名}}",
    status: "rejected",
    updatedAt: "2026-07-05",
    submittedBy: "张销售",
    reviewer: "合规组",
    rejectReason: "缺少退订说明（STOP/退订字样）",
  },
];

function read(): SmsTemplate[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j as SmsTemplate[];
    }
  } catch {}
  window.localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
}
function write(list: SmsTemplate[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

let store: SmsTemplate[] = read();
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getVersion = () => version;

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      store = read();
      emit();
    }
  });
}

export function useSmsTemplates(): SmsTemplate[] {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return store;
}

export function getApprovedSmsTemplates(): SmsTemplate[] {
  return store.filter((t) => t.status === "approved");
}

export function addSmsTemplate(
  t: Omit<SmsTemplate, "id" | "status" | "updatedAt" | "submittedBy">,
) {
  const rec: SmsTemplate = {
    ...t,
    id: `t_${Date.now().toString(36)}`,
    status: "pending",
    updatedAt: new Date().toISOString().slice(0, 10),
    submittedBy: "我",
  };
  store = [rec, ...store];
  write(store);
  emit();
}

/** 把模板 {{变量}} 语法转换为撰写框使用的 {变量} 语法 */
export function toComposeSyntax(tpl: string): string {
  return tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, "{$1}");
}