import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, MessageCircle, Plus, WalletCards } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageList } from "@/components/chat/chat-message-list";
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
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

  return (
    <main className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
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
            <div className="inline-flex items-center gap-2 rounded-md border bg-secondary/60 px-3 py-2 text-sm font-medium">
              <WalletCards className="size-4 text-primary" aria-hidden="true" />
              当前 Credits：{credits}
            </div>
            <Button asChild>
              <Link href="/billing">
                <CreditCard aria-hidden="true" />
                自动充值
              </Link>
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                退出登录
              </Button>
            </form>
          </div>
        </header>

        {params.error ? (
          <Alert variant={params.error === "Credits不足，请充值" ? "default" : "destructive"}>
            <AlertDescription>{params.error}</AlertDescription>
          </Alert>
        ) : null}

        {isOutOfCredits ? (
          <Alert>
            <AlertDescription>Credits不足，请充值</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid min-h-[680px] gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="overflow-hidden">
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
                  读取聊天历史失败：{sessionsError.message}
                </div>
              ) : null}

              {!sessionsError && sessions.length === 0 ? (
                <div className="p-4 text-sm leading-6 text-muted-foreground">
                  还没有聊天记录。
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
            <div className="flex min-h-[680px] w-full flex-col">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">
                  {selectedSessionId
                    ? sessions.find((session) => session.id === selectedSessionId)?.title ||
                      "当前对话"
                    : "新对话"}
                </CardTitle>
                <CardDescription>
                  每发送一次消息扣除 1 credit，余额不足时无法继续聊天。
                </CardDescription>
              </CardHeader>
              {messagesError ? (
                <div className="p-4">
                  <Alert variant="destructive">
                    <AlertDescription>
                      读取消息失败：{messagesError}。请确认已运行 Phase 3 SQL。
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <ChatMessageList messages={messages} />
              )}
              <ChatComposer sessionId={selectedSessionId} disabled={isOutOfCredits} />
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
