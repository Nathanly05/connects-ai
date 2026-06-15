import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createOpenAIClient, defaultChatModel } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type ChatRequestBody = {
  sessionId?: string | null;
  content?: string | null;
};

const chatCreditCost = 1;
const maxInputCharacters = 16000;
const remainingChatsEmptyMessage = "Remaining Chats 已用完，请购买套餐后继续使用。";
const bannedMessage = "账号已被限制使用，如有疑问请联系客服。";

function jsonError(message: string, status = 400, redirectTo?: string) {
  return NextResponse.json({ error: message, redirectTo }, { status });
}

function purchaseRedirect(message = remainingChatsEmptyMessage) {
  return `/billing?error=${encodeURIComponent(message)}`;
}

function authRedirect(path: string, message?: string) {
  if (!message) {
    return path;
  }

  return `${path}?error=${encodeURIComponent(message)}`;
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

function friendlyOpenAIError(error: unknown) {
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

function shouldRetrySaveWithoutMode(message?: string) {
  if (!message) {
    return false;
  }

  return (
    message.includes("Could not find the function") ||
    message.includes("schema cache") ||
    message.includes("p_mode")
  );
}

async function parseBody(request: NextRequest): Promise<ChatRequestBody> {
  try {
    return (await request.json()) as ChatRequestBody;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const body = await parseBody(request);
  const sessionId = body.sessionId?.trim() || null;
  const content = body.content?.trim() || "";

  if (!content) {
    return jsonError("请输入消息内容。");
  }

  if (content.length > maxInputCharacters) {
    return jsonError("消息内容过长，请缩短后再发送。");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("请先登录。", 401, "/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status, credits")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return jsonError("账号信息暂时无法加载，请稍后再试。", 500);
  }

  if (profile?.status === "banned") {
    await supabase.auth.signOut();
    return jsonError(bannedMessage, 403, authRedirect("/auth/login", bannedMessage));
  }

  if (profile?.status === "rejected") {
    return jsonError("账号申请未通过，如需帮助请联系管理员。", 403, "/auth/rejected");
  }

  if (profile?.status !== "approved") {
    return jsonError("账号正在审核中，请等待管理员开通。", 403, "/auth/pending");
  }

  const currentCredits = profile?.credits ?? 0;

  if (currentCredits < chatCreditCost) {
    return jsonError(remainingChatsEmptyMessage, 402, purchaseRedirect());
  }

  const { data: rateLimitRows, error: rateLimitError } = await supabase.rpc(
    "check_chat_rate_limit",
    {
      p_credit_cost: chatCreditCost
    }
  );

  if (!rateLimitError) {
    const rateLimit = Array.isArray(rateLimitRows)
      ? (rateLimitRows[0] as RateLimitResult | undefined)
      : (rateLimitRows as RateLimitResult | null);

    if (!rateLimit?.allowed) {
      return jsonError(rateLimit?.reason || "发送过快，请稍后再试", 429);
    }
  } else {
    console.error("check_chat_rate_limit failed; continuing chat send", rateLimitError);
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
      return jsonError("对话不存在，请重新开始。", 404);
    }

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return jsonError("消息暂时无法加载，请稍后重试。", 500);
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
    return jsonError(friendlyOpenAIError(error), 502);
  }

  if (!assistantContent) {
    return jsonError("AI 服务暂时繁忙，请稍后再试。", 502);
  }

  const saveParams = {
    p_session_id: sessionId,
    p_user_content: content,
    p_assistant_content: assistantContent,
    p_title: titleFromMessage(content)
  };
  let { data: savedRows, error: saveError } = await supabase.rpc("save_chat_exchange", {
    ...saveParams,
    p_mode: "instant"
  });

  if (saveError && shouldRetrySaveWithoutMode(saveError.message)) {
    const retryResult = await supabase.rpc("save_chat_exchange", saveParams);
    savedRows = retryResult.data;
    saveError = retryResult.error;
  }

  if (saveError) {
    const message = friendlySaveError(saveError.message);

    if (message.includes("Remaining Chats")) {
      return jsonError(message, 402, purchaseRedirect(message));
    }

    return jsonError(message, 500);
  }

  const savedSessionId = Array.isArray(savedRows)
    ? savedRows[0]?.session_id
    : savedRows?.session_id;

  revalidatePath("/chat");

  return NextResponse.json({
    sessionId: savedSessionId ?? sessionId,
    remainingChats: Array.isArray(savedRows) ? savedRows[0]?.credits : savedRows?.credits
  });
}
