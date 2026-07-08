# WhatsApp / 社媒触达 · 结果跟进与团队协同 设计方案 v2

> 版本：v2（依据业务确认更新，v1 已废弃）  
> 关联文档：`docs/sms-outreach-design.md`  
> 目标读者：产品、前端、后端、合规  
> 范围：邮件、短信、WhatsApp、Telegram、Facebook、TikTok 六渠道统一收件箱。

---

## 一、v2 关键变更（相对 v1）

根据业务确认，本轮设计做如下收敛：

| 项 | v1 方案 | **v2 决定** |
|---|---|---|
| 支持渠道 | 邮件/短信/WhatsApp/LinkedIn/FB/IG/TikTok/X | **邮件 / 短信 / WhatsApp / Telegram / Facebook / TikTok**（去掉 LinkedIn、Instagram、X） |
| 分组维度 | 大区 × 产品线 × 来源 | **按目标类型：企业 / 人物 两个分组** |
| 分配策略 | 自动（轮询 / 负载最小 / 规则匹配） | **不自动分配，全部人工分配 / 抢单** |
| WhatsApp 账号所有权 | 每员工独立 | **全公司共用一个账号池** |
| Meta 系接入 | Facebook + Instagram 同 App | **只接 Facebook，Instagram 不做** |
| AI 回复 | 可选 draft-only | **draft-only：AI 只生成草稿，销售必须点发送** |

---

## 二、问题与目标

### 现状盘点

1. 收件箱 `/outreach/inbox` 只区分邮件/短信，缺 WhatsApp、Telegram、
   Facebook、TikTok；
2. 会话有 `assignee` 字段但**无分配 UI**、无分组、无权责流转记录；
3. 无 SLA / 未读 / @提及提醒；
4. 触达任务 `/outreach/reach` 与回复分居两处，闭环断裂；
5. WhatsApp 24h 客服窗口、模板消息、opt-in 等合规差异未在 UI 体现。

### 设计目标

- **一个收件箱统管六渠道**，销售不用切工具；
- **按目标类型分组 + 人工分配**，简单、透明、可追溯；
- **触达 → 回复 → 跟进 → CRM 阶段全链路闭环**，AI 只做草稿与翻译；
- **合规内建**：WhatsApp 24h 窗口检测 / 模板选择 / opt-out。

---

## 三、渠道能力矩阵

| 渠道 | 主动发起 | 回复接收 | 会话窗口 | 模板 | 富媒体 | 主要限制 |
|---|---|---|---|---|---|---|
| Email | 随时 | Webhook / IMAP | 无 | 无 | 附件、HTML | 反垃圾评分 |
| SMS | 需预审模板 | MO 回调 | 无 | 强制 | 无 | STOP / A2P 10DLC |
| **WhatsApp** | 需 HSM 模板 | Webhook | **24h 客服窗口** | 窗口外强制 | 图/视/文档 | Meta 质量评级 |
| **Telegram** | 用户先 /start | Bot Webhook | 无 | 无 | 图/视/文档 | 需 Bot Token |
| **Facebook Messenger** | 需 24h + 消息标签 | Webhook | **24h + 标签** | 无 | 图/视 | 只能被动开启 |
| **TikTok 商家消息** | 商店内触发 | Webhook | **48h** | 无 | 图 | 仅商店客户 |

> 关键：WhatsApp / Facebook / TikTok 都有"客服窗口"概念。窗口内自由文本；
> WhatsApp 窗口外必须发预审 HSM 模板；Facebook 窗口外需附合规消息标签；
> TikTok 窗口外禁止外发。窗口状态是收件箱输入区的一等公民。

---

## 四、信息架构

```text
Contact（联系人 / 企业）
  └── Conversation（1 位联系人 × 1 个渠道）
        └── Message（in/out、模板、附件、状态）
```

### 分组：按目标类型（本版唯一维度）

```text
Group（分组）
  ├─ 企业分组（target_type = enterprise）
  │     ↳ 会话对象是企业主体（企业邮箱、企业公众号、企业 WA 商号等）
  └─ 人物分组（target_type = contact）
        ↳ 会话对象是自然人（个人手机、个人 WA、个人 FB/TG 账号）
```

