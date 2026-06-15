"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createOpenAIClient, defaultChatModel } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type RateLimitResult = {
  allowed: boolean;
  reason: string | null;
  minute_count: number;
  daily_count: number;
  rate_limited: boolean;
};

const bannedMessage = "账号已被限制使用，如有疑问请联系客服。";
const chatCreditCost = 1;
const maxInputCharacters = 16000;

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

function redirectToUpgrade(message = "Remaining Chats 已用完，请购买套餐后继续使用。"): never {
  redirect(`/billing?error=${encodeURIComponent(message)}`);
}

function titleFromMessage(message: string) {
  return message.replace(/\s+/g, " ").slice(0, 40) || "新对话";
}

function isConversationMessage(
  message: ChatMessage
): message is { role: "user" | "assistant"; content: string } {
  return message.role === "user" || message.role === "assistant";
}

function toOpenAIInput(messages: ChatMessage[], nextMessage: string) {
  const history: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];
  let remainingCharacters = Math.max(maxInputCharacters - nextMessage.length, 0);

  for (const message of messages
    .filter(isConversationMessage)
    .slice(-12)
    .reverse()) {
    if (remainingCharacters <= 0) {
      break;
    }

    const content =
      message.content.length > remainingCharacters
        ? message.content.slice(-remainingCharacters)
        : message.content;

    history.unshift({
      role: message.role,
      content
    });

    remainingCharacters -= content.length;
  }

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
    const message = error.message.toLowerCase();

    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("econnreset") ||
      message.includes("etimedout") ||
      message.includes("timeout")
    ) {
      return "网络连接异常，请检查后重试。";
    }
  }

  return "AI 服务暂时繁忙，请稍后再试。";
}

function friendlySaveError(message?: string) {
  if (!message) {
    return "AI 服务暂时繁忙，请稍后再试。";
  }

  if (
    message.includes("Credits") ||
    message.includes("credits") ||
    message.includes("Remaining Chats")
  ) {
    return "Remaining Chats 不足，请购买套餐后继续使用。";
  }

  return "AI 服务暂时繁忙，请稍后再试。";
}

export async function sendMessageAction(formData: FormData) {
  const sessionId = getString(formData, "sessionId") || null;
  const content = getString(formData, "content");

  if (!content) {
    redirectWithChatError(sessionId, "请输入消息内容。");
  }

  if (content.length > maxInputCharacters) {
    redirectWithChatError(sessionId, "消息内容过长，请缩短后再发送。");
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
    redirectWithChatError(sessionId, "账号信息暂时无法加载，请稍后再试。");
  }

  if (profile?.status === "banned") {
    await supabase.auth.signOut();
    redirect(`/auth/login?error=${encodeURIComponent(bannedMessage)}`);
  }

  if (profile?.status === "rejected") {
    redirect("/auth/rejected");
  }

  if (profile?.status !== "approved") {
    redirect("/auth/pending");
  }

  const currentCredits = profile?.credits ?? 0;

  if (currentCredits < chatCreditCost) {
    redirectToUpgrade();
  }

  const { data: rateLimitRows, error: rateLimitError } = await supabase.rpc(
    "check_chat_rate_limit",
    {
      p_credit_cost: chatCreditCost
    }
  );

  if (rateLimitError) {
    redirectWithChatError(sessionId, "发送暂时不可用，请稍后再试。");
  }

  const rateLimit = Array.isArray(rateLimitRows)
    ? (rateLimitRows[0] as RateLimitResult | undefined)
    : (rateLimitRows as RateLimitResult | null);

  if (!rateLimit?.allowed) {
    redirectWithChatError(sessionId, rateLimit?.reason || "发送过快，请稍后再试");
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
      redirectWithChatError(sessionId, "消息暂时无法加载，请稍后重试。");
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
      max_output_tokens: 2000
    });

    assistantContent = response.output_text?.trim() || "";
  } catch (error) {
    redirectWithChatError(sessionId, friendlyError(error));
  }

  if (!assistantContent) {
    redirectWithChatError(sessionId, "AI 服务暂时繁忙，请稍后再试。");
  }

  const { data: savedRows, error: saveError } = await supabase.rpc("save_chat_exchange", {
    p_session_id: sessionId,
    p_user_content: content,
    p_assistant_content: assistantContent,
    p_title: titleFromMessage(content),
    p_mode: "instant"
  });

  if (saveError) {
    const message = friendlySaveError(saveError.message);

    if (message.includes("Remaining Chats")) {
      redirectToUpgrade(message);
    }

    redirectWithChatError(sessionId, message);
  }

  const savedSessionId = Array.isArray(savedRows)
    ? savedRows[0]?.session_id
    : savedRows?.session_id;

  revalidatePath("/chat");
  redirect(`/chat?session=${savedSessionId ?? sessionId}`);
}
