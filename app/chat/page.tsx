import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CreditCard,
  MessageCircle,
  Plus,
  QrCode
} from "lucide-react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { MobileChatHistoryDrawer } from "@/components/chat/mobile-chat-history-drawer";
import { AppNav } from "@/components/layout/app-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { PageToast } from "@/components/ui/page-toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chat"
};

type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

type ChatPageProps = {
  searchParams: Promise<{
    session?: string;
    new?: string;
    error?: string;
  }>;
};

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, credits")
    .eq("id", user.id)
    .maybeSingle();

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });

  const sessions = (sessionRows ?? []) as ChatSession[];
  const requestedSessionId = params.session ?? null;
  const forceNew = params.new === "1";
  const requestedSessionExists = requestedSessionId
    ? sessions.some((session) => session.id === requestedSessionId)
    : false;
  const selectedSessionId = forceNew
    ? null
    : requestedSessionExists
      ? requestedSessionId
      : sessions[0]?.id ?? null;

  let messages: ChatMessage[] = [];
  let messagesError: string | null = null;

  if (selectedSessionId) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", selectedSessionId)
      .order("created_at", { ascending: true });

    messages = (data ?? []) as ChatMessage[];
    messagesError = error?.message ?? null;
  }

  const credits = profile?.credits ?? 0;
  const isOutOfCredits = credits <= 0;
  const isLowCredits = credits > 0 && credits <= 20;

  return (
    <main className="page-shell min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AppNav active="chat" />
        <PageToast message={params.error} variant="error" />

        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <MessageCircle className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">Connects AI</h1>
              <Badge variant="secondary">中文 AI 聊天</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile?.email ?? user.email ?? "当前用户"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <MobileChatHistoryDrawer
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              sessionsError={sessionsError?.message ?? null}
            />
          </div>
        </header>

        {isLowCredits ? (
          <Alert className="border-amber-300 bg-amber-50 text-amber-900">
            <AlertTriangle className="mr-2 inline size-4 align-[-2px]" aria-hidden="true" />
            <AlertDescription className="inline">
              余额较低，请及时充值，避免影响使用。
            </AlertDescription>
          </Alert>
        ) : null}

        {isOutOfCredits ? (
          <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
            <AlertDescription>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Credits 不足，请充值后继续使用。</p>
                  <p className="mt-1 text-sm text-destructive/80">
                    充值到账后页面会重新读取余额，你就可以继续发送消息。
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild>
                    <Link href="/billing">
                      <CreditCard aria-hidden="true" />
                      Stripe 自动充值
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="bg-white text-foreground hover:bg-secondary">
                    <Link href="/recharge?method=globepay">
                      <QrCode aria-hidden="true" />
                      微信/支付宝充值
                    </Link>
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid min-h-[calc(100dvh-260px)] gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="hidden overflow-hidden lg:block">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">聊天历史</CardTitle>
                  <CardDescription>选择历史会话或开始新对话。</CardDescription>
                </div>
                <Button asChild size="icon" variant="outline" aria-label="新对话">
                  <Link href="/chat?new=1">
                    <Plus aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {sessionsError ? (
                <div className="p-4 text-sm leading-6 text-destructive">
                  聊天历史暂时无法加载，请稍后重试。
                </div>
              ) : null}

              {!sessionsError && sessions.length === 0 ? (
                <div className="p-4 text-sm leading-6 text-muted-foreground">
                  还没有聊天记录，开始你的第一个问题吧。
                </div>
              ) : null}

              <nav className="max-h-[560px] overflow-y-auto p-2">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/chat?session=${session.id}`}
                    className={cn(
                      "block rounded-md px-3 py-3 text-sm transition-colors hover:bg-secondary",
                      selectedSessionId === session.id && "bg-secondary"
                    )}
                  >
                    <span className="line-clamp-1 font-medium">
                      {session.title || "新对话"}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatShortDate(session.updated_at ?? session.created_at)}
                    </span>
                  </Link>
                ))}
              </nav>
            </CardContent>
          </Card>

          <Card className="flex overflow-hidden">
            <div className="flex min-h-[calc(100dvh-260px)] w-full flex-col">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">
                  {selectedSessionId
                    ? sessions.find((session) => session.id === selectedSessionId)?.title ||
                      "当前对话"
                    : "新对话"}
                </CardTitle>
                <CardDescription>
                  Instant 每次 1 credit，Thinking 每次 5 credits。
                </CardDescription>
              </CardHeader>
              {messagesError ? (
                <div className="p-4">
                  <Alert variant="destructive">
                    <AlertDescription>
                      消息暂时无法加载，请稍后重试。
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <ChatMessageList messages={messages} />
              )}
              <ChatComposer
                sessionId={selectedSessionId}
                credits={credits}
                disabled={isOutOfCredits}
                disabledMessage="Credits 不足，请充值后继续使用。"
                showQuickPrompts={!messagesError && messages.length === 0}
              />
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
