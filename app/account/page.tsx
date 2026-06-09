import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  CreditCard,
  LifeBuoy,
  LogOut,
  MessageCircle,
  QrCode,
  ReceiptText,
  UserCircle,
  WalletCards
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { AppNav } from "@/components/layout/app-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  title: "Account"
};

type ProfileStatus = "pending" | "approved" | "rejected" | "banned";

type Profile = {
  email: string | null;
  status: ProfileStatus;
  credits: number;
  created_at: string;
};

type PaymentOrder = {
  id: string;
  plan_name: string;
  amount_gbp: number | string;
  credits: number;
  status: string;
  created_at: string;
};

type RechargeRequest = {
  id: string;
  package_name: string | null;
  amount: number | string;
  credits: number | null;
  status: string;
  created_at: string;
};

type CreditLog = {
  id: string;
  amount: number;
  reason: string | null;
  created_at: string;
};

type RechargeRecord = {
  id: string;
  source: "Stripe" | "GlobePay";
  packageName: string;
  amount: number;
  credits: number | null;
  status: string;
  createdAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(value);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function statusVariant(status: string) {
  if (status === "approved" || status === "paid") {
    return "default";
  }

  if (status === "rejected" || status === "failed") {
    return "outline";
  }

  return "secondary";
}

function formatCreditAmount(amount: number) {
  return `${amount > 0 ? "+" : ""}${formatInteger(amount)}`;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{children}</span>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-secondary/50 px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [profileResult, stripeResult, globePayResult, creditLogsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, status, credits, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("payment_orders")
      .select("id, plan_name, amount_gbp, credits, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("recharge_requests")
      .select("id, package_name, amount, credits, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("credit_logs")
      .select("id, amount, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  const profile = profileResult.data as Profile | null;
  const stripeOrders = (stripeResult.data ?? []) as PaymentOrder[];
  const globePayRequests = (globePayResult.data ?? []) as RechargeRequest[];
  const creditLogs = (creditLogsResult.data ?? []) as CreditLog[];

  const rechargeRecords: RechargeRecord[] = [
    ...stripeOrders.map((order) => ({
      id: `stripe-${order.id}`,
      source: "Stripe" as const,
      packageName: order.plan_name,
      amount: Number(order.amount_gbp),
      credits: order.credits,
      status: order.status,
      createdAt: order.created_at
    })),
    ...globePayRequests.map((request) => ({
      id: `globepay-${request.id}`,
      source: "GlobePay" as const,
      packageName: request.package_name ?? "未填写",
      amount: Number(request.amount),
      credits: request.credits,
      status: request.status,
      createdAt: request.created_at
    }))
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const profileEmail = profile?.email ?? user.email ?? "未读取到邮箱";
  const profileStatus = profile?.status ?? "pending";
  const profileCredits = profile?.credits ?? 0;
  const profileCreatedAt = profile?.created_at ?? user.created_at;
  const errors = [
    profileResult.error ? "账户信息暂时无法加载，请稍后重试。" : null,
    stripeResult.error || globePayResult.error
      ? "充值记录暂时无法加载，请稍后重试。"
      : null,
    creditLogsResult.error ? "Credits 记录暂时无法加载，请稍后重试。" : null
  ].filter(Boolean);

  return (
    <main className="page-shell min-h-screen px-3 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6">
        <AppNav active="account" />

        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <UserCircle className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">账户中心</h1>
              <Badge variant="secondary">Account</Badge>
            </div>
            <p className="mt-1 break-all text-sm text-muted-foreground">{profileEmail}</p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/chat">
              <MessageCircle aria-hidden="true" />
              返回聊天
            </Link>
          </Button>
        </header>

        {errors.length > 0 ? (
          <Alert variant="destructive">
            <AlertDescription>
              {errors.map((message) => (
                <span key={message} className="block">
                  {message}
                </span>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserCircle className="size-5" aria-hidden="true" />
              </div>
              <CardTitle>用户信息</CardTitle>
              <CardDescription>只显示当前登录用户自己的账户资料。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow label="邮箱">{profileEmail}</DetailRow>
              <DetailRow label="用户状态">
                <Badge variant={statusVariant(profileStatus)}>{profileStatus}</Badge>
              </DetailRow>
              <DetailRow label="当前 Credits">{formatInteger(profileCredits)} Credits</DetailRow>
              <DetailRow label="注册时间">{formatDate(profileCreatedAt)}</DetailRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <WalletCards className="size-5" aria-hidden="true" />
              </div>
              <CardTitle>快捷操作</CardTitle>
              <CardDescription>聊天、充值和退出登录。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button asChild className="w-full justify-start">
                <Link href="/chat">
                  <MessageCircle aria-hidden="true" />
                  前往聊天
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/billing">
                  <CreditCard aria-hidden="true" />
                  自动充值
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/recharge?method=globepay">
                  <QrCode aria-hidden="true" />
                  微信/支付宝充值
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/support">
                  <LifeBuoy aria-hidden="true" />
                  联系客服 / 反馈问题
                </Link>
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="secondary" className="w-full justify-start">
                  <LogOut aria-hidden="true" />
                  退出登录
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ReceiptText className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>充值记录</CardTitle>
            <CardDescription>最近 10 条 Stripe 和 GlobePay 充值记录。</CardDescription>
          </CardHeader>
          <CardContent>
            {rechargeRecords.length === 0 ? (
              <EmptyState>暂无充值记录。</EmptyState>
            ) : (
              <>
                <div className="hidden rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>来源</TableHead>
                        <TableHead>套餐</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>创建时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rechargeRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.source}</TableCell>
                          <TableCell className="font-medium">{record.packageName}</TableCell>
                          <TableCell>{formatCurrency(record.amount)}</TableCell>
                          <TableCell>
                            {record.credits === null ? "待确认" : formatInteger(record.credits)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(record.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {rechargeRecords.map((record) => (
                    <div key={record.id} className="rounded-lg border bg-white p-4 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{record.packageName}</p>
                          <Badge variant="secondary">{record.source}</Badge>
                        </div>
                        <DetailRow label="金额">{formatCurrency(record.amount)}</DetailRow>
                        <DetailRow label="Credits">
                          {record.credits === null ? "待确认" : formatInteger(record.credits)}
                        </DetailRow>
                        <DetailRow label="状态">
                          <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
                        </DetailRow>
                        <DetailRow label="创建时间">{formatDate(record.createdAt)}</DetailRow>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <WalletCards className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>Credits 记录</CardTitle>
            <CardDescription>最近 10 条 credits 增加或扣除记录。</CardDescription>
          </CardHeader>
          <CardContent>
            {creditLogs.length === 0 ? (
              <EmptyState>暂无 Credits 变动记录。</EmptyState>
            ) : (
              <>
                <div className="hidden rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>增加/扣除数量</TableHead>
                        <TableHead>原因</TableHead>
                        <TableHead>时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <span
                              className={
                                log.amount >= 0
                                  ? "font-semibold text-primary"
                                  : "font-semibold text-destructive"
                              }
                            >
                              {formatCreditAmount(log.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.reason ?? "未填写"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(log.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {creditLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border bg-white p-4 shadow-sm">
                      <div className="space-y-3">
                        <DetailRow label="数量">
                          <span
                            className={
                              log.amount >= 0
                                ? "font-semibold text-primary"
                                : "font-semibold text-destructive"
                            }
                          >
                            {formatCreditAmount(log.amount)}
                          </span>
                        </DetailRow>
                        <DetailRow label="原因">{log.reason ?? "未填写"}</DetailRow>
                        <DetailRow label="时间">{formatDate(log.created_at)}</DetailRow>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
