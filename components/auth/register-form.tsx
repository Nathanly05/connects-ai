"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { signUpAction } from "@/app/auth/actions";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function RegisterForm() {
  const [deviceId, setDeviceId] = useState("");

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

  return (
    <form action={signUpAction} className="space-y-5">
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
      <TurnstileWidget action="register" />
      <Button type="submit" className="w-full">
        <UserPlus aria-hidden="true" />
        注册并等待审核
      </Button>
    </form>
  );
}
