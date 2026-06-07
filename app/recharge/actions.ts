"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { getRechargePlan } from "@/lib/recharge-plans";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(type: "success" | "error", message: string): never {
  redirect(`/recharge?${type}=${encodeURIComponent(message)}`);
}

function safeExtension(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  return byType[file.type] ?? "jpg";
}

export async function submitRechargeRequestAction(formData: FormData) {
  const plan = getRechargePlan(getString(formData, "planId"));
  const note = getString(formData, "note") || null;
  const screenshot = formData.get("screenshot");

  if (!(screenshot instanceof File) || screenshot.size === 0) {
    redirectWithMessage("error", "请上传付款截图。");
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(screenshot.type)) {
    redirectWithMessage("error", "付款截图仅支持 JPG、PNG 或 WebP。");
  }

  if (screenshot.size > 5 * 1024 * 1024) {
    redirectWithMessage("error", "付款截图不能超过 5MB。");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const filePath = `${user.id}/${randomUUID()}.${safeExtension(screenshot)}`;
  const fileBuffer = Buffer.from(await screenshot.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(filePath, fileBuffer, {
      contentType: screenshot.type,
      upsert: false
    });

  if (uploadError) {
    redirectWithMessage("error", "提交失败，请稍后重试或联系管理员。");
  }

  const { data: publicUrlData } = supabase.storage
    .from("payment-proofs")
    .getPublicUrl(filePath);

  const { error: insertError } = await supabase.from("recharge_requests").insert({
    user_id: user.id,
    amount: plan.amount,
    credits: plan.credits,
    screenshot_url: publicUrlData.publicUrl,
    note,
    status: "pending"
  });

  if (insertError) {
    redirectWithMessage("error", "提交失败，请稍后重试或联系管理员。");
  }

  redirectWithMessage("success", "充值申请已提交，请等待管理员审核。");
}
