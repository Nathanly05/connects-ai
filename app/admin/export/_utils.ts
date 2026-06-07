import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AdminAuthResult =
  | {
      ok: true;
      supabase: SupabaseServerClient;
    }
  | {
      ok: false;
      response: Response;
    };

export async function requireApprovedAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: new Response("请先登录。", { status: 401 })
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" || profile.status !== "approved") {
    return {
      ok: false,
      response: new Response("没有权限导出数据。", { status: 403 })
    };
  }

  return {
    ok: true,
    supabase
  };
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvResponse(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
) {
  const csv = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(","))
  ].join("\r\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

export async function emailMapForUsers(
  supabase: SupabaseServerClient,
  userIds: string[]
) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return new Map<string, string>();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", uniqueUserIds);

  return new Map((data ?? []).map((profile) => [profile.id as string, profile.email as string]));
}

export function exportErrorResponse() {
  return new Response("导出失败，请稍后再试。", { status: 500 });
}
