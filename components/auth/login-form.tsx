"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LogIn } from "lucide-react";
import { signInAction } from "@/app/auth/actions";
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

  useEffect(() => {
    submittingRef.current = false;
    setIsSubmitting(false);
  }, [resetSignal]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }

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
      <SubmitButton disabled={isSubmitting} />
    </form>
  );
}
