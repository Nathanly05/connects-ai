import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Clock3,
  Coins,
  CreditCard,
  MessageCircle,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
  WalletCards
} from "lucide-react";
import { AdminUserActionControls } from "@/components/admin/admin-user-action-controls";
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
import { AppNav } from "@/components/layout/app-nav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileRole = "user" | "admin";
type ProfileStatus = "pending" | "approved" | "rejected";
type RechargeStatus = "pending" | "approved" | "rejected";

type Profile = {
  id: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  credits: number;
  created_at: string;
};

type RechargeRequest = {
  id: string;
  user_id: string;
  email: string | null;
  package_name: string | null;
  amount: number | string;
  status: RechargeStatus;
  created_at: string;
};

type CreditLog = {
  id: string;
  user_id: string;
  admin_id: string | null;
  amount: number;
  balance_after: number;
  reason: string | null;
  created_at: string;
};

type PaymentAmount = {
  amount_gbp: number | string | null;
};

type AdminPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
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

function formatInteger(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(value);
}

function roleLabel(role: ProfileRole) {
  return role === "admin" ? "管理员" : "用户";
}

function statusLabel(status: ProfileStatus) {
  const labels: Record<ProfileStatus, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已拒绝"
  };

  return labels[status];
}

function rechargeStatusLabel(status: RechargeStatus) {
  const labels: Record<RechargeStatus, string> = {
    pending: "待审核",
    approved: "已批准",
    rejected: "已拒绝"
  };

  return labels[status];
}

function statusVariant(status: ProfileStatus | RechargeStatus) {
  if (status === "approved") {
    return "default";
  }

  if (status === "rejected") {
    return "outline";
  }

  return "secondary";
}

function formatCreditAmount(amount: number) {
  return `${amount > 0 ? "+" : ""}${formatInteger(amount)}`;
}

