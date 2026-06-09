"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkIpIntelligence, type IpIntelligenceResult } from "@/lib/ip-intelligence";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";

type ProfileStatus = "pending" | "approved" | "rejected" | "banned";

type RegistrationGuardCounts = {
  attempt_count_hour: number;
  successful_ip_24h: number;
  successful_ip_lifetime: number;
};

const frequentSignupMessage = "注册请求过于频繁，请稍后再试或联系管理员。";
const bannedMessage = "账号已被限制使用，如有疑问请联系客服。";
const turnstileErrorMessage = "请先完成人机验证";
const suspiciousNetworkMessage = "检测到网络环境异常，请关闭 VPN 或代理后再试。";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RequestContext = {
  ip: string;
  userAgent: string;
  origin: string;
};

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
  const origin =
    headerStore.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  return {
    ip,
    userAgent,
    origin
  } satisfies RequestContext;
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

function toIpIntelligenceMetadata(ipIntelligence?: IpIntelligenceResult) {
  if (!ipIntelligence) {
    return {};
  }

  return {
    checked: ipIntelligence.checked,
    provider: ipIntelligence.provider,
    suspicious: ipIntelligence.suspicious,
    reason: ipIntelligence.reason,
    data: ipIntelligence.data
  };
}

async function recordAuditLog(
  supabase: SupabaseServerClient,
  {
    userId = null,
    email,
    eventType,
    ip,
    userAgent,
    deviceId = null,
    metadata = {}
  }: {
    userId?: string | null;
    email: string;
    eventType: string;
    ip: string;
    userAgent: string;
    deviceId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.rpc("record_audit_log", {
    p_user_id: userId,
    p_email: email,
    p_event_type: eventType,
    p_ip_address: ip,
    p_user_agent: userAgent,
    p_device_id: deviceId,
    p_metadata: metadata
  });
}

async function recordSignupAttempt(
  supabase: SupabaseServerClient,
  {
    email,
    ip,
    userAgent,
    deviceId,
    success,
    reason,
    userId = null,
    ipIntelligence,
    blockedByIpIntelligence = false
  }: {
    email: string;
    ip: string;
    userAgent: string;
    deviceId: string | null;
    success: boolean;
    reason: string | null;
    userId?: string | null;
    ipIntelligence?: IpIntelligenceResult;
    blockedByIpIntelligence?: boolean;
  }
) {
  await supabase.rpc("record_signup_attempt", {
    p_email: email,
    p_ip_address: ip,
    p_user_agent: userAgent,
    p_device_id: deviceId,
    p_success: success,
    p_reason: reason,
    p_user_id: userId,
    p_ip_intelligence: toIpIntelligenceMetadata(ipIntelligence),
    p_blocked_by_ip_intelligence: blockedByIpIntelligence
  });
}

async function rejectRegistration(
  supabase: SupabaseServerClient,
  {
    email,
    ip,
    userAgent,
    deviceId,
    reason,
    eventType,
    ipIntelligence,
    blockedByIpIntelligence = false
  }: {
    email: string;
    ip: string;
    userAgent: string;
    deviceId: string | null;
    reason: string;
    eventType: string;
    ipIntelligence?: IpIntelligenceResult;
    blockedByIpIntelligence?: boolean;
  }
) {
  const metadata = {
    reason,
    ip_intelligence: toIpIntelligenceMetadata(ipIntelligence)
  };

  await recordSignupAttempt(supabase, {
    email,
    ip,
    userAgent,
    deviceId,
    success: false,
    reason,
    ipIntelligence,
    blockedByIpIntelligence
  });
  await recordAuditLog(supabase, {
    email,
    eventType,
    ip,
    userAgent,
    deviceId,
    metadata
  });
}

export async function signUpAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const deviceId = getString(formData, "deviceId") || null;
  const turnstileToken = getString(formData, "cf-turnstile-response");
  const { ip, userAgent, origin } = await getRequestContext();

  if (!email || !password) {
    redirectWithError("/auth/register", "请填写邮箱和密码。");
  }

  if (password.length < 6) {
    redirectWithError("/auth/register", "密码至少需要 6 位。");
  }

  const supabase = await createClient();
  const { data: guardRows, error: guardError } = await supabase.rpc(
    "get_registration_guard_counts",
    {
      p_ip_address: ip
    }
  );
  const guard = Array.isArray(guardRows)
    ? (guardRows[0] as RegistrationGuardCounts | undefined)
    : (guardRows as RegistrationGuardCounts | null);

  if (!guardError && (guard?.attempt_count_hour ?? 0) >= 5) {
    await rejectRegistration(supabase, {
      email,
      ip,
      userAgent,
      deviceId,
      reason: frequentSignupMessage,
      eventType: "registration_rate_limited"
    });

    redirectWithError("/auth/register", frequentSignupMessage);
  }

  const isHuman = await verifyTurnstileToken(turnstileToken, ip, "register");

  if (!isHuman) {
    await rejectRegistration(supabase, {
      email,
      ip,
      userAgent,
      deviceId,
      reason: turnstileErrorMessage,
      eventType: "registration_turnstile_failed"
    });

    redirectWithError("/auth/register", turnstileErrorMessage);
  }

  const ipIntelligence = await checkIpIntelligence(ip);

  if (ipIntelligence.suspicious) {
    await rejectRegistration(supabase, {
      email,
      ip,
      userAgent,
      deviceId,
      reason: suspiciousNetworkMessage,
      eventType: "registration_suspicious_ip_blocked",
      ipIntelligence,
      blockedByIpIntelligence: true
    });

    redirectWithError("/auth/register", suspiciousNetworkMessage);
  }

  if (
    !guardError &&
    ((guard?.successful_ip_24h ?? 0) >= 1 || (guard?.successful_ip_lifetime ?? 0) >= 3)
  ) {
    await rejectRegistration(supabase, {
      email,
      ip,
      userAgent,
      deviceId,
      reason: frequentSignupMessage,
      eventType: "registration_ip_limit_blocked",
      ipIntelligence
    });

    redirectWithError("/auth/register", frequentSignupMessage);
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/login`
    }
  });

  if (error) {
    await rejectRegistration(supabase, {
      email,
      ip,
      userAgent,
      deviceId,
      reason: authErrorMessage(error.message),
      eventType: "registration_failed",
      ipIntelligence
    });

    redirectWithError("/auth/register", authErrorMessage(error.message));
  }

  if (signUpData.user?.id) {
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from("profiles")
      .update({
        signup_ip: ip,
        signup_user_agent: userAgent,
        device_id: deviceId
      })
      .eq("id", signUpData.user.id);
  }

  await recordSignupAttempt(supabase, {
    email,
    ip,
    userAgent,
    deviceId,
    success: true,
    reason: null,
    userId: signUpData.user?.id ?? null,
    ipIntelligence
  });
  await recordAuditLog(supabase, {
    userId: signUpData.user?.id ?? null,
    email,
    eventType: "registration_success",
    ip,
    userAgent,
    deviceId,
    metadata: {
      ip_intelligence: toIpIntelligenceMetadata(ipIntelligence),
      email_verification_required: true
    }
  });

  redirect("/auth/pending");
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const turnstileToken = getString(formData, "cf-turnstile-response");
  const { ip, userAgent } = await getRequestContext();

  if (!email || !password) {
    redirectWithError("/auth/login", "请填写邮箱和密码。");
  }

  const supabase = await createClient();
  const isHuman = await verifyTurnstileToken(turnstileToken, ip, "login");

  if (!isHuman) {
    await recordAuditLog(supabase, {
      email,
      eventType: "login_turnstile_failed",
      ip,
      userAgent,
      metadata: {
        reason: turnstileErrorMessage
      }
    });

    redirectWithError("/auth/login", turnstileErrorMessage);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    await recordAuditLog(supabase, {
      email,
      eventType: "login_failed",
      ip,
      userAgent,
      metadata: {
        reason: authErrorMessage(error?.message ?? "")
      }
    });

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
    await recordAuditLog(supabase, {
      userId: data.user.id,
      email,
      eventType: "login_blocked_banned",
      ip,
      userAgent,
      metadata: {
        reason: bannedMessage
      }
    });
    await supabase.auth.signOut();
    redirectWithError("/auth/login", bannedMessage);
  }

  if (profile?.status === "approved") {
    await supabase.rpc("grant_signup_free_credits_if_eligible", {
      p_user_id: data.user.id
    });
  }

  await recordAuditLog(supabase, {
    userId: data.user.id,
    email,
    eventType: "login_success",
    ip,
    userAgent,
    metadata: {
      status: profile?.status ?? "unknown"
    }
  });

  redirectByStatus(profile?.status as ProfileStatus | undefined);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
