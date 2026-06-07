import {
  csvResponse,
  emailMapForUsers,
  exportErrorResponse,
  requireApprovedAdmin
} from "@/app/admin/export/_utils";

export const dynamic = "force-dynamic";

type StripeOrderExportRow = {
  user_id: string;
  plan_name: string;
  amount_gbp: number | string;
  credits: number;
  status: string;
  created_at: string;
};

export async function GET() {
  const auth = await requireApprovedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.supabase
    .from("payment_orders")
    .select("user_id, plan_name, amount_gbp, credits, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return exportErrorResponse();
  }

  const orders = (data ?? []) as StripeOrderExportRow[];
  const emailByUserId = await emailMapForUsers(
    auth.supabase,
    orders.map((order) => order.user_id)
  );
  const rows = orders.map((order) => [
    emailByUserId.get(order.user_id) ?? order.user_id,
    order.plan_name,
    order.amount_gbp,
    order.credits,
    order.status,
    order.created_at
  ]);

  return csvResponse(
    "connects-ai-stripe-orders.csv",
    ["邮箱", "套餐", "金额 GBP", "Credits", "状态", "创建时间"],
    rows
  );
}
