"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LogIn } from "lucide-react";
import { signInAction } from "@/app/auth/actions";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  resetSignal?: string;
};

function SubmitButton({
  disabled
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      <LogIn aria-hidden="true" />
      {pending ? "登录中..." : "登录"}
    </Button>
  );
}

export function LoginForm({ resetSignal = "" }: LoginFormProps) {
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [localResetCount, setLocalResetCount] = useState(0);
  const [clientError, setClientError] = useState("");

  useEffect(() => {
    submittingRef.current = false;
    setIsSubmitting(false);
    setTurnstileToken("");
  }, [resetSignal]);

  const handleTurnstileTokenChange = useCallback((token: string) => {
    setTurnstileToken(token);

    if (token) {
      setClientError("");
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const token = new FormData(event.currentTarget).get("cf-turnstile-response");

    if (submittingRef.current) {
      event.preventDefault();
      return;
    }

    if (typeof token !== "string" || !token) {
      event.preventDefault();
      setClientError("请先完成人机验证");
      setLocalResetCount((count) => count + 1);
      return;
    }

    setClientError("");
    submittingRef.current = true;
    setIsSubmitting(true);
  }

  return (
    <form action={signInAction} className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="请输入密码"
          required
        />
      </div>
      <TurnstileWidget
        action="login"
        onTokenChange={handleTurnstileTokenChange}
        resetSignal={`${resetSignal}:${localResetCount}`}
      />
      {clientError ? (
        <p className="text-sm font-medium text-destructive">{clientError}</p>
      ) : null}
      <SubmitButton disabled={isSubmitting || !turnstileToken} />
    </form>
  );
}
