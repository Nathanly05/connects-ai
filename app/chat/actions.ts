"use server";

import { redirect } from "next/navigation";
import { createOpenAIClient, defaultChatModel } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithChatError(sessionId: string | null, message: string): never {
  const params = new URLSearchParams();

  if (sessionId) {
    params.set("session", sessionId);
  } else {
    params.set("new", "1");
  }

  params.set("error", message);
  redirect(`/chat?${params.toString()}`);
}

function titleFromMessage(message: string) {
  return message.replace(/\s+/g, " ").slice(0, 40) || "新对话";
}

function toOpenAIInput(messages: ChatMessage[], nextMessage: string) {
  const history = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content
    }));

  return [
    ...history,
    {
      role: "user" as const,
      content: nextMessage
    }
  ];
}

function friendlyError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("OPENAI_API_KEY")) {
      return "OpenAI API Key 未配置，请先在 .env.local 中设置 OPENAI_API_KEY。";
    }

    return error.message;
  }

  return "发送失败，请稍后再试。";
}

export async function sendMessageAction(formData: FormData) {
  const sessionId = getString(formData, "sessionId") || null;
  const content = getString(formData, "content");

  if (!content) {
    redirectWithChatError(sessionId, "请输入消息内容。");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status, credits")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirectWithChatError(sessionId, "读取账号信息失败，请稍后重试。");
  }

  if (profile?.status !== "approved") {
    redirect("/auth/pending");
  }

  if ((profile?.credits ?? 0) <= 0) {
    redirectWithChatError(sessionId, "Credits不足，请充值");
  }

  let previousMessages: ChatMessage[] = [];

  if (sessionId) {
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!session) {
      redirectWithChatError(null, "对话不存在，请重新开始。");
    }

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      redirectWithChatError(sessionId, "读取历史消息失败，请确认已运行 Phase 3 SQL。");
    }

    previousMessages = (messages ?? []) as ChatMessage[];
  }

  let assistantContent = "";

  try {
    const openai = createOpenAIClient();
    const response = await openai.responses.create({
      model: defaultChatModel,
      instructions:
        "你是 Connects AI 的中文助手。请用简洁、清晰、友好的中文回答用户。",
      input: toOpenAIInput(previousMessages, content),
      max_output_tokens: 1200
    });

    assistantContent = response.output_text?.trim() || "";
  } catch (error) {
    redirectWithChatError(sessionId, friendlyError(error));
  }

  if (!assistantContent) {
    redirectWithChatError(sessionId, "OpenAI 没有返回可显示的文本，请稍后再试。");
  }

  const { data: savedRows, error: saveError } = await supabase.rpc("save_chat_exchange", {
    p_session_id: sessionId,
    p_user_content: content,
    p_assistant_content: assistantContent,
    p_title: titleFromMessage(content)
  });

  if (saveError) {
    redirectWithChatError(sessionId, saveError.message || "保存对话失败。");
  }

  const savedSessionId = Array.isArray(savedRows)
    ? savedRows[0]?.session_id
    : savedRows?.session_id;

  redirect(`/chat?session=${savedSessionId ?? sessionId}`);
}
