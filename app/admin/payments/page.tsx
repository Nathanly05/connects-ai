import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { AppNav } from "@/components/layout/app-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
type PaymentStatus = "pending" | "paid" | "failed";

type PaymentOrder = {
  id: string;
  user_id: string;
  stripe_session_id: string;
  plan_name: string;
  amount_gbp: number;
  credits: number;
  status: PaymentStatus;
  created_at: string;
};

function statusPath(status?: ProfileStatus | null) {
  if (status === "rejected") {
    return "/auth/rejected";
  }

  if (status === "pending" || !status) {
    return "/auth/pending";
  }

  return "/chat";
}

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

function statusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    pending: "待支付",
    paid: "已支付",
    failed: "失败"
  };

  return labels[status];
}

function statusVariant(status: PaymentStatus) {
  if (status === "paid") {
    return "default";
  }

  if (status === "failed") {
    return "outline";
  }

  return "secondary";
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

export default async function AdminPaymentsPage() {
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

  const { data, error } = await supabase
    .from("payment_orders")
    .select("id, user_id, stripe_session_id, plan_name, amount_gbp, credits, status, created_at")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as PaymentOrder[];
  const userIds = [...new Set(orders.map((order) => order.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, email").in("id", userIds)
      : { data: [] };
  const emailByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.id as string, profile.email as string])
  );
  const pendingCount = orders.filter((order) => order.status === "pending").length;
  const paidCount = orders.filter((order) => order.status === "paid").length;
  const failedCount = orders.filter((order) => order.status === "failed").length;

  return (
    <main className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AppNav active="admin" />

        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CreditCard className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">Stripe 支付记录</h1>
              <Badge variant="secondary">自动充值</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              查看 Stripe Checkout 订单状态和 credits 发放情况。
            </p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryItem label="待支付" value={pendingCount} />
          <SummaryItem label="已支付" value={paidCount} />
          <SummaryItem label="失败" value={failedCount} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>支付订单</CardTitle>
            <CardDescription>共 {orders.length} 条 Stripe Checkout 订单。</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>支付订单暂时无法加载，请稍后重试。</AlertDescription>
              </Alert>
            ) : null}

            {!error && orders.length === 0 ? (
              <div className="rounded-lg border bg-secondary/50 px-4 py-10 text-center text-sm text-muted-foreground">
                暂无 Stripe 支付订单。
              </div>
            ) : null}

            {!error && orders.length > 0 ? (
              <>
                <div className="hidden rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>套餐</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {emailByUserId.get(order.user_id) ?? order.user_id}
                          </TableCell>
                          <TableCell>£{Number(order.amount_gbp).toFixed(2)}</TableCell>
                          <TableCell>{order.plan_name}</TableCell>
                          <TableCell>{order.credits}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(order.status)}>
                              {statusLabel(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(order.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-lg border bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="break-all text-sm font-medium">
                            {emailByUserId.get(order.user_id) ?? order.user_id}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">£{Number(order.amount_gbp).toFixed(2)}</Badge>
                          <Badge variant="outline">{order.plan_name}</Badge>
                          <Badge variant="outline">{order.credits} credits</Badge>
                          <Badge variant={statusVariant(order.status)}>
                            {statusLabel(order.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
