"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInteger(value: string) {
  const amount = Number(value);

  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

function redirectWithMessage(type: "success" | "error", message: string): never {
  revalidatePath("/admin/users");
  redirect(`/admin/users?${type}=${encodeURIComponent(message)}`);
}

function friendlyError(message?: string) {
  if (!message) {
    return "操作失败，请稍后再试。";
  }

  if (message.includes("Credits cannot be less than 0")) {
    return "扣减失败：用户 credits 不能小于 0。";
  }

  if (message.includes("Only approved admins")) {
    return "只有已通过审核的管理员可以执行这个操作。";
  }

  if (message.includes("function public.admin_remove_credits")) {
    return "Credits 操作暂时不可用，请稍后再试。";
  }

  return "操作失败，请稍后再试。";
}

export async function approveUserAction(formData: FormData) {
  const userId = getString(formData, "userId");

  if (!userId) {
    redirectWithMessage("error", "缺少用户 ID。");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_approve_user", {
    p_user_id: userId
  });

  if (error) {
    redirectWithMessage("error", friendlyError(error.message));
  }

  redirectWithMessage("success", "已批准用户，并自动增加 50 credits。");
}

export async function rejectUserAction(formData: FormData) {
  const userId = getString(formData, "userId");

  if (!userId) {
    redirectWithMessage("error", "缺少用户 ID。");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reject_user", {
    p_user_id: userId
  });

  if (error) {
    redirectWithMessage("error", friendlyError(error.message));
  }

  redirectWithMessage("success", "已拒绝该用户申请。");
}

export async function addCreditsAction(formData: FormData) {
  const userId = getString(formData, "userId");
  const amount = parsePositiveInteger(getString(formData, "amount"));
  const reason = getString(formData, "reason") || "管理员手动充值";

  if (!userId) {
    redirectWithMessage("error", "缺少用户 ID。");
  }

  if (!amount) {
    redirectWithMessage("error", "credits 数量必须是大于 0 的整数。");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason
  });

  if (error) {
    redirectWithMessage("error", friendlyError(error.message));
  }

  redirectWithMessage("success", `已为用户增加 ${amount} credits。`);
}

export async function removeCreditsAction(formData: FormData) {
  const userId = getString(formData, "userId");
  const amount = parsePositiveInteger(getString(formData, "amount"));
  const reason = getString(formData, "reason") || "管理员手动扣减";

  if (!userId) {
    redirectWithMessage("error", "缺少用户 ID。");
  }

  if (!amount) {
    redirectWithMessage("error", "credits 数量必须是大于 0 的整数。");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_remove_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason
  });

  if (error) {
    redirectWithMessage("error", friendlyError(error.message));
  }

  redirectWithMessage("success", `已为用户减少 ${amount} credits。`);
}
