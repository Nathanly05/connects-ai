"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type GlobePayPackage = "Starter" | "Pro" | "Max";

const packageCredits: Record<GlobePayPackage, number> = {
  Starter: 100,
  Pro: 500,
  Max: 1500
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(type: "success" | "error", message: string): never {
  redirect(`/recharge/request?${type}=${encodeURIComponent(message)}`);
}

function isGlobePayPackage(value: string): value is GlobePayPackage {
  return value === "Starter" || value === "Pro" || value === "Max";
}

export async function submitGlobePayRechargeRequestAction(formData: FormData) {
  const packageName = getString(formData, "packageName");
  const amount = Number(getString(formData, "amount"));
  const paymentTime = getString(formData, "paymentTime");
  const remark = getString(formData, "remark");
  const screenshotUrl = getString(formData, "screenshotUrl");

  if (!isGlobePayPackage(packageName)) {
    redirectWithMessage("error", "请选择有效套餐。");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    redirectWithMessage("error", "请输入有效付款金额。");
  }

  if (!paymentTime) {
    redirectWithMessage("error", "请选择付款时间。");
  }

  const parsedPaymentTime = new Date(paymentTime);

  if (Number.isNaN(parsedPaymentTime.getTime())) {
    redirectWithMessage("error", "付款时间格式不正确。");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const email = user.email;

  if (!email) {
    redirectWithMessage("error", "当前账号缺少邮箱，无法提交充值申请。");
  }

  const { error } = await supabase.from("recharge_requests").insert({
    user_id: user.id,
    email,
    package_name: packageName,
    amount,
    credits: packageCredits[packageName],
    payment_time: parsedPaymentTime.toISOString(),
    remark: remark || null,
    screenshot_url: screenshotUrl || null,
    status: "pending"
  });

  if (error) {
    redirectWithMessage("error", "提交失败，请稍后重试或联系管理员。");
  }

  redirectWithMessage("success", "您的充值申请已提交，请等待管理员审核。");
}
