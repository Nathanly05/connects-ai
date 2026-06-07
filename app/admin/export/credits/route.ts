import {
  csvResponse,
  emailMapForUsers,
  exportErrorResponse,
  requireApprovedAdmin
} from "@/app/admin/export/_utils";

export const dynamic = "force-dynamic";

type CreditLogExportRow = {
  user_id: string;
  amount: number;
  reason: string | null;
  created_at: string;
};

export async function GET() {
  const auth = await requireApprovedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.supabase
    .from("credit_logs")
    .select("user_id, amount, reason, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return exportErrorResponse();
  }

  const logs = (data ?? []) as CreditLogExportRow[];
  const emailByUserId = await emailMapForUsers(
    auth.supabase,
    logs.map((log) => log.user_id)
  );
  const rows = logs.map((log) => [
    emailByUserId.get(log.user_id) ?? log.user_id,
    log.amount,
    log.reason ?? "",
    log.created_at
  ]);

  return csvResponse(
    "connects-ai-credit-logs.csv",
    ["邮箱", "变动数量", "原因", "创建时间"],
    rows
  );
}
