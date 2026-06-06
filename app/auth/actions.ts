"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileStatus = "pending" | "approved" | "rejected";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function authErrorMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("invalid login credentials")) {
    return "邮箱或密码不正确，请重新输入。";
  }

  if (lowerMessage.includes("already registered") || lowerMessage.includes("already exists")) {
    return "这个邮箱可能已经注册，请直接登录。";
  }

  return message || "操作失败，请稍后再试。";
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

  redirect("/auth/pending");
}

export async function signUpAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");

  if (!email || !password) {
    redirectWithError("/auth/register", "请填写邮箱和密码。");
  }

  if (password.length < 6) {
    redirectWithError("/auth/register", "密码至少需要 6 位。");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    redirectWithError("/auth/register", authErrorMessage(error.message));
  }

  redirect("/auth/pending");
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");

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
    redirectWithError("/auth/login", "登录成功，但读取账号审核状态失败。请稍后重试。");
  }

  redirectByStatus(profile?.status as ProfileStatus | undefined);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