- 会话入库时按 `contact.target_type` 自动落入对应分组池（**这是路由，不是分配**）；
- 分组内**不做自动派单**：全部以"未分配"状态进入池子；
- 员工可属于任一或两个分组，权限决定他能看到哪个池；
- 管理员在 `/outreach/admin/inbox-routing` 维护分组成员与查看权限。

### 分配：全部人工

- 三种动作：**分配给我 / 分配给他人 / 转派**；
- 组长/管理员可批量选中"未分配"会话 → 分配给某成员；
- 成员可在池中"抢单"（Claim），秒变已分配；
- 每次分配/转派写入 `assignment_events`，包含 from / to / reason / actor；
- 无自动规则、无轮询、无负载均衡——保持策略简单可解释。

### SLA（保留但只做提醒）

- 分组级配置：首响 ≤ X 分钟 / 每次回复 ≤ Y 小时；
- **起算规则**：
  - 未分配阶段：SLA 计入**分组池**，超时提醒**组长派单**，不算某个员工头上；
  - 已分配阶段：SLA 计入**当前 assignee**，超时红标 + 组长通知；
- 不做自动升级 / 自动改派；组长看到红标后手动处理。

### 通知策略（新增）

- **未分配新会话**：通知该分组所有在线成员（桌面通知，可点开抢单）+ 组长必收；
- **已分配新消息**：只通知 assignee；@提及额外通知被 @ 的人；
- **SLA 逼近**（剩余 <20%）与**超时**：assignee + 组长；
- 通知渠道 Phase 1 仅浏览器；Phase 2 加邮件 / 飞书 Webhook。

### Snooze 唤醒（新增）

- Snooze 需选唤醒时间（1h / 4h / 明天 9:00 / 自定义）；
- 到时自动回到 `waiting_us` 并置顶列表；若期间客户先回复，立即唤醒。

---

## 五、WhatsApp 账号：全公司共用账号池

- **账号所有权**：WA 商号属于公司，不属于任何员工；
- 所有出站消息通过后台调度选账号（延用现有 `src/data/social-accounts.ts`
  中的账号池与 `dispatchSend()` 逻辑）；
- **窗口所有权**：24h 客服窗口挂在 `conversation` 上，与谁分配无关——
  转派后新 assignee 继承同一窗口；
- 出站消息在 `messages.sent_by_user_id` 记录**是谁点了发送**，用于绩效；
  但对客户展示的发件方永远是"公司 WA 号 + 客服人姓名（可选签名行）"；
- 入站消息按 `to_channel_account` 落到对应会话；同一联系人多次接入始终归并
  到同一 conversation（避免"同人多会话"）。

---

## 六、跟进闭环

```text
触达发起 → 平台送达/阅读回执 → 客户回复入库
       → 落入 企业/人物 分组池 → 人工分配 / 抢单
       → 会话中跟进（AI 草稿 · 翻译 · 标签 · 备注）
       → 转派 / 关闭 / 加入 CRM 商机
```

### 状态机

- **Message**：`queued → sent → delivered → read → replied` / `failed(reason)` /
  `blocked(suppression)` / `template_required`（WA 窗口外）。
- **Conversation**：`new`（未分配，在池中）→ `assigned`（人工已分配）→
  `in_progress` → `waiting_customer` / `waiting_us` → `won` / `lost` /
  `snoozed` / `closed`。

### AI 在闭环中的边界（本版收窄）

1. **回复草稿（draft-only）**：基于会话上下文生成 2–3 条候选，销售必须
   显式点击"发送"；不落 outbound 队列前不计费；
2. **翻译**：incoming 自动检测语言 → 译成中文；outgoing 支持中→目标语；
3. **意向评分**：0–100 分（如附图 93 分），用于列表排序与"高意向"筛选；
4. **自动打标**：行业 / 地区 / 产品 / 决策角色；
5. **不做**：自动回复、自动分配、自动跟进（避免合规与体验风险）。

