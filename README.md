# Connects AI

中文 AI 聊天平台，小范围内测使用。当前已完成：

- 邮箱注册和登录
- 注册审核状态页
- 管理员用户审核和 Remaining Chats 管理
- `/chat` 聊天界面
- OpenAI Responses API 调用
- GPT-5 Mini 固定模型调用
- 每完成一次 AI 回复扣除 1 chat
- GlobePay 人工审核充值
- Stripe 自动充值

## 本地环境变量

创建 `.env.local`：

```bash
cp .env.local.example .env.local
```

填写 Supabase、OpenAI 和 Stripe 配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAA_your-turnstile-site-key
TURNSTILE_SECRET_KEY=0x4AAAAAA_your-turnstile-secret-key
IPINFO_TOKEN=your-ipinfo-token
```

`OPENAI_API_KEY`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`、`TURNSTILE_SECRET_KEY` 和 `IPINFO_TOKEN` 只放在 `.env.local`，不要写进前端代码，也不要提交到 GitHub。
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` 是前端公开 site key，可以暴露给浏览器。当前注册和登录页已临时禁用 Turnstile，保留环境变量和组件，后续可重新启用。

`IPINFO_TOKEN` 用于注册风控里的 VPN、代理、Tor、机房 IP 检测。没有配置时系统不会误拦截用户，但会在注册审计里记录 IP 情报未配置。

## 运行项目

```bash
npm install
npm run dev
```

打开：

```txt
http://localhost:3000
```

## Supabase SQL

Phase 1 SQL 已创建基础表和函数：

- `profiles`
- `chat_sessions`
- `messages`
- `credit_logs`
- `admin_approve_user`
- `admin_reject_user`
- `admin_add_credits`

Phase 2 新增扣减底层余额函数：

```txt
supabase/migrations/0002_admin_remove_credits.sql
```

Phase 3 新增聊天消息表和保存聊天记录函数：

```txt
supabase/migrations/0003_phase_3_chat.sql
```

Phase 4A 新增充值申请表、Storage bucket、充值审核函数：

```txt
supabase/migrations/0004_phase_4a_recharges.sql
```

Stripe 自动充值新增支付订单表和支付完成函数：

```txt
supabase/migrations/0005_stripe_billing.sql
```

注册风控、Turnstile 审计、邮箱验证后发放免费额度：

```txt
supabase/migrations/0011_registration_turnstile_audit.sql
```

V1.0 最终规则、套餐、兼容视图和聊天扣费函数：

```txt
supabase/migrations/0012_v1_final_requirements.sql
```

请把这些 SQL 文件的内容分别复制到 Supabase Dashboard 的 **SQL Editor** 里运行。

## Turnstile 和注册风控

Turnstile 组件和验证工具已保留，但当前注册页和登录页临时不展示 Turnstile，也不会阻断注册/登录。前端配置项：

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

后端配置项：

```bash
TURNSTILE_SECRET_KEY=
```

保留的注册限制：

- 同一 IP 每小时最多 5 次注册尝试
- 同一 IP 24 小时最多 1 个成功注册账号
- 同一 IP lifetime 最多 3 个成功注册账号
- 配置 `IPINFO_TOKEN` 后，会拦截 VPN、代理、Tor、relay、hosting/datacenter IP
- 免费 chats 只会在账号 approved 且邮箱已验证后发放
- 同一 IP 或同一 device fingerprint 只能领取一次免费 chats

请在 Supabase Dashboard 的 **Authentication → Providers → Email** 中确认邮箱验证已开启。

## GlobePay 充值配置

把真实 GlobePay 收款二维码图片放到：

```txt
public/globepay.jpg
```

Phase 4A 使用的 Supabase Storage bucket 名称：

```txt
payment-proofs
```

这个 bucket 会由 `supabase/migrations/0004_phase_4a_recharges.sql` 创建，用来保存用户上传的付款截图。

## 测试管理员后台

先把自己的账号设为管理员：

```sql
update public.profiles
set role = 'admin',
    status = 'approved'
where email = 'your-email@example.com';
```

用户管理页面：

```txt
/admin/users
```

充值审核页面：

```txt
/admin/recharges
```

Stripe 支付记录页面：

```txt
/admin/payments
```

## Stripe 自动充值配置

Stripe webhook endpoint：

```txt
/api/stripe/webhook
```

本地开发时可以用 Stripe CLI 转发 webhook：

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

把 Stripe CLI 输出的 `whsec_...` 填入：

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

## V1.0 套餐

- Basic：50 chats，¥9.9
- Standard：300 chats，¥39，推荐
- Premium：1000 chats，¥99

用户界面只显示 Remaining Chats；数据库仍使用既有 `profiles.credits`、`payment_orders.credits`、`credit_logs` 字段，以保留现有 RPC、RLS 和 Stripe webhook 兼容性。

## 测试聊天流程

1. 注册一个测试用户。
2. 新用户默认应是 `role = user`、`status = pending`。
3. 用管理员后台批准该用户。
4. 批准后用户应变成 `status = approved`，并按风控和邮箱验证规则获得 `10 chats`。
5. 使用该用户登录，访问 `/chat`。
6. 发送一条消息。
7. 页面应显示 OpenAI 返回内容。
8. Supabase 的 `chat_messages` 表应保存用户消息和 AI 回复。
9. `profiles.credits` 应减少 1，页面显示的 Remaining Chats 同步减少 1。
10. `credit_logs` 应新增一条 `amount = -1` 的记录。

## 测试 GlobePay 人工充值

1. 确认已经运行 `supabase/migrations/0004_phase_4a_recharges.sql`。
2. 确认 Supabase Storage 中存在 bucket：`payment-proofs`。
3. 确认真实二维码图片存在：`public/globepay.jpg`。
4. 登录普通用户，打开 `/pricing`。
5. 选择套餐并点击“立即充值”。
6. 在 `/recharge` 上传付款截图并提交。
7. 管理员登录 `/admin/recharges`。
8. 管理员查看截图，点击“批准”。
9. 用户的 `profiles.credits` 应增加对应套餐 chats。
10. `credit_logs` 应新增一条 GlobePay 审核通过记录。

## 测试 Stripe 自动充值

1. 确认已经运行 `supabase/migrations/0005_stripe_billing.sql`。
2. 确认 `.env.local` 已填写 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`。
3. 启动项目：`npm run dev`。
4. 启动 Stripe CLI webhook 转发。
5. 登录 approved 用户，打开 `/billing`。
6. 选择 Basic、Standard 或 Premium，点击购买。
7. 在 Stripe Checkout 完成测试支付。
8. Stripe 发送 `checkout.session.completed` webhook。
9. 用户 Remaining Chats 自动增加对应数量。
10. 管理员打开 `/admin/payments` 查看订单。

检查 Stripe 支付订单：

```sql
select user_id, stripe_session_id, plan_name, amount_gbp, credits, status, created_at
from public.payment_orders
order by created_at desc
limit 20;
```

检查充值申请：

```sql
select user_id, amount, credits, screenshot_url, status, created_at, reviewed_at, reviewed_by
from public.recharge_requests
order by created_at desc
limit 20;
```

检查底层余额日志：

```sql
select amount, balance_after, reason, created_at
from public.credit_logs
order by created_at desc
limit 20;
```

当用户 `profiles.credits <= 0` 时，`/chat` 会显示：

```txt
Remaining Chats 已用完，请购买套餐后继续使用。
```

并禁止继续发送消息。

## 构建检查

```bash
npm run typecheck
npm run build
```