function DashboardCard({
  icon: Icon,
  label,
  value,
  description
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-2xl font-semibold leading-tight tracking-normal">
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-secondary/50 px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function DetailRow({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{children}</span>
    </div>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const [
    profilesResult,
    todayMessagesResult,
    todayStripeOrdersResult,
    pendingRechargeResult,
    recentRechargesResult,
    recentCreditLogsResult
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, role, status, credits, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStartIso),
    supabase
      .from("payment_orders")
      .select("amount_gbp")
      .eq("status", "paid")
      .gte("created_at", todayStartIso),
    supabase
      .from("recharge_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("recharge_requests")
      .select("id, user_id, email, package_name, amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("credit_logs")
      .select("id, user_id, admin_id, amount, balance_after, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  const users = (profilesResult.data ?? []) as Profile[];
  const recentRecharges = (recentRechargesResult.data ?? []) as RechargeRequest[];
  const recentCreditLogs = (recentCreditLogsResult.data ?? []) as CreditLog[];
  const recentUsers = users.slice(0, 10);
  const emailByUserId = new Map(users.map((profile) => [profile.id, profile.email]));

  const pendingCount = users.filter((profile) => profile.status === "pending").length;
  const approvedCount = users.filter((profile) => profile.status === "approved").length;
  const rejectedCount = users.filter((profile) => profile.status === "rejected").length;
  const totalCredits = users.reduce((total, profile) => total + Number(profile.credits ?? 0), 0);
  const todayNewUsers = users.filter(
    (profile) => new Date(profile.created_at).getTime() >= todayStart.getTime()
  ).length;
  const todayStripeAmount = ((todayStripeOrdersResult.data ?? []) as PaymentAmount[]).reduce(
    (total, order) => total + Number(order.amount_gbp ?? 0),
    0
  );

  const dashboardErrors = [
    profilesResult.error ? `读取用户数据失败：${profilesResult.error.message}` : null,
    todayMessagesResult.error
      ? `读取今日聊天消息数失败：${todayMessagesResult.error.message}`
      : null,
    todayStripeOrdersResult.error
      ? `读取今日 Stripe 充值金额失败：${todayStripeOrdersResult.error.message}`
      : null,
    pendingRechargeResult.error
      ? `读取待审核 GlobePay 申请数失败：${pendingRechargeResult.error.message}`
      : null,
    recentRechargesResult.error
      ? `读取最近充值申请失败：${recentRechargesResult.error.message}`
      : null,
    recentCreditLogsResult.error
      ? `读取最近 Credits 变动失败：${recentCreditLogsResult.error.message}`
      : null
  ].filter(Boolean);

  return (
    <main className="page-shell min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AppNav active="admin" />

        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">管理员后台</h1>
              <Badge variant="secondary">运营看板</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              查看用户、聊天、充值和 credits 变动，并继续处理审核操作。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href="/admin/recharges">
                <ReceiptText aria-hidden="true" />
                充值申请
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/admin/payments">
                <CreditCard aria-hidden="true" />
                Stripe 订单
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/chat">
                <MessageCircle aria-hidden="true" />
                返回聊天
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            icon={UsersRound}
            label="总用户数"
            value={formatInteger(users.length)}
            description="profiles 全部账号"
          />
          <DashboardCard
            icon={Clock3}
            label="待审核用户数"
            value={formatInteger(pendingCount)}
            description="status = pending"
          />
          <DashboardCard
            icon={UserCheck}
            label="已通过用户数"
            value={formatInteger(approvedCount)}
            description="status = approved"
          />
          <DashboardCard
            icon={Coins}
            label="总 Credits 余额"
            value={formatInteger(totalCredits)}
            description="所有用户当前余额"
          />
          <DashboardCard
            icon={UserPlus}
            label="今日新增用户"
            value={formatInteger(todayNewUsers)}
            description="今日注册 profiles"
          />
          <DashboardCard
            icon={MessageSquareText}
            label="今日聊天消息数"
            value={formatInteger(todayMessagesResult.count ?? 0)}
            description="chat_messages 今日记录"
          />
          <DashboardCard
            icon={WalletCards}
            label="今日 Stripe 充值金额"
            value={formatCurrency(todayStripeAmount)}
            description="今日 paid 订单"
          />
          <DashboardCard
            icon={ReceiptText}
            label="待审核 GlobePay 申请"
            value={formatInteger(pendingRechargeResult.count ?? 0)}
            description="recharge_requests pending"
          />
        </div>

        {params.success ? (
          <Alert className="border-primary/20 bg-primary/10 text-primary">
            <AlertDescription>{params.success}</AlertDescription>
          </Alert>
        ) : null}

        {params.error ? (
          <Alert variant="destructive">
            <AlertDescription>{params.error}</AlertDescription>
          </Alert>
        ) : null}

        {dashboardErrors.length > 0 ? (
          <Alert variant="destructive">
            <AlertDescription>
              {dashboardErrors.map((message) => (
                <span key={message} className="block">
                  {message}
                </span>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ReceiptText className="size-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-lg">最近充值申请</CardTitle>
              <CardDescription>最近 10 条 GlobePay 充值申请。</CardDescription>
            </CardHeader>
            <CardContent>
              {recentRecharges.length === 0 ? (
                <EmptyState>暂时没有充值申请。</EmptyState>
              ) : (
                <>
                  <div className="hidden overflow-x-auto rounded-lg border md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>邮箱</TableHead>
                          <TableHead>套餐</TableHead>
                          <TableHead>金额</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentRecharges.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="min-w-[180px] font-medium">
                              {request.email ?? emailByUserId.get(request.user_id) ?? request.user_id}
                            </TableCell>
                            <TableCell>{request.package_name ?? "未填写"}</TableCell>
                            <TableCell>{formatCurrency(Number(request.amount))}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(request.status)}>
                                {rechargeStatusLabel(request.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[140px] text-muted-foreground">
                              {formatDate(request.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {recentRecharges.map((request) => (
                      <div key={request.id} className="rounded-lg border bg-white p-4 shadow-sm">
                        <div className="space-y-3">
                          <p className="break-all text-sm font-medium">
                            {request.email ?? emailByUserId.get(request.user_id) ?? request.user_id}
                          </p>
                          <DetailRow label="套餐">{request.package_name ?? "未填写"}</DetailRow>
                          <DetailRow label="金额">{formatCurrency(Number(request.amount))}</DetailRow>
                          <DetailRow label="状态">
                            <Badge variant={statusVariant(request.status)}>
                              {rechargeStatusLabel(request.status)}
                            </Badge>
                          </DetailRow>
                          <DetailRow label="时间">{formatDate(request.created_at)}</DetailRow>
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
              <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Activity className="size-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-lg">最近 Credits 变动</CardTitle>
              <CardDescription>最近 10 条 credit_logs 记录。</CardDescription>
            </CardHeader>
            <CardContent>
              {recentCreditLogs.length === 0 ? (
                <EmptyState>暂时没有 credits 变动。</EmptyState>
              ) : (
                <>
                  <div className="hidden overflow-x-auto rounded-lg border md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>用户</TableHead>
                          <TableHead>变动</TableHead>
                          <TableHead>余额</TableHead>
                          <TableHead>原因</TableHead>
                          <TableHead>时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentCreditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="min-w-[180px] font-medium">
                              {emailByUserId.get(log.user_id) ?? log.user_id}
                            </TableCell>
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
                            <TableCell>{formatInteger(log.balance_after)}</TableCell>
                            <TableCell className="min-w-[180px] text-muted-foreground">
                              {log.reason ?? "未填写"}
                            </TableCell>
                            <TableCell className="min-w-[140px] text-muted-foreground">
                              {formatDate(log.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {recentCreditLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border bg-white p-4 shadow-sm">
                        <div className="space-y-3">
                          <p className="break-all text-sm font-medium">
                            {emailByUserId.get(log.user_id) ?? log.user_id}
                          </p>
                          <DetailRow label="变动">
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
                          <DetailRow label="余额">{formatInteger(log.balance_after)}</DetailRow>
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
        </div>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UserPlus className="size-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-lg">最近注册用户</CardTitle>
            <CardDescription>最近 10 个 profiles 用户。</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <EmptyState>暂时没有注册用户。</EmptyState>
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>邮箱</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>注册时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentUsers.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="min-w-[220px] font-medium">
                            {profile.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                              {roleLabel(profile.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(profile.status)}>
                              {statusLabel(profile.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatInteger(profile.credits)}</TableCell>
                          <TableCell className="min-w-[140px] text-muted-foreground">
                            {formatDate(profile.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {recentUsers.map((profile) => (
                    <div key={profile.id} className="rounded-lg border bg-white p-4 shadow-sm">
                      <div className="space-y-3">
                        <p className="break-all text-sm font-medium">{profile.email}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                            {roleLabel(profile.role)}
                          </Badge>
                          <Badge variant={statusVariant(profile.status)}>
                            {statusLabel(profile.status)}
                          </Badge>
                          <Badge variant="outline">{formatInteger(profile.credits)} credits</Badge>
                        </div>
                        <DetailRow label="注册时间">{formatDate(profile.created_at)}</DetailRow>
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
              <UsersRound className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>所有用户</CardTitle>
            <CardDescription>
              共 {formatInteger(users.length)} 个用户，{formatInteger(pendingCount)} 个待审核，
              {formatInteger(approvedCount)} 个已通过，{formatInteger(rejectedCount)} 个已拒绝。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profilesResult.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  读取用户列表失败：{profilesResult.error.message}
                </AlertDescription>
              </Alert>
            ) : null}

            {!profilesResult.error && users.length === 0 ? (
              <EmptyState>暂时没有用户。</EmptyState>
            ) : null}

            {!profilesResult.error && users.length > 0 ? (
              <>
                <div className="hidden rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>邮箱</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>注册时间</TableHead>
                        <TableHead className="min-w-[300px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.email}</TableCell>
                          <TableCell>
                            <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                              {roleLabel(profile.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(profile.status)}>
                              {statusLabel(profile.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatInteger(profile.credits)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(profile.created_at)}
                          </TableCell>
                          <TableCell>
                            <AdminUserActionControls
                              userId={profile.id}
                              email={profile.email}
                              status={profile.status}
                              credits={profile.credits}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {users.map((profile) => (
                    <div key={profile.id} className="rounded-lg border bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="break-all text-sm font-medium">{profile.email}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            注册时间：{formatDate(profile.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                            {roleLabel(profile.role)}
                          </Badge>
                          <Badge variant={statusVariant(profile.status)}>
                            {statusLabel(profile.status)}
                          </Badge>
                          <Badge variant="outline">{formatInteger(profile.credits)} credits</Badge>
                        </div>
                        <AdminUserActionControls
                          userId={profile.id}
                          email={profile.email}
                          status={profile.status}
                          credits={profile.credits}
                        />
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
