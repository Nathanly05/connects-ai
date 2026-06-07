"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, SendHorizontal } from "lucide-react";
import { useFormStatus } from "react-dom";
import { sendMessageAction } from "@/app/chat/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMode = "instant" | "thinking";

type ChatComposerProps = {
  sessionId?: string | null;
  credits: number;
  disabled?: boolean;
  disabledMessage?: string;
};

const chatModes: Array<{
  value: ChatMode;
  label: string;
  cost: number;
}> = [
  {
    value: "instant",
    label: "Instant",
    cost: 1
  },
  {
    value: "thinking",
    label: "Thinking",
    cost: 5
  }
];

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      size="icon"
      className="size-10 shrink-0 rounded-full"
      aria-label={pending ? "发送中" : "发送"}
    >
      <SendHorizontal aria-hidden="true" />
    </Button>
  );
}

export function ChatComposer({
  sessionId,
  credits,
  disabled,
  disabledMessage
}: ChatComposerProps) {
  const [mode, setMode] = useState<ChatMode>("instant");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const selectedMode = chatModes.find((item) => item.value === mode) ?? chatModes[0];
  const modeInsufficient = credits < selectedMode.cost;
  const cannotSend = disabled || modeInsufficient;
  const balanceMessage =
    disabled && disabledMessage
      ? disabledMessage
      : modeInsufficient
        ? `${selectedMode.label} 模式需要 ${selectedMode.cost} Credits，当前余额不足。`
        : null;

  return (
    <form action={sendMessageAction} className="border-t bg-white p-3 sm:p-4">
      <input type="hidden" name="sessionId" value={sessionId ?? ""} />
      <input type="hidden" name="mode" value={mode} />
      <div className="flex flex-col gap-3">
        {balanceMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
            {balanceMessage}
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
            placeholder={cannotSend ? "余额不足，请先充值或切换模式。" : "输入你的问题..."}
            disabled={cannotSend}
            required
            className="min-h-[92px] resize-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0 disabled:bg-transparent"
          />

          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-full bg-white"
              aria-label="添加"
            >
              <Plus aria-hidden="true" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white px-4"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="menu"
                >
                  {selectedMode.label}
                  <ChevronDown aria-hidden="true" />
                </Button>

                {isMenuOpen ? (
                  <div
                    className="absolute bottom-12 right-0 z-20 w-56 rounded-xl border bg-white p-2 shadow-lg"
                    role="menu"
                  >
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      最新的 · 5.5
                    </div>
                    {chatModes.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        role="menuitem"
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                          mode === item.value && "bg-primary/10 text-primary"
                        )}
                        onClick={() => {
                          setMode(item.value);
                          setIsMenuOpen(false);
                        }}
                      >
                        <span>{item.label}</span>
                        {mode === item.value ? (
                          <Check className="size-4" aria-hidden="true" />
                        ) : null}
                      </button>
                    ))}
                    <div className="my-2 border-t" />
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground"
                      disabled
                    >
                      设置...
                    </button>
                  </div>
                ) : null}
              </div>

              <SubmitButton disabled={cannotSend} />
            </div>
          </div>
        </div>

        <p className="px-2 text-xs leading-5 text-muted-foreground">
          Instant 每次 1 credit，Thinking 每次 5 credits。
        </p>
      </div>
    </form>
  );
}
