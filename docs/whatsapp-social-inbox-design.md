# WhatsApp / 社媒触达 · 结果跟进与团队协同 设计方案 v1

> 关联文档：`docs/sms-outreach-design.md`（如无则可后续补齐）  
> 目标读者：产品、前端、后端、合规  
> 范围：WhatsApp Business Cloud、LinkedIn / Facebook / Instagram / X 私信、
> TikTok 商家消息，以及既有的邮件、短信统一收件箱升级。

---

## 一、问题与目标

### 现状盘点

1. **触达渠道正在多元化**：邮件、短信已上线；WhatsApp、LinkedIn、Facebook、
   Instagram、TikTok、X 属于外贸/跨境获客的主战场，客户经常在这些渠道回复而
   非邮箱。
2. **收件箱 `/outreach/inbox` 缺失关键能力**：
   - 只区分了邮件 / 短信两种 channel，未覆盖 WhatsApp 与社媒；
   - 会话没有"分组"概念，无法按团队 / 地区 / 产品线切分；
   - 有 `assignee` 字段但**没有分配 UI**、没有分配规则、没有权责流转记录；
   - 无 SLA / 未读 / 提及提醒；
   - 与"触达任务 `/outreach/reach`"关系断裂：发出去的消息与回来的消息在两个地方。
3. **合规差异被忽略**：WhatsApp 24 小时窗口、模板消息、opt-in；LinkedIn/Meta
   平台的自动化限制。目前所有渠道当作邮件一样对待。

### 设计目标

- **一个收件箱统管所有渠道**：邮件 / 短信 / WhatsApp / 社媒 → 客户视角的
  "统一会话"，销售不用切工具。
- **触达结果与回复形成闭环**：`reach → reply → next action → CRM 阶段` 全链路
  可追踪，AI 参与"跟进推荐"。
- **分组与分配可运营**：按团队/区域/产品/来源分组，支持规则自动分配和手动
  转派；SLA 与工作量看板。
- **合规内建**：WhatsApp 24h 窗口检测、模板选择、opt-in/opt-out；社媒平台
  API 限流与非自动化行为提示。

---

## 二、渠道能力矩阵（决定 UI 与后端差异）

| 渠道 | 主动发起 | 回复接收 | 会话窗口 | 模板消息 | 富媒体 | 自动化限制 |
|---|---|---|---|---|---|---|
| Email | 随时 | Webhook / IMAP | 无 | 无 | 附件、HTML | 反垃圾评分 |
| SMS | 需预审模板 | MO 回调 | 无 | 强制 | 无（长文分段） | STOP / A2P 10DLC |
| **WhatsApp** | 需 **HSM 模板** | Webhook | **24h 客服窗口** | **强制**（窗口外） | 图/视/文档/位置 | Meta 质量评级、封号 |
| LinkedIn | InMail / 会话 | Webhook（企业版） | 无强制窗口 | 无 | 图 | 每日邀请数 100/周 |
| Facebook Messenger | 需 24h+标签 | Webhook | **24h + 消息标签** | 无 | 图/视 | 只能被动开启 |
| Instagram DM | 需先关注/被 mention | Webhook | **24h** | 无 | 图/视 | 需商业账号 |
| TikTok 商家消息 | 商店内触发 | Webhook | **48h** | 无 | 图 | 仅商店客户 |
| X（Twitter）DM | 双向关注 | Webhook | 无 | 无 | 图 | 每日 500 条 |

**关键约束**：WhatsApp 与 Meta 系有"客服窗口"概念——客户回复后 24h 内可自由
发文本；窗口外必须发**预审模板**（HSM），否则消息不投递且计费不同。这需要
成为收件箱一等公民（在输入框显式提醒）。

---

## 三、信息架构（三层模型）

```text
Contact（联系人 · 企业+人）
  └── Conversation（会话，1 位联系人 × 1 个渠道账号）
        └── Message（消息，含方向 in/out、模板 id、附件、状态）
```

跨渠道**同一联系人**（邮箱、手机号、WA、LinkedIn 匹配到同一 `contact_id`）
在会话列表里可折叠为 "客户视图"，展开后按渠道 tab 分别查看，避免"同一人回三次
被当三个客户跟"的老问题。

### 分组（Group）与分配（Assignee）

```text
Group（团队/分组）           Assignment（分配规则）
  ├─ 北美事业部              ├─ 触发时机：新会话入库
  │   ├─ 员工 A（组长）      ├─ 匹配条件：渠道+地区+产品+来源+关键词
  │   ├─ 员工 B             ├─ 分配方式：轮询 / 负载最小 / 指定组长 / 固定人
  │   └─ 员工 C             └─ 兜底：未匹配 → 默认组 → 组长手动派单
  ├─ 欧洲事业部
  └─ 东南亚事业部
```

- **分组维度可组合**：地区（US/EU/APAC）× 产品线（Robot/Logistics/Energy）×
  来源（WhatsApp / LinkedIn / 展会）。一个员工可属于多个分组。
