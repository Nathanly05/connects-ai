"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createOpenAIClient, defaultChatModel } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatMode = "instant" | "thinking";

type RateLimitResult = {
  allowed: boolean;
  reason: string | null;
  minute_count: number;
  daily_count: number;
  rate_limited: boolean;
};

const chatModeCosts: Record<ChatMode, number> = {
  instant: 1,
  thinking: 5
};

const bannedMessage = "账号已被限制使用，如有疑问请联系客服。";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getChatMode(value: string): ChatMode {
  return value === "thinking" ? "thinking" : "instant";
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

  if (message.includes("Credits") || message.includes("credits")) {
    return "Credits 不足，请充值后继续使用。";
  }

  return "AI 服务暂时繁忙，请稍后再试。";
}

export async function sendMessageAction(formData: FormData) {
  const sessionId = getString(formData, "sessionId") || null;
  const content = getString(formData, "content");
  const mode = getChatMode(getString(formData, "mode"));
  const creditCost = chatModeCosts[mode];

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

  if (currentCredits <= 0) {
    redirectWithChatError(sessionId, "Credits 不足，请充值后继续使用。");
  }

  if (currentCredits < creditCost) {
    redirectWithChatError(sessionId, "Credits 不足，请充值后继续使用。");
  }

  const { data: rateLimitRows, error: rateLimitError } = await supabase.rpc(
    "check_chat_rate_limit",
    {
      p_credit_cost: creditCost
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
      max_output_tokens: 1200
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
    p_mode: mode
  });

  if (saveError) {
    redirectWithChatError(sessionId, friendlySaveError(saveError.message));
  }

  const savedSessionId = Array.isArray(savedRows)
    ? savedRows[0]?.session_id
    : savedRows?.session_id;

  revalidatePath("/chat");
  redirect(`/chat?session=${savedSessionId ?? sessionId}`);
}
