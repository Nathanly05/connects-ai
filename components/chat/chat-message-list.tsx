import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

type ChatMessageListProps = {
  messages: ChatMessage[];
};

export function ChatMessageList({ messages }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-1 items-center justify-center px-4 py-12 text-center">
        <div className="max-w-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Bot className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-normal">开始一段新对话</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            还没有聊天记录，开始你的第一个问题吧。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[360px] flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <article
            key={message.id}
            className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
          >
            {!isUser ? (
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Bot className="size-4" aria-hidden="true" />
              </div>
            ) : null}
            <div
              className={cn(
                "max-w-[88%] rounded-lg px-4 py-3 text-sm leading-7 shadow-sm sm:max-w-[72%]",
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "border bg-white text-foreground"
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
            {isUser ? (
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                <User className="size-4" aria-hidden="true" />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
