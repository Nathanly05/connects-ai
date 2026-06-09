import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  KeyRound,
  Server,
  XCircle
} from "lucide-react";
import { AppNav } from "@/components/layout/app-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin"
};

type ProfileRole = "user" | "admin";
type ProfileStatus = "pending" | "approved" | "rejected" | "banned";

type HealthStatus = "ok" | "error";

type CoreTableName =
  | "profiles"
  | "chat_sessions"
  | "chat_messages"
  | "credit_logs"
  | "payment_orders"
  | "recharge_requests"
  | "support_tickets";

const coreTables: CoreTableName[] = [
  "profiles",
  "chat_sessions",
  "chat_messages",
  "credit_logs",
  "payment_orders",
  "recharge_requests",
  "support_tickets"
];

function statusPath(status?: ProfileStatus | null) {
  if (status === "rejected") {
    return "/auth/rejected";
  }

  if (status === "pending" || !status) {
    return "/auth/pending";
  }

  return "/chat";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "暂无记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function StatusBadge({ status, label }: { status: HealthStatus; label: string }) {
  const isOk = status === "ok";

  return (
    <Badge
      variant="outline"
      className={
        isOk
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }
    >
      {isOk ? <CheckCircle2 className="mr-1 size-3.5" aria-hidden="true" /> : <XCircle className="mr-1 size-3.5" aria-hidden="true" />}
      {label}
    </Badge>
  );
}

function CheckCard({
  title,
  description,
  status,
  statusLabel,
  value
}: {
  title: string;
  description: string;
  status: HealthStatus;
  statusLabel: string;
  value?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          {value ? <p className="mt-2 break-all text-sm text-foreground">{value}</p> : null}
        </div>
        <StatusBadge status={status} label={statusLabel} />
      </CardContent>
    </Card>
  );
}

async function checkTable(supabase: Awaited<ReturnType<typeof createClient>>, table: CoreTableName) {
  const { error } = await supabase.from(table).select("id", { count: "exact", head: true });

  return {
    table,
    status: error ? "error" as const : "ok" as const
  };
}

async function latestCreatedAt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "chat_messages" | "payment_orders" | "recharge_requests"
) {
  const { data, error } = await supabase
    .from(table)
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    status: error ? "error" as const : "ok" as const,
    createdAt: (data?.created_at as string | undefined) ?? null
  };
}

export default async function AdminHealthPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  const currentStatus = currentProfile?.status as ProfileStatus | undefined;
  const currentRole = currentProfile?.role as ProfileRole | undefined;

  if (currentStatus !== "approved") {
    redirect(statusPath(currentStatus));
  }

  if (currentRole !== "admin") {
    redirect("/chat");
  }

  const profilesCheck = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const [tableChecks, latestChat, latestStripe, latestGlobePay] = await Promise.all([
    Promise.all(coreTables.map((table) => checkTable(supabase, table))),
    latestCreatedAt(supabase, "chat_messages"),
    latestCreatedAt(supabase, "payment_orders"),
    latestCreatedAt(supabase, "recharge_requests")
  ]);

  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const hasStripeSecret = Boolean(process.env.STRIPE_SECRET_KEY);
  const hasStripeWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "未配置";
  const nodeEnv = process.env.NODE_ENV || "未配置";

  return (
    <main className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AppNav active="admin" />

        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Server className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">系统健康检查</h1>
              <Badge variant="secondary">Health</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              检查核心配置、数据库表和最近业务记录，不会暴露任何 secret key。
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin">
              <ArrowLeft aria-hidden="true" />
              返回管理员后台
            </Link>
          </Button>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <CheckCard
            title="Supabase 连接状态"
            description="检查是否可以读取 profiles 表。"
            status={profilesCheck.error ? "error" : "ok"}
            statusLabel={profilesCheck.error ? "异常" : "正常"}
          />
          <CheckCard
            title="OpenAI API Key 状态"
            description="检查 OPENAI_API_KEY 是否存在。"
            status={hasOpenAiKey ? "ok" : "error"}
            statusLabel={hasOpenAiKey ? "已配置" : "未配置"}
          />
          <CheckCard
            title="Stripe Secret Key 状态"
            description="检查 STRIPE_SECRET_KEY 是否存在。"
            status={hasStripeSecret ? "ok" : "error"}
            statusLabel={hasStripeSecret ? "已配置" : "未配置"}
          />
          <CheckCard
            title="Stripe Webhook Secret 状态"
            description="检查 STRIPE_WEBHOOK_SECRET 是否存在。"
            status={hasStripeWebhookSecret ? "ok" : "error"}
            statusLabel={hasStripeWebhookSecret ? "已配置" : "未配置"}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Server className="size-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-lg">Vercel 环境</CardTitle>
            <CardDescription>显示公开环境和运行模式，不包含 secret。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-secondary/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">NEXT_PUBLIC_SITE_URL</p>
              <p className="mt-1 break-all text-sm font-medium">{siteUrl}</p>
            </div>
            <div className="rounded-lg border bg-secondary/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">NODE_ENV</p>
              <p className="mt-1 break-all text-sm font-medium">{nodeEnv}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Database className="size-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-lg">数据库核心表检查</CardTitle>
            <CardDescription>检查核心表是否可以查询。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>表名</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableChecks.map((check) => (
                    <TableRow key={check.table}>
                      <TableCell className="font-medium">{check.table}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={check.status}
                          label={check.status === "ok" ? "正常" : "异常"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {tableChecks.map((check) => (
                <div key={check.table} className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <span className="font-medium">{check.table}</span>
                  <StatusBadge
                    status={check.status}
                    label={check.status === "ok" ? "正常" : "异常"}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <KeyRound className="size-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-lg">最近业务记录</CardTitle>
            <CardDescription>用于快速判断聊天和充值链路是否近期有数据。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-3">
            <CheckCard
              title="最近一次 AI 聊天记录时间"
              description="来自 chat_messages.created_at。"
              status={latestChat.status}
              statusLabel={latestChat.status === "ok" ? "正常" : "异常"}
              value={formatDate(latestChat.createdAt)}
            />
            <CheckCard
              title="最近一次 Stripe 订单时间"
              description="来自 payment_orders.created_at。"
              status={latestStripe.status}
              statusLabel={latestStripe.status === "ok" ? "正常" : "异常"}
              value={formatDate(latestStripe.createdAt)}
            />
            <CheckCard
              title="最近一次 GlobePay 充值申请时间"
              description="来自 recharge_requests.created_at。"
              status={latestGlobePay.status}
              statusLabel={latestGlobePay.status === "ok" ? "正常" : "异常"}
              value={formatDate(latestGlobePay.createdAt)}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