> 补充：AI 草稿发送前**必须经员工编辑或确认**；发送后消息带 `ai_assisted=true`
> 元数据，用于后续采纳率统计。

---

## 七、UI 设计（在既有 `/outreach/inbox` 上升级）

沿用"左侧列表 + 中央会话 + 右侧客户面板"三栏。

### 7.1 顶部工具栏

- **渠道选项卡**：`全部 / 邮件 / 短信 / WhatsApp / Telegram / Facebook / TikTok`
  （每 tab 显示**分配给我的未读数**，避免全局未读把池里几百条都算到自己头上）；
- **分组切换**：`企业分组 / 人物分组 / 全部`（权限内可见）；
- **状态筛选**：`未分配 / 待我回复 / 等客户回 / 已 snooze / 已关闭 / 逾期`；
- 搜索：联系人、企业、消息内容全文。

> `未分配` 只出现在状态筛选里，不再作为独立 tab，避免与分组切换含义重叠。

### 7.2 左侧列表卡片

```text
[渠道图标] [联系人 · 企业] [意向:93] [分组:企业|人物]
最新一条消息摘要（截断 2 行）
[国家] [产品] [👤 未分配 / 分配给:张三] [⏱ SLA 剩 12m] [状态]
```

未分配的会话卡右侧显示 **【分配】/【我来跟】** 快捷按钮。

### 7.3 中央会话流

- 消息气泡左右分列 + 渠道 & 时间；
- 外文消息下方灰色小字显示 AI 翻译；
- 关键节点用推进信号徽章：`索取报价 / 要求演示 / 提出异议`；
- **底部输入区按渠道自适应**：
  - WhatsApp：显示"客服窗口剩余 20h 15m"倒计时；窗口关闭 → 切换 HSM 模板选择器，禁止自由文本；
  - Facebook：显示 24h + 需选消息标签（`CONFIRMED_EVENT_UPDATE` 等）；
  - TikTok：显示 48h 倒计时；窗口关闭禁用输入；
  - Telegram / Email / SMS：无窗口概念，正常输入；
- 快捷动作条：`AI 草稿 · 翻译 · 加入 CRM · 分配 · 转派 · 标签 · 备注`。

### 7.4 右侧客户面板

- 客户信息（企业/人 / 地区 / 产品 / 全渠道地址）；
- AI 意向评分 + 维度雷达；
- 跨渠道时间线（该联系人在六渠道的历史触达/回复）；
- 标签、下一步行动、关联商机、内部 @协同人。

### 7.5 分配 / 转派浮层

- 展示：头像 + 姓名 + 所属分组（企业/人物）+ 当前在办数；
- **默认候选优先级**：① 该客户上次跟进人（若在职且在对应分组） → ② 本分组在办最少的成员 → ③ 其他本分组成员；降低组长派单心智；
- 常规只能选**本分组成员**；**跨分组转派**允许但需勾选"我确认跨组"+原因，仅管理员/组长可执行；
- 转派必填原因（模板："客户在我休假期"）；可选勾选"对客户发送一条切换招呼语"——共享 WA 号下客户看不到人员变化，用招呼语显式告知；
- **抢单并发保护**：`UPDATE conversations SET assignee_id=? WHERE id=? AND assignee_id IS NULL`，0 行则提示"已被他人抢先"；
- 全部动作记入 `assignment_events`。

### 7.6 分组/权限管理页 `/outreach/admin/inbox-routing`

管理员维护：
- 两个内置分组（企业 / 人物）不可删，仅编辑成员与 SLA；
- 成员的可见范围（企业池 / 人物池 / 两者）；
- SLA 阈值与提醒开关；
- 工作量看板（每人在办、当日新增、平均首响）。

---

## 八、数据模型（迁移建议）

