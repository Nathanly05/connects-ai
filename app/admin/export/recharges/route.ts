import { csvResponse, exportErrorResponse, requireApprovedAdmin } from "@/app/admin/export/_utils";

export const dynamic = "force-dynamic";

type RechargeExportRow = {
  email: string | null;
  user_id: string;
  package_name: string | null;
  amount: number | string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

export async function GET() {
  const auth = await requireApprovedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.supabase
    .from("recharge_requests")
    .select("email, user_id, package_name, amount, status, created_at, reviewed_at")
    .order("created_at", { ascending: false });

  if (error) {
    return exportErrorResponse();
  }

  const rows = ((data ?? []) as RechargeExportRow[]).map((request) => [
    request.email ?? request.user_id,
    request.package_name ?? "",
    request.amount,
    request.status,
    request.created_at,
    request.reviewed_at ?? ""
  ]);

  return csvResponse(
    "connects-ai-globepay-recharges.csv",
    ["邮箱", "套餐", "金额", "状态", "创建时间", "审核时间"],
    rows
  );
}
