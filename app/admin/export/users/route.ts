import { csvResponse, exportErrorResponse, requireApprovedAdmin } from "@/app/admin/export/_utils";

export const dynamic = "force-dynamic";

type ProfileExportRow = {
  email: string;
  role: string;
  status: string;
  credits: number;
  created_at: string;
};

export async function GET() {
  const auth = await requireApprovedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("email, role, status, credits, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return exportErrorResponse();
  }

  const rows = ((data ?? []) as ProfileExportRow[]).map((profile) => [
    profile.email,
    profile.role,
    profile.status,
    profile.credits,
    profile.created_at
  ]);

  return csvResponse(
    "connects-ai-users.csv",
    ["邮箱", "角色", "状态", "Credits", "创建时间"],
    rows
  );
}