- **权限**：员工只能看到自己或所在分组的会话；组长可查看全组；管理员全见。
- **分配可自动可手动**：
  - 自动：会话入库时按规则匹配（Round-Robin / Least-Busy / Skill-Match）；
  - 手动：任意时刻可"转派"，保留完整轨迹（谁在何时把谁转给谁、原因）；
  - 抢单：无主会话可"我来跟"，秒变已分配。
- **SLA**：分组级配置"首次响应 ≤ X 分钟 / 每次回复 ≤ Y 小时"；超时红标、
  升级到组长。

---

## 四、跟进闭环：从触达到回复到 CRM

```text
┌── 触达发起 ──┐   ┌── 平台送达/阅读 ──┐   ┌── 客户回复 ──┐   ┌── 跟进动作 ──┐   ┌── CRM 阶段 ──┐
│ 收藏/线索 →  │ → │ Webhook 回执:     │ → │ 会话进入      │ → │ AI 回复建议    │ → │ 加入商机     │
│ 发短信/WA/  │   │ sent/delivered/   │   │ 收件箱，触发   │   │ 一键翻译      │   │ 阶段推进     │
│ 邮件/社媒   │   │ read/failed       │   │ 分配 + SLA    │   │ 转派/合并/标签 │   │ 关联合同     │
└─────────────┘   └───────────────────┘   └───────────────┘   └───────────────┘   └──────────────┘
```

### 关键状态

**Message**：`queued → sent → delivered → read → replied` / `failed(reason)` /
`blocked(suppression)` / `template_required`（WA 窗口外）。

**Conversation**：`new`（未分配）→ `assigned`（已分配未回复）→ `in_progress`
（对话中）→ `waiting_customer` / `waiting_us` → `won` / `lost` / `snoozed` /
`closed`。

**跟进任务**：从会话可派生 "待办"（下一步行动），进入日历/提醒中心；到期未做
自动升级。

### AI 在环节中的角色

1. **意向评分**（参考附图 93 分）：模型综合询价主动性、产品匹配度、预算可能性、
   决策层接触、时间紧迫度产出 0–100 分，用于分配优先级和视觉排序。
2. **回复建议**：基于会话上下文 + 产品资料 + 我方公司信息生成 2–3 个候选回复，
   销售一键采纳后可微调。
3. **翻译**：incoming 消息自动检测语言并译成中文；outgoing 支持写中文一键翻译
   成目标语言发送（沿用 AI 起草模板的相同模型能力）。
4. **摘要/推进信号提取**：从长对话中抽取"询价点、拒绝点、下一步"关键短语，
   在时间线上以徽章形式呈现。
5. **自动打标**：行业、地区、产品、决策角色（KP/影响者/使用者）。

---

## 五、UI 设计（在既有 `/outreach/inbox` 上升级）

采用"左侧列表 + 中央会话 + 右侧客户面板"的三栏布局（参考附图）。

### 5.1 顶部工具栏

- **渠道选项卡**：全部 / 邮件 / 短信 / WhatsApp / LinkedIn / Meta / TikTok
  （每个 tab 显示未读数）。
- **分组切换**：`我的会话 / 我所在分组 / 全部`（权限过滤）。
- **状态筛选**：`未分配 / 待我回复 / 等客户回 / 已关闭 / 逾期`。
- **搜索**：联系人、企业、消息内容全文。

### 5.2 左侧列表卡片（每条会话）

```text
[渠道图标] [联系人 · 企业] [意向分:93] [渠道徽章]
最新一条消息摘要（截断 2 行）
[国家] [产品标签] [👤 分配给:张三] [⏱ SLA 剩 12min]  [状态徽章]
```

### 5.3 中央会话流

- 消息气泡按方向左右分列，顶部标注渠道 & 时间；
- 收到的外文消息下方灰色小字显示 AI 翻译；
- 关键节点用**推进信号徽章**标注："索取报价"、"要求演示"、"提出异议"；
- **底部输入区**根据渠道自适应：
  - WhatsApp：显示"客服窗口剩余 20h 15m"倒计时；窗口关闭 → 输入框切换为
    "选择 HSM 模板"选择器，禁止自由文本；
  - LinkedIn：字数上限提醒（InMail 1900 字）；
  - 邮件：主题 + 富文本 + 附件；
  - 短信：模板下拉 + 合规状态条（沿用已有）。
- 快捷动作条：`AI 建议回复 · 一键翻译 · 加入 CRM · 分配 · 标签 · 备注 · 转派`。

### 5.4 右侧客户面板

- 客户信息（企业 / 人 / 地区 / 产品 / 全渠道地址）；
- **AI 意向评分 + 维度雷达**；
- **跨渠道时间线**（该联系人在所有渠道的历史触达/回复概览）；
- 标签、下一步行动、关联商机、协同人（内部 @提醒）。

### 5.5 分配 / 转派浮层

- 头像 + 姓名 + 所属分组 + 当前工作量（进行中会话数）；
- 支持"分配给分组"（进入分组池，由规则再分）或"分配给具体人"；
- 转派必须填原因（可选择模板："客户在我休假期" 等），全部记入审计日志。

### 5.6 分组/规则管理页（新页面 `/outreach/admin/inbox-routing`）

