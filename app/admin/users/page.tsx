import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RotateCcw, Search, ShieldCheck, UsersRound } from "lucide-react";
import { UserActionControls } from "@/components/admin/user-action-controls";
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
import { Input } from "@/components/ui/input";
import { PageToast } from "@/components/ui/page-toast";
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

type Profile = {
  id: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  credits: number;
  signup_ip: string | null;
  device_id: string | null;
  free_credits_granted: boolean;
  risk_note: string | null;
  created_at: string;
};

type UsersPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
    q?: string;
    status?: string;
    role?: string;
    risk?: string;
  }>;
};

type StatusFilter = "all" | ProfileStatus;
type RoleFilter = "all" | ProfileRole;
type RiskFilter = "all" | "risky" | "free_granted" | "free_not_granted";

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

function roleLabel(role: ProfileRole) {
  return role === "admin" ? "管理员" : "用户";
}

function statusLabel(status: ProfileStatus) {
  const labels: Record<ProfileStatus, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已拒绝",
    banned: "已封禁"
  };

  return labels[status];
}

function statusVariant(status: ProfileStatus) {
  if (status === "approved") {
    return "default";
  }

  if (status === "rejected") {
    return "outline";
  }

  if (status === "banned") {
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

function getStatusFilter(value?: string): StatusFilter {
  if (value === "pending" || value === "approved" || value === "rejected" || value === "banned") {
    return value;
  }

  return "all";
}

function getRiskFilter(value?: string): RiskFilter {
  if (value === "risky" || value === "free_granted" || value === "free_not_granted") {
    return value;
  }

  return "all";
}

function shortDeviceId(deviceId?: string | null) {
  return deviceId ? deviceId.slice(0, 8) : "未记录";
}

function getRoleFilter(value?: string): RoleFilter {
  if (value === "user" || value === "admin") {
    return value;
  }

  return "all";
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
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

  const searchQuery = params.q?.trim() ?? "";
  const statusFilter = getStatusFilter(params.status);
  const roleFilter = getRoleFilter(params.role);
  const riskFilter = getRiskFilter(params.risk);
  const hasFilters =
    Boolean(searchQuery) || statusFilter !== "all" || roleFilter !== "all" || riskFilter !== "all";

  let usersQuery = supabase
    .from("profiles")
    .select("id, email, role, status, credits, signup_ip, device_id, free_credits_granted, risk_note, created_at")
    .order("created_at", { ascending: false });

  if (searchQuery) {
    usersQuery = usersQuery.ilike("email", `%${searchQuery}%`);
  }

  if (statusFilter !== "all") {
    usersQuery = usersQuery.eq("status", statusFilter);
  }

  if (roleFilter !== "all") {
    usersQuery = usersQuery.eq("role", roleFilter);
  }

  if (riskFilter === "risky") {
    usersQuery = usersQuery.not("risk_note", "is", null);
  }

  if (riskFilter === "free_granted") {
    usersQuery = usersQuery.eq("free_credits_granted", true);
  }

  if (riskFilter === "free_not_granted") {
    usersQuery = usersQuery.eq("free_credits_granted", false);
  }

  const { data, error } = await usersQuery;

  const users = (data ?? []) as Profile[];
  const pendingCount = users.filter((profile) => profile.status === "pending").length;
  const approvedCount = users.filter((profile) => profile.status === "approved").length;
  const rejectedCount = users.filter((profile) => profile.status === "rejected").length;
  const bannedCount = users.filter((profile) => profile.status === "banned").length;

  return (
    <main className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AppNav active="admin" />
        <PageToast
          message={params.error ?? params.success}
          variant={params.error ? "error" : "success"}
        />

        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">管理员后台</h1>
              <Badge variant="secondary">用户审核</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              审核内测申请，并手动管理用户 credits。
            </p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryItem label="待审核" value={pendingCount} />
          <SummaryItem label="已通过" value={approvedCount} />
          <SummaryItem label="已拒绝" value={rejectedCount} />
          <SummaryItem label="已封禁" value={bannedCount} />
        </div>

        {!hasFilters && pendingCount === 0 ? (
          <Alert>
            <AlertDescription>暂无待审核用户。</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UsersRound className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>
              当前结果 {users.length} 个用户。批准 pending 用户会按风控规则发放 10 credits 免费额度。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action="/admin/users"
              className="mb-5 grid gap-3 rounded-lg border bg-secondary/40 p-3 lg:grid-cols-[minmax(0,1fr)_160px_140px_190px_auto_auto]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="按邮箱搜索用户"
                  className="pl-9"
                />
              </div>
              <select
                name="status"
                defaultValue={statusFilter}
                className="h-11 rounded-md border border-input bg-white px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                aria-label="按状态筛选"
              >
                <option value="all">全部状态</option>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="banned">banned</option>
              </select>
              <select
                name="role"
                defaultValue={roleFilter}
                className="h-11 rounded-md border border-input bg-white px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                aria-label="按角色筛选"
              >
                <option value="all">全部角色</option>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <select
                name="risk"
                defaultValue={riskFilter}
                className="h-11 rounded-md border border-input bg-white px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                aria-label="按风控状态筛选"
              >
                <option value="all">全部风控</option>
                <option value="risky">有风险</option>
                <option value="free_granted">已领取免费额度</option>
                <option value="free_not_granted">未领取免费额度</option>
              </select>
              <Button type="submit" className="w-full">
                搜索
              </Button>
              <Button asChild variant="outline" className="w-full bg-white">
                <a href="/admin/users">
                  <RotateCcw aria-hidden="true" />
                  重置
                </a>
              </Button>
            </form>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>用户列表暂时无法加载，请稍后重试。</AlertDescription>
              </Alert>
            ) : null}

            {!error && users.length === 0 ? (
              <div className="rounded-lg border bg-secondary/50 px-4 py-10 text-center text-sm text-muted-foreground">
                暂无用户。
              </div>
            ) : null}

            {!error && users.length > 0 ? (
              <>
                <div className="hidden overflow-x-auto rounded-lg border xl:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>邮箱</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>注册 IP</TableHead>
                        <TableHead>设备 ID</TableHead>
                        <TableHead>免费额度</TableHead>
                        <TableHead>风险备注</TableHead>
                        <TableHead>注册时间</TableHead>
                        <TableHead className="min-w-[260px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.email}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(profile.status)}>
                              {statusLabel(profile.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{profile.credits}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {profile.signup_ip ?? "未记录"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {shortDeviceId(profile.device_id)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={profile.free_credits_granted ? "default" : "outline"}>
                              {profile.free_credits_granted ? "已发放" : "未发放"}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[180px] text-muted-foreground">
                            {profile.risk_note ?? "无"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(profile.created_at)}
                          </TableCell>
                          <TableCell>
                            <UserActionControls
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

                <div className="grid gap-3 xl:hidden">
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
                          <Badge variant="outline">{profile.credits} credits</Badge>
                          <Badge variant={profile.free_credits_granted ? "default" : "outline"}>
                            {profile.free_credits_granted ? "已发免费额度" : "未发免费额度"}
                          </Badge>
                        </div>
                        <div className="rounded-md bg-secondary/60 px-3 py-2 text-sm leading-6 text-muted-foreground">
                          <p>注册 IP：{profile.signup_ip ?? "未记录"}</p>
                          <p>设备 ID：{shortDeviceId(profile.device_id)}</p>
                          <p>风险备注：{profile.risk_note ?? "无"}</p>
                        </div>
                        <UserActionControls
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
