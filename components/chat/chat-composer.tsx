"use client";

import { FormEvent, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  sessionId?: string | null;
  remainingChats: number;
  disabled?: boolean;
  disabledMessage?: string;
  showQuickPrompts?: boolean;
};

const quickPrompts = [
  "写一篇小红书文案",
  "帮我翻译成英文",
  "帮我写一封邮件",
  "帮我分析一个商业想法"
];

function SubmitButton({ disabled }: { disabled?: boolean }) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      size="icon"
      className="size-9 shrink-0 rounded-full sm:size-10"
      aria-label={disabled ? "发送中" : "发送"}
    >
      <SendHorizontal aria-hidden="true" />
    </Button>
  );
}

export function ChatComposer({
  sessionId,
  remainingChats,
  disabled,
  disabledMessage,
  showQuickPrompts
}: ChatComposerProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cannotSend = disabled || remainingChats <= 0 || isSubmitting;
  const balanceMessage =
    disabled && disabledMessage
      ? disabledMessage
      : remainingChats <= 0
        ? "Remaining Chats 已用完，请购买套餐后继续使用。"
        : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextContent = content.trim();

    if (!nextContent || cannotSend) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: sessionId ?? null,
          content: nextContent
        })
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
        sessionId?: string | null;
      };

      if (result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }

      if (!response.ok) {
        setErrorMessage(result.error || "AI 服务暂时繁忙，请稍后再试。");
        return;
      }

      setContent("");
      router.push(result.sessionId ? `/chat?session=${result.sessionId}` : "/chat");
      router.refresh();
    } catch {
      setErrorMessage("网络连接异常，请检查后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 z-10 border-t bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4"
    >
      <input type="hidden" name="sessionId" value={sessionId ?? ""} />
      <div className="flex flex-col gap-3">
        {balanceMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
            {balanceMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div
          className={cn(
            "rounded-3xl border bg-white p-2 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
            cannotSend && "bg-secondary/40"
          )}
        >
          <Textarea
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={cannotSend ? "Remaining Chats 已用完，请先购买套餐。" : "输入你的问题..."}
            disabled={cannotSend}
            required
            className="min-h-[92px] resize-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0 disabled:bg-transparent"
          />

          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <p className="min-w-0 truncate px-2 text-xs text-muted-foreground">
              每次完整回复消耗 1 次对话。
            </p>
            <SubmitButton disabled={cannotSend} />
          </div>
        </div>

        {showQuickPrompts ? (
          <div className="grid gap-2 px-1 sm:grid-cols-2 lg:grid-cols-4">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-full border bg-white px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={cannotSend}
                onClick={() => {
                  setContent(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </form>
  );
}