```sql
-- 分组（内置两条：企业 / 人物）
create table groups (
  id uuid primary key,
  target_type text not null check (target_type in ('enterprise','contact')),
  name text not null,
  sla_first_response_min int,
  sla_reply_hour int,
  created_at timestamptz default now()
);

create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid not null,
  role text default 'member', -- member / lead
  primary key (group_id, user_id)
);

-- 联系人（跨渠道合一）
create table contacts (
  id uuid primary key,
  target_type text not null check (target_type in ('enterprise','contact')),
  enterprise_id uuid,
  name text, country text,
  email text, phone text, whatsapp text,
  telegram_id text, facebook_psid text, tiktok_open_id text,
  tags text[], intent_score int,
  created_at timestamptz default now()
);

-- 会话
create table conversations (
  id uuid primary key,
  contact_id uuid references contacts(id),
  channel text check (channel in ('email','sms','whatsapp','telegram','facebook','tiktok')),
  channel_account_id uuid,                -- 我方公司账号（WA 共享池等）
  group_id uuid references groups(id),    -- 企业 or 人物
  assignee_id uuid,                       -- null = 未分配
  status text,                            -- new/assigned/in_progress/...
  last_message_at timestamptz,
  window_expires_at timestamptz,          -- WA/FB/TikTok 客服窗口
  sla_deadline timestamptz,
  created_at timestamptz default now()
);

-- 消息
create table messages (
  id uuid primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  direction text check (direction in ('in','out')),
  template_id uuid,
  body text, attachments jsonb,
  status text, error_reason text,
  sent_by_user_id uuid,                   -- 实际点发送的员工
  sent_at timestamptz, delivered_at timestamptz,
  read_at timestamptz, replied_at timestamptz
);

-- 分配 / 转派事件（人工分配全量留痕）
create table assignment_events (
  id uuid primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  from_user_id uuid, to_user_id uuid,
  reason text,
  actor_id uuid,
  created_at timestamptz default now()
);
```

**RLS 要点**：员工可读写 `assignee_id = auth.uid()` 或
`group_id in (我的可见分组)` 的会话；组长/管理员通过 `user_roles` 授权。
**本版无 `routing_rules` 表**（不自动分配）。

---

## 九、分期落地

### Phase 1（本迭代，前端可先 mock）

- 收件箱渠道扩展：`email / sms / whatsapp / telegram / facebook / tiktok`（图标 + 筛选）；
- 会话新增字段：`groupId(企业|人物)`、`assigneeId`、`status`、`slaDeadline`、`windowExpiresAt`；本地 store 落地；
- 顶部 tab：`全部 / 企业分组 / 人物分组 / 未分配`；每卡显示分配人 & SLA；
- 会话详情右上角**分配 / 转派**浮层（只允许人工）；
- WhatsApp 窗口倒计时（>2h 提示 / 关闭切模板选择器）；
- 新建演示页 `/outreach/admin/inbox-routing`（两个内置分组、成员管理、SLA 配置）。

### Phase 2

- WhatsApp Cloud API（复用共享账号池 `dispatchSend()`）；
- Telegram Bot API；
- Facebook Messenger（Meta 商业账号）；
- TikTok 商家消息；
- SLA 提醒（浏览器 / 邮件 / 飞书 Webhook）。

### Phase 3

- 跨渠道联系人合一（identity resolution）；
- AI 草稿服务化 + 采纳率监控；
- 工作量看板 + 团队报表；
- 合规审计导出（消息级、分配级）。

---

## 十、与现有模块的关系

| 现有模块 | 关系 |
|---|---|
| `/outreach/reach` | 只管"发出"，outbound Message 落入对应 conversation；点击跳转收件箱查看整段对话。 |
| `/outreach/favorites`、`enterprise`、`leads` | 发起入口不变；若已存在活跃 conversation 则续在同一会话。 |
| `/outreach/suppressions` | 收到 `STOP / 退订 / 请勿再发` 自动 upsert；触达与收件箱发送前置校验。 |
| `/outreach/admin/sms-*` | 沿用；WhatsApp HSM 模板复用同一页面模式，新增 `/outreach/admin/wa-templates`。 |
| `src/data/social-accounts.ts` | WA/TikTok/Facebook 出站均走此账号池的 `dispatchSend()`，账号对最终用户隐藏。 |
| `/points` 积分账本 | 六渠道按不同价目入账，价目在配置中心维护。 |

---

_更新：2026-07-08 · v2 · Boo 产品架构组_