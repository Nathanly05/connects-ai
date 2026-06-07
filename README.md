# Connects AI

中文 AI 聊天平台，小范围内测使用。当前已完成：

- 邮箱注册和登录
- 注册审核状态页
- 管理员用户审核和 credits 管理
- `/chat` 聊天界面
- OpenAI Responses API 调用
- 每发送一次消息扣除 1 credit
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
```

`OPENAI_API_KEY`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` 和 `SUPABASE_SERVICE_ROLE_KEY` 只放在 `.env.local`，不要写进前端代码，也不要提交到 GitHub。

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

Phase 2 新增扣减 credits 函数：

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

请把这些 SQL 文件的内容分别复制到 Supabase Dashboard 的 **SQL Editor** 里运行。

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

## 测试聊天流程

1. 注册一个测试用户。
2. 新用户默认应是 `role = user`、`status = pending`、`credits = 0`。
3. 用管理员后台批准该用户。
4. 批准后用户应变成 `status = approved`，并获得 `50 credits`。
5. 使用该用户登录，访问 `/chat`。
6. 发送一条消息。
7. 页面应显示 OpenAI 返回内容。
8. Supabase 的 `chat_messages` 表应保存用户消息和 AI 回复。
9. `profiles.credits` 应减少 1。
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
9. 用户的 `profiles.credits` 应增加对应套餐 credits。
10. `credit_logs` 应新增一条 `reason = Recharge approved` 的记录。

## 测试 Stripe 自动充值

1. 确认已经运行 `supabase/migrations/0005_stripe_billing.sql`。
2. 确认 `.env.local` 已填写 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`。
3. 启动项目：`npm run dev`。
4. 启动 Stripe CLI webhook 转发。
5. 登录 approved 用户，打开 `/billing`。
6. 选择 Starter、Pro 或 Max，点击购买。
7. 在 Stripe Checkout 完成测试支付。
8. Stripe 发送 `checkout.session.completed` webhook。
9. 用户 credits 自动增加对应数量。
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

检查 credits 日志：

```sql
select amount, balance_after, reason, created_at
from public.credit_logs
order by created_at desc
limit 20;
```

当用户 `credits <= 0` 时，`/chat` 会显示：

```txt
Credits不足，请充值
```

并禁止继续发送消息。

## 构建检查

```bash
npm run typecheck
npm run build
```
