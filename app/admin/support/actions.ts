"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type TicketStatus = "open" | "in_progress" | "resolved";

const ticketStatuses: TicketStatus[] = ["open", "in_progress", "resolved"];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isTicketStatus(value: string): value is TicketStatus {
  return ticketStatuses.includes(value as TicketStatus);
}

function redirectWithMessage(type: "success" | "error", message: string): never {
  revalidatePath("/admin/support");
  redirect(`/admin/support?${type}=${encodeURIComponent(message)}`);
}

export async function updateSupportTicketStatusAction(formData: FormData) {
  const ticketId = getString(formData, "ticketId");
  const status = getString(formData, "status");

  if (!ticketId) {
    redirectWithMessage("error", "缺少反馈 ID。");
  }

  if (!isTicketStatus(status)) {
    redirectWithMessage("error", "请选择有效状态。");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", ticketId);

  if (error) {
    redirectWithMessage("error", "状态更新失败，请稍后再试。");
  }

  redirectWithMessage("success", "反馈状态已更新。");
}
