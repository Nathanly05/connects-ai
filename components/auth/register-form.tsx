"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import { signUpAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterFormProps = {
  resetSignal?: string;
};

async function sha256Hex(value: string) {
  if (!window.crypto?.subtle) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return hash.toString(16).padStart(8, "0");
  }

  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildDeviceFingerprint() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

  return [
    navigator.userAgent,
    navigator.language,
    timezone,
    window.screen.width,
    window.screen.height,
    navigator.platform
  ].join("|");
}

function SubmitButton({
  disabled
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      <UserPlus aria-hidden="true" />
      {pending ? "提交中..." : "注册并等待审核"}
    </Button>
  );
}

export function RegisterForm({ resetSignal = "" }: RegisterFormProps) {
  const submittingRef = useRef(false);
  const [deviceId, setDeviceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    sha256Hex(buildDeviceFingerprint()).then((fingerprint) => {
      if (mounted) {
        setDeviceId(fingerprint);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

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
    <form action={signUpAction} className="space-y-5" onSubmit={handleSubmit}>
      <input type="hidden" name="deviceId" value={deviceId} />
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
          autoComplete="new-password"
          placeholder="至少 6 位"
          minLength={6}
          required
        />
      </div>
      <SubmitButton disabled={isSubmitting} />
    </form>
  );
}
