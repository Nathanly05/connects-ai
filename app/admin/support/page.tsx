import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LifeBuoy, RotateCcw, Search } from "lucide-react";
import { updateSupportTicketStatusAction } from "@/app/admin/support/actions";
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
type ProfileStatus = "pending" | "approved" | "rejected";
type TicketStatus = "open" | "in_progress" | "resolved";

type SupportTicket = {
  id: string;
  user_id: string;
  email: string;
  type: string;
  title: string;
  message: string;
  contact: string | null;
  status: TicketStatus;
  created_at: string;
};

type AdminSupportPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
    q?: string;
    status?: string;
    type?: string;
  }>;
};

type TicketStatusFilter = "all" | TicketStatus;
type TicketTypeFilter = "all" | "账号问题" | "充值问题" | "AI回复问题" | "Credits问题" | "其他";

const ticketStatuses: Array<{
  value: TicketStatus;
  label: string;
}> = [
  { value: "open", label: "open" },
  { value: "in_progress", label: "in_progress" },
  { value: "resolved", label: "resolved" }
];

const ticketTypes: Array<{
  value: TicketTypeFilter;
  label: string;
}> = [
  { value: "all", label: "全部类型" },
  { value: "账号问题", label: "账号问题" },
  { value: "充值问题", label: "充值问题" },
  { value: "AI回复问题", label: "AI回复问题" },
  { value: "Credits问题", label: "Credits问题" },
  { value: "其他", label: "其他" }
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

function statusVariant(status: TicketStatus) {
  if (status === "resolved") {
    return "default";
  }

  if (status === "in_progress") {
    return "secondary";
  }

  return "outline";
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function getTicketStatusFilter(value?: string): TicketStatusFilter {
  if (value === "open" || value === "in_progress" || value === "resolved") {
    return value;
  }

  return "all";
}

function getTicketTypeFilter(value?: string): TicketTypeFilter {
  if (
    value === "账号问题" ||
    value === "充值问题" ||
    value === "AI回复问题" ||
    value === "Credits问题" ||
    value === "其他"
  ) {
    return value;
  }

  return "all";
}

function StatusForm({ ticket }: { ticket: SupportTicket }) {
  return (
    <form action={updateSupportTicketStatusAction} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="ticketId" value={ticket.id} />
      <select
        name="status"
        defaultValue={ticket.status}
        className="h-9 rounded-md border border-input bg-white px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="更新反馈状态"
      >
        {ticketStatuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline">
        更新
      </Button>
    </form>
  );
}

export default async function AdminSupportPage({
  searchParams
}: AdminSupportPageProps) {
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
  const statusFilter = getTicketStatusFilter(params.status);
  const typeFilter = getTicketTypeFilter(params.type);

  let ticketsQuery = supabase
    .from("support_tickets")
    .select("id, user_id, email, type, title, message, contact, status, created_at")
    .order("created_at", { ascending: false });

  if (searchQuery) {
    ticketsQuery = ticketsQuery.ilike("email", `%${searchQuery}%`);
  }

  if (statusFilter !== "all") {
    ticketsQuery = ticketsQuery.eq("status", statusFilter);
  }

  if (typeFilter !== "all") {
    ticketsQuery = ticketsQuery.eq("type", typeFilter);
  }

  const { data, error } = await ticketsQuery;

  const tickets = (data ?? []) as SupportTicket[];
  const openCount = tickets.filter((ticket) => ticket.status === "open").length;
  const progressCount = tickets.filter((ticket) => ticket.status === "in_progress").length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === "resolved").length;

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
              <LifeBuoy className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">反馈与客服</h1>
              <Badge variant="secondary">Support</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              查看用户提交的问题，并更新处理状态。
            </p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryItem label="open" value={openCount} />
          <SummaryItem label="in_progress" value={progressCount} />
          <SummaryItem label="resolved" value={resolvedCount} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>反馈列表</CardTitle>
            <CardDescription>当前结果 {tickets.length} 条反馈。</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action="/admin/support"
              className="mb-5 grid gap-3 rounded-lg border bg-secondary/40 p-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="按邮箱搜索反馈"
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
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="resolved">resolved</option>
              </select>
              <select
                name="type"
                defaultValue={typeFilter}
                className="h-11 rounded-md border border-input bg-white px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                aria-label="按问题类型筛选"
              >
                {ticketTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Button type="submit" className="w-full">
                搜索
              </Button>
              <Button asChild variant="outline" className="w-full bg-white">
                <a href="/admin/support">
                  <RotateCcw aria-hidden="true" />
                  重置
                </a>
              </Button>
            </form>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>反馈列表暂时无法加载，请稍后重试。</AlertDescription>
              </Alert>
            ) : null}

            {!error && tickets.length === 0 ? (
              <div className="rounded-lg border bg-secondary/50 px-4 py-10 text-center text-sm text-muted-foreground">
                暂无反馈。
              </div>
            ) : null}

            {!error && tickets.length > 0 ? (
              <>
                <div className="hidden rounded-lg border xl:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>邮箱</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>标题</TableHead>
                        <TableHead>内容</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>时间</TableHead>
                        <TableHead className="min-w-[180px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="min-w-[180px] font-medium">
                            {ticket.email}
                          </TableCell>
                          <TableCell>{ticket.type}</TableCell>
                          <TableCell className="min-w-[180px]">{ticket.title}</TableCell>
                          <TableCell className="max-w-[340px] whitespace-pre-wrap text-muted-foreground">
                            {ticket.message}
                            {ticket.contact ? (
                              <span className="mt-2 block text-xs text-foreground">
                                联系方式：{ticket.contact}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge>
                          </TableCell>
                          <TableCell className="min-w-[140px] text-muted-foreground">
                            {formatDate(ticket.created_at)}
                          </TableCell>
                          <TableCell>
                            <StatusForm ticket={ticket} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 xl:hidden">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-lg border bg-white p-4 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-all text-sm font-medium">{ticket.email}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(ticket.created_at)}
                            </p>
                          </div>
                          <Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{ticket.type}</Badge>
                          <Badge variant="secondary">{ticket.title}</Badge>
                        </div>
                        <p className="whitespace-pre-wrap rounded-md bg-secondary/60 px-3 py-2 text-sm leading-6 text-muted-foreground">
                          {ticket.message}
                        </p>
                        {ticket.contact ? (
                          <p className="text-sm text-muted-foreground">
                            联系方式：<span className="text-foreground">{ticket.contact}</span>
                          </p>
                        ) : null}
                        <StatusForm ticket={ticket} />
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
