"use client";

import { SendHorizontal } from "lucide-react";
import { useFormStatus } from "react-dom";
import { sendMessageAction } from "@/app/chat/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatComposerProps = {
  sessionId?: string | null;
  disabled?: boolean;
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} className="w-full sm:w-auto">
      <SendHorizontal aria-hidden="true" />
      {pending ? "发送中" : "发送"}
    </Button>
  );
}

export function ChatComposer({ sessionId, disabled }: ChatComposerProps) {
  return (
    <form action={sendMessageAction} className="border-t bg-white p-3 sm:p-4">
      <input type="hidden" name="sessionId" value={sessionId ?? ""} />
      <div className="flex flex-col gap-3">
        <Textarea
          name="content"
          placeholder={disabled ? "Credits不足，请充值" : "输入你的问题..."}
          disabled={disabled}
          required
          className="resize-none"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            每发送一次消息会扣除 1 credit。
          </p>
          <SubmitButton disabled={disabled} />
        </div>
      </div>
    </form>
  );
}
