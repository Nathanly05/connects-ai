"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(type: "success" | "error", message: string): never {
  revalidatePath("/admin/recharges");
  redirect(`/admin/recharges?${type}=${encodeURIComponent(message)}`);
}

function friendlyError(message?: string) {
  if (!message) {
    return "操作失败，请稍后再试。";
  }

  if (message.includes("already reviewed")) {
    return "该充值申请已经审核过。";
  }

  if (message.includes("Only approved admins")) {
    return "只有已通过审核的管理员可以操作充值申请。";
  }

  return message;
}

export async function approveRechargeAction(formData: FormData) {
  const requestId = getString(formData, "requestId");

  if (!requestId) {
    redirectWithMessage("error", "缺少充值申请 ID。");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_approve_recharge", {
    p_request_id: requestId
  });

  if (error) {
    redirectWithMessage("error", friendlyError(error.message));
  }

  redirectWithMessage("success", "充值申请已批准，credits 已发放。");
}

export async function rejectRechargeAction(formData: FormData) {
  const requestId = getString(formData, "requestId");

  if (!requestId) {
    redirectWithMessage("error", "缺少充值申请 ID。");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reject_recharge", {
    p_request_id: requestId
  });

  if (error) {
    redirectWithMessage("error", friendlyError(error.message));
  }

  redirectWithMessage("success", "充值申请已拒绝。");
}
