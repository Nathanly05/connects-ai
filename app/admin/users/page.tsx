import { redirect } from "next/navigation";
import { ShieldCheck, UsersRound } from "lucide-react";
import { UserActionControls } from "@/components/admin/user-action-controls";
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

type ProfileRole = "user" | "admin";
type ProfileStatus = "pending" | "approved" | "rejected";

type Profile = {
  id: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  credits: number;
  created_at: string;
};

type UsersPageProps = {
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

function statusVariant(status: ProfileStatus) {
  if (status === "approved") {
    return "default";
  }

  if (status === "rejected") {
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

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, status, credits, created_at")
    .order("created_at", { ascending: false });

  const users = (data ?? []) as Profile[];
  const pendingCount = users.filter((profile) => profile.status === "pending").length;
  const approvedCount = users.filter((profile) => profile.status === "approved").length;
  const rejectedCount = users.filter((profile) => profile.status === "rejected").length;

  return (
    <main className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
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

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryItem label="待审核" value={pendingCount} />
          <SummaryItem label="已通过" value={approvedCount} />
          <SummaryItem label="已拒绝" value={rejectedCount} />
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

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UsersRound className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>
              共 {users.length} 个用户。批准 pending 用户会调用数据库函数并自动增加 50 credits。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  读取用户列表失败：{error.message}
                </AlertDescription>
              </Alert>
            ) : null}

            {!error && users.length === 0 ? (
              <div className="rounded-lg border bg-secondary/50 px-4 py-10 text-center text-sm text-muted-foreground">
                暂时没有用户。
              </div>
            ) : null}

            {!error && users.length > 0 ? (
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
                        <TableHead className="min-w-[260px]">操作</TableHead>
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
                          <TableCell>{profile.credits}</TableCell>
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
                          <Badge variant="outline">{profile.credits} credits</Badge>
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
