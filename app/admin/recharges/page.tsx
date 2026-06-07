import { redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { RechargeReviewActions } from "@/components/admin/recharge-review-actions";
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

type ProfileRole = "user" | "admin";
type ProfileStatus = "pending" | "approved" | "rejected";
type RechargeStatus = "pending" | "approved" | "rejected";

type RechargeRequest = {
  id: string;
  user_id: string;
  email: string | null;
  package_name: string | null;
  amount: number;
  payment_time: string | null;
  remark: string | null;
  screenshot_url: string | null;
  status: RechargeStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reject_reason: string | null;
};

type AdminRechargesPageProps = {
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

function formatDate(value?: string | null) {
  if (!value) {
    return "未填写";
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

function statusLabel(status: RechargeStatus) {
  const labels: Record<RechargeStatus, string> = {
    pending: "待审核",
    approved: "已批准",
    rejected: "已拒绝"
  };

  return labels[status];
}

function statusVariant(status: RechargeStatus) {
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

export default async function AdminRechargesPage({
  searchParams
}: AdminRechargesPageProps) {
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
    .from("recharge_requests")
    .select(
      "id, user_id, email, package_name, amount, payment_time, remark, screenshot_url, status, created_at, reviewed_at, reviewed_by, reject_reason"
    )
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as RechargeRequest[];
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const approvedCount = requests.filter((request) => request.status === "approved").length;
  const rejectedCount = requests.filter((request) => request.status === "rejected").length;

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
            <div className="flex flex-wrap items-center gap-2">
              <ReceiptText className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">充值申请管理</h1>
              <Badge variant="secondary">GlobePay</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              审核微信/支付宝扫码付款申请，批准后自动发放 credits。
            </p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryItem label="待审核" value={pendingCount} />
          <SummaryItem label="已批准" value={approvedCount} />
          <SummaryItem label="已拒绝" value={rejectedCount} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>充值申请</CardTitle>
            <CardDescription>共 {requests.length} 条申请。</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>充值申请暂时无法加载，请稍后重试。</AlertDescription>
              </Alert>
            ) : null}

            {!error && requests.length === 0 ? (
              <div className="rounded-lg border bg-secondary/50 px-4 py-10 text-center text-sm text-muted-foreground">
                暂无充值申请。
              </div>
            ) : null}

            {!error && requests.length > 0 ? (
              <>
                <div className="hidden rounded-lg border lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>邮箱</TableHead>
                        <TableHead>套餐</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>申请时间</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="min-w-[170px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {request.email ?? request.user_id}
                          </TableCell>
                          <TableCell>{request.package_name ?? "未填写"}</TableCell>
                          <TableCell>£{Number(request.amount).toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(request.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(request.status)}>
                              {statusLabel(request.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.status === "pending" ? (
                              <RechargeReviewActions requestId={request.id} />
                            ) : (
                              <span className="text-sm text-muted-foreground">已处理</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 lg:hidden">
                  {requests.map((request) => (
                    <div key={request.id} className="rounded-lg border bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="break-all text-sm font-medium">
                            {request.email ?? request.user_id}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            申请时间：{formatDate(request.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{request.package_name ?? "未填写"}</Badge>
                          <Badge variant="outline">£{Number(request.amount).toFixed(2)}</Badge>
                          <Badge variant={statusVariant(request.status)}>
                            {statusLabel(request.status)}
                          </Badge>
                        </div>
                        <div className="rounded-md bg-secondary/60 px-3 py-2 text-sm leading-6 text-muted-foreground">
                          <p>付款时间：{formatDate(request.payment_time)}</p>
                          {request.remark ? <p>备注：{request.remark}</p> : null}
                          {request.screenshot_url ? (
                            <p>
                              截图链接：{" "}
                              <a
                                href={request.screenshot_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                查看
                              </a>
                            </p>
                          ) : null}
                          {request.reject_reason ? <p>拒绝原因：{request.reject_reason}</p> : null}
                        </div>
                        {request.status === "pending" ? (
                          <RechargeReviewActions requestId={request.id} />
                        ) : null}
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
