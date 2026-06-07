"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupportType = "账号问题" | "充值问题" | "AI回复问题" | "Credits问题" | "其他";

const supportTypes: SupportType[] = [
  "账号问题",
  "充值问题",
  "AI回复问题",
  "Credits问题",
  "其他"
];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(type: "success" | "error", message: string): never {
  redirect(`/support?${type}=${encodeURIComponent(message)}`);
}

function isSupportType(value: string): value is SupportType {
  return supportTypes.includes(value as SupportType);
}

export async function submitSupportTicketAction(formData: FormData) {
  const type = getString(formData, "type");
  const title = getString(formData, "title");
  const message = getString(formData, "message");
  const contact = getString(formData, "contact");

  if (!isSupportType(type)) {
    redirectWithMessage("error", "请选择有效的问题类型。");
  }

  if (!title) {
    redirectWithMessage("error", "请填写问题标题。");
  }

  if (!message) {
    redirectWithMessage("error", "请填写详细描述。");
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
    redirectWithMessage("error", "当前账号缺少邮箱，请联系管理员。");
  }

  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    email,
    type,
    title,
    message,
    contact: contact || null,
    status: "open"
  });

  if (error) {
    redirectWithMessage("error", "反馈提交失败，请稍后重试或联系管理员。");
  }

  redirectWithMessage("success", "反馈已提交，我们会尽快处理。");
}
