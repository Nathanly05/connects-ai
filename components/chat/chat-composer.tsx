"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ClipboardPaste,
  FileUp,
  ImageUp,
  Lock,
  Plus,
  SendHorizontal
} from "lucide-react";
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
  const [content, setContent] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isPastePanelOpen, setIsPastePanelOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
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

        {notice ? (
          <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm leading-6 text-primary">
            {notice}
          </div>
        ) : null}

        {isPastePanelOpen ? (
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium">粘贴文本</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  粘贴长文本后，会作为普通消息发送。
                </p>
              </div>
              <Textarea
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                placeholder="在这里粘贴文本..."
                className="min-h-[140px] resize-none"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPastePanelOpen(false);
                    setPastedText("");
                  }}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  disabled={!pastedText.trim()}
                  onClick={() => {
                    setContent(pastedText.trim());
                    setPastedText("");
                    setIsPastePanelOpen(false);
                    setNotice("已填入输入框，可以直接发送。");
                  }}
                >
                  作为消息使用
                </Button>
              </div>
            </div>
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
            placeholder={cannotSend ? "余额不足，请先充值或切换模式。" : "输入你的问题..."}
            disabled={cannotSend}
            required
            className="min-h-[92px] resize-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0 disabled:bg-transparent"
          />

          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0 rounded-full bg-white"
                aria-label="添加"
                aria-expanded={isPlusMenuOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setIsPlusMenuOpen((open) => !open);
                  setIsModelMenuOpen(false);
                }}
              >
                <Plus
                  className={cn("transition-transform", isPlusMenuOpen && "rotate-45")}
                  aria-hidden="true"
                />
              </Button>

              {isPlusMenuOpen ? (
                <div
                  className="absolute bottom-12 left-0 z-20 w-60 rounded-xl border bg-white p-2 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                    onClick={() => {
                      setNotice("图片分析功能即将上线");
                      setIsPlusMenuOpen(false);
                    }}
                  >
                    <ImageUp className="size-4 text-primary" aria-hidden="true" />
                    <span>上传图片</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                    onClick={() => {
                      setNotice("文件分析功能即将上线");
                      setIsPlusMenuOpen(false);
                    }}
                  >
                    <FileUp className="size-4 text-primary" aria-hidden="true" />
                    <span>上传文件</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                    onClick={() => {
                      setNotice(null);
                      setIsPastePanelOpen(true);
                      setIsPlusMenuOpen(false);
                    }}
                  >
                    <ClipboardPaste className="size-4 text-primary" aria-hidden="true" />
                    <span>粘贴文本</span>
                  </button>
                  <div className="my-2 border-t" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground"
                    disabled
                  >
                    <Lock className="size-4" aria-hidden="true" />
                    <span>暂不开放</span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white px-4"
                  onClick={() => {
                    setIsModelMenuOpen((open) => !open);
                    setIsPlusMenuOpen(false);
                  }}
                  aria-expanded={isModelMenuOpen}
                  aria-haspopup="menu"
                >
                  {selectedMode.label}
                  <ChevronDown aria-hidden="true" />
                </Button>

                {isModelMenuOpen ? (
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
                          setIsModelMenuOpen(false);
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
