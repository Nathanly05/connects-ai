import { redirect } from "next/navigation";
import { Check, ExternalLink, ReceiptText, X } from "lucide-react";
import {
  approveRechargeAction,
  rejectRechargeAction
} from "@/app/admin/recharges/actions";
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

type ProfileRole = "user" | "admin";
type ProfileStatus = "pending" | "approved" | "rejected";
type RechargeStatus = "pending" | "approved" | "rejected";

type RechargeRequest = {
  id: string;
  user_id: string;
  amount: number;
  credits: number;
  screenshot_url: string | null;
  note: string | null;
  status: RechargeStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
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

function ReviewActions({ requestId }: { requestId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={approveRechargeAction}>
        <input type="hidden" name="requestId" value={requestId} />
        <Button type="submit" size="sm">
          <Check aria-hidden="true" />
          批准
        </Button>
      </form>
      <form action={rejectRechargeAction}>
        <input type="hidden" name="requestId" value={requestId} />
        <Button type="submit" variant="destructive" size="sm">
          <X aria-hidden="true" />
          拒绝
        </Button>
      </form>
    </div>
  );
}

function ScreenshotLink({ url }: { url: string | null }) {
  if (!url) {
    return <span className="text-muted-foreground">未上传</span>;
  }

  return (
    <Button asChild variant="outline" size="sm">
      <a href={url} target="_blank" rel="noreferrer">
        <ExternalLink aria-hidden="true" />
        查看截图
      </a>
    </Button>
  );
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
    .select("id, user_id, amount, credits, screenshot_url, note, status, created_at, reviewed_at, reviewed_by")
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as RechargeRequest[];
  const userIds = [...new Set(requests.map((request) => request.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, email").in("id", userIds)
      : { data: [] };
  const emailByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.id as string, profile.email as string])
  );
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const approvedCount = requests.filter((request) => request.status === "approved").length;
  const rejectedCount = requests.filter((request) => request.status === "rejected").length;

  return (
    <main className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ReceiptText className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">充值审核</h1>
              <Badge variant="secondary">GlobePay</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              审核用户上传的付款截图，批准后自动发放 credits。
            </p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryItem label="待审核" value={pendingCount} />
          <SummaryItem label="已批准" value={approvedCount} />
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
            <CardTitle>充值申请</CardTitle>
            <CardDescription>共 {requests.length} 条申请。</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  读取充值申请失败：{error.message}
                </AlertDescription>
              </Alert>
            ) : null}

            {!error && requests.length === 0 ? (
              <div className="rounded-lg border bg-secondary/50 px-4 py-10 text-center text-sm text-muted-foreground">
                暂时没有充值申请。
              </div>
            ) : null}

            {!error && requests.length > 0 ? (
              <>
                <div className="hidden rounded-lg border lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>邮箱</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>截图</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>时间</TableHead>
                        <TableHead className="min-w-[170px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {emailByUserId.get(request.user_id) ?? request.user_id}
                          </TableCell>
                          <TableCell>{Number(request.amount).toFixed(1)} RMB</TableCell>
                          <TableCell>{request.credits}</TableCell>
                          <TableCell>
                            <ScreenshotLink url={request.screenshot_url} />
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(request.status)}>
                              {statusLabel(request.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(request.created_at)}
                          </TableCell>
                          <TableCell>
                            {request.status === "pending" ? (
                              <ReviewActions requestId={request.id} />
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
                            {emailByUserId.get(request.user_id) ?? request.user_id}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(request.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{Number(request.amount).toFixed(1)} RMB</Badge>
                          <Badge variant="outline">{request.credits} Credits</Badge>
                          <Badge variant={statusVariant(request.status)}>
                            {statusLabel(request.status)}
                          </Badge>
                        </div>
                        {request.note ? (
                          <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm leading-6 text-muted-foreground">
                            {request.note}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <ScreenshotLink url={request.screenshot_url} />
                          {request.status === "pending" ? (
                            <ReviewActions requestId={request.id} />
                          ) : null}
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
