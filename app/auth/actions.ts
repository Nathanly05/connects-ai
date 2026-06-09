"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileStatus = "pending" | "approved" | "rejected" | "banned";

type SignupRiskCounts = {
  ip_count: number;
  device_count: number;
};

const frequentSignupMessage = "注册请求过于频繁，请稍后再试或联系管理员。";
const bannedMessage = "账号已被限制使用，如有疑问请联系客服。";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getRequestContext() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ip =
    headerStore.get("cf-connecting-ip") ||
    headerStore.get("x-real-ip") ||
    forwardedFor?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent = headerStore.get("user-agent") || "unknown";

  return {
    ip,
    userAgent
  };
}

function authErrorMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("invalid login credentials")) {
    return "邮箱或密码不正确，请重新输入。";
  }

  if (
    lowerMessage.includes("email not confirmed") ||
    lowerMessage.includes("email_not_confirmed") ||
    lowerMessage.includes("not confirmed")
  ) {
    return "请先验证邮箱后再登录。";
  }

  if (lowerMessage.includes("already registered") || lowerMessage.includes("already exists")) {
    return "这个邮箱可能已经注册，请直接登录。";
  }

  return "操作失败，请稍后再试。";
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectByStatus(status?: ProfileStatus | null): never {
  if (status === "approved") {
    redirect("/chat");
  }

  if (status === "rejected") {
    redirect("/auth/rejected");
  }

  if (status === "banned") {
    redirectWithError("/auth/login", bannedMessage);
  }

  redirect("/auth/pending");
}

export async function signUpAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const deviceId = getString(formData, "deviceId") || null;
  const { ip, userAgent } = await getRequestContext();

  if (!email || !password) {
    redirectWithError("/auth/register", "请填写邮箱和密码。");
  }

  if (password.length < 6) {
    redirectWithError("/auth/register", "密码至少需要 6 位。");
  }

  const supabase = await createClient();
  const { data: riskRows, error: riskError } = await supabase.rpc("get_signup_risk_counts", {
    p_ip_address: ip,
    p_device_id: deviceId
  });
  const risk = Array.isArray(riskRows)
    ? (riskRows[0] as SignupRiskCounts | undefined)
    : (riskRows as SignupRiskCounts | null);

  if (!riskError && ((risk?.ip_count ?? 0) >= 2 || (deviceId && (risk?.device_count ?? 0) >= 1))) {
    const { data: blockedSignUpData } = await supabase.auth.signUp({
      email,
      password
    });

    await supabase.rpc("record_signup_attempt", {
      p_email: email,
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_device_id: deviceId,
      p_success: false,
      p_reason: frequentSignupMessage,
      p_user_id: blockedSignUpData.user?.id ?? null
    });

    await supabase.auth.signOut();
    redirectWithError("/auth/register", frequentSignupMessage);
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    await supabase.rpc("record_signup_attempt", {
      p_email: email,
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_device_id: deviceId,
      p_success: false,
      p_reason: authErrorMessage(error.message),
      p_user_id: null
    });

    redirectWithError("/auth/register", authErrorMessage(error.message));
  }

  await supabase.rpc("record_signup_attempt", {
    p_email: email,
    p_ip_address: ip,
    p_user_agent: userAgent,
    p_device_id: deviceId,
    p_success: true,
    p_reason: null,
    p_user_id: signUpData.user?.id ?? null
  });

  redirect("/auth/pending");
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const { ip } = await getRequestContext();

  if (!email || !password) {
    redirectWithError("/auth/login", "请填写邮箱和密码。");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    redirectWithError("/auth/login", authErrorMessage(error?.message ?? ""));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    redirectWithError("/auth/login", "账号状态暂时无法确认，请稍后再试。");
  }

  await supabase
    .from("profiles")
    .update({
      last_login_ip: ip,
      last_login_at: new Date().toISOString()
    })
    .eq("id", data.user.id);

  if (profile?.status === "banned") {
    await supabase.auth.signOut();
    redirectWithError("/auth/login", bannedMessage);
  }

  redirectByStatus(profile?.status as ProfileStatus | undefined);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