管理员配置：
- 分组 CRUD、成员管理；
- 分配规则（拖拽排序，首命中生效）；
- SLA 与提醒策略；
- 工作量看板（每人在办数、平均首响、当日新增）。

---

## 六、数据模型（Cloud/Supabase 迁移建议）

```sql
-- 分组
create table groups (
  id uuid pk, name text, description text,
  sla_first_response_min int, sla_reply_hour int,
  created_at timestamptz
);
create table group_members (
  group_id uuid, user_id uuid, role text, -- member/lead
  primary key (group_id, user_id)
);

-- 联系人（跨渠道合一）
create table contacts (
  id uuid pk, enterprise_id uuid, name text, country text,
  email text, phone text, whatsapp text,
  linkedin_urn text, facebook_psid text, instagram_igsid text,
  tags text[], intent_score int, created_at timestamptz
);

-- 会话
create table conversations (
  id uuid pk, contact_id uuid, channel text,      -- email/sms/whatsapp/linkedin/...
  channel_account_id uuid,                        -- 我方哪个账号
  group_id uuid, assignee_id uuid,
  status text, last_message_at timestamptz,
  window_expires_at timestamptz,                  -- WA/Meta 客服窗口
  sla_deadline timestamptz,
  created_at timestamptz
);

-- 消息
create table messages (
  id uuid pk, conversation_id uuid, direction text, -- in/out
  template_id uuid, body text, attachments jsonb,
  status text, error_reason text,
  sent_at timestamptz, delivered_at timestamptz,
  read_at timestamptz, replied_at timestamptz
);

-- 分配规则
create table routing_rules (
  id uuid pk, name text, priority int, enabled bool,
  match_channel text[], match_country text[], match_tag text[], match_keyword text,
  assign_type text,          -- round_robin / least_busy / specific / group_pool
  target_group_id uuid, target_user_id uuid
);

-- 分配/转派日志
create table assignment_events (
  id uuid pk, conversation_id uuid,
  from_user_id uuid, to_user_id uuid, reason text,
  actor_id uuid, created_at timestamptz
);
```

RLS：员工只能读写 `assignee_id = auth.uid()` 或 `group_id in (my_groups)` 的
会话；组长/管理员通过 `user_roles` 表授权。

---

## 七、分期落地建议

### Phase 1（本迭代，前端可先 mock）

- 收件箱扩展 channel：`email / sms / whatsapp / linkedin / facebook / instagram`；
  为每种加图标与筛选。
- 会话新增字段：`groupId`、`assigneeId`、`status`、`slaDeadline`、
  `windowExpiresAt`；本地 store 落地。
- 顶部 tab：全部 / 我的 / 我所在分组 / 未分配；每条会话卡显示分配人 & SLA。
- 会话详情右上角**分配 / 转派**按钮 + 浮层。
- WhatsApp 窗口倒计时（>2h 提示 / 窗口关闭切换模板选择器）。
- 新建"分组管理"演示页 `/outreach/admin/inbox-routing`（分组、成员、规则）。

### Phase 2

- 打通 WhatsApp Cloud API：发送/接收/模板/状态回执；
- 打通 LinkedIn Messaging API（企业版）；
- Meta Messenger + Instagram 一并接入（同一 App）；
- 自动分配引擎（规则 + 轮询 + 负载均衡）；
- SLA 提醒（浏览器通知 / 邮件 / 飞书 Webhook）。

### Phase 3

- 跨渠道联系人合一（identity resolution）；
- AI 回复建议服务化 + 效果监控；
- 工作量看板 + 团队报表；
- 合规审计导出（消息级、分配级）。

---

## 八、与现有模块的关系

| 现有模块 | 关系 |
|---|---|
| `/outreach/reach` 触达任务 | 只管"发出"，发出后产生的 outbound Message 会写入对应 conversation；点击可跳转到收件箱查看整段对话。 |
| `/outreach/favorites` / `enterprise` / `leads` | 发起触达的入口不变；发起时若目标已有活跃 conversation，直接续在原会话下。 |
| `/outreach/suppressions` 退订名单 | 收到 `STOP / UNSUBSCRIBE / 请勿再发` 等消息 → 自动 upsert；后续触达任务 & 收件箱发送均前置校验。 |
| `/outreach/admin/sms-*` 短信管理 | 沿用；WhatsApp HSM 模板管理复用同一页面模式（另加 `/outreach/admin/wa-templates`）。 |
| `/points` 积分账本 | WhatsApp 会话消息 / 模板消息 / 社媒消息按新的计费规则入账，价目在配置中心维护。 |

---

## 九、开放问题（需业务确认）

1. **分组维度默认怎么切**：按大区（推荐）/ 按产品线 / 按语言？
2. **自动分配的默认策略**：轮询 vs. 负载最小？高意向客户是否直分组长？
3. **WhatsApp 账号是每个员工一个还是全公司共用**：影响窗口所有权与转派语义。
4. **社媒接入优先级**：LinkedIn 通常首选；Meta 系需要商业账号审核，是否延后？
5. **AI 回复是否需要"审批后才能发"**：初期建议 draft-only，销售必须点发送。

---

_更新：2026-07-08 · 作者：Boo 产品架构组_