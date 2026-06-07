"use client";

import Link from "next/link";
import { useState } from "react";
import { History, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type MobileChatHistoryDrawerProps = {
  sessions: ChatSession[];
  selectedSessionId?: string | null;
  sessionsError?: string | null;
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

export function MobileChatHistoryDrawer({
  sessions,
  selectedSessionId,
  sessionsError
}: MobileChatHistoryDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        <History aria-hidden="true" />
        历史记录
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="关闭历史记录"
            className="absolute inset-0 bg-foreground/35"
            onClick={() => setIsOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[86vw] max-w-sm flex-col border-r bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="text-base font-semibold tracking-normal">聊天历史</p>
                <p className="text-xs text-muted-foreground">选择历史会话或开始新对话。</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="关闭"
                onClick={() => setIsOpen(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="border-b p-3">
              <Button asChild className="w-full">
                <Link href="/chat?new=1" onClick={() => setIsOpen(false)}>
                  <Plus aria-hidden="true" />
                  新对话
                </Link>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {sessionsError ? (
                <div className="p-3 text-sm leading-6 text-destructive">
                  聊天历史暂时无法加载，请稍后重试。
                </div>
              ) : null}

              {!sessionsError && sessions.length === 0 ? (
                <div className="p-3 text-sm leading-6 text-muted-foreground">
                  还没有聊天记录，开始你的第一个问题吧。
                </div>
              ) : null}

              <nav className="space-y-1">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/chat?session=${session.id}`}
                    onClick={() => setIsOpen(false)}
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
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
