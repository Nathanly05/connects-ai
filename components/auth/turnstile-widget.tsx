"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

type TurnstileWidgetProps = {
  action: "login" | "register";
  onTokenChange?: (token: string) => void;
  resetSignal?: string;
};

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  theme: "light";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  "timeout-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      getResponse: (widgetId: string) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({
  action,
  onTokenChange,
  resetSignal = ""
}: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const didMountRef = useRef(false);
  const onTokenChangeRef = useRef<TurnstileWidgetProps["onTokenChange"]>(onTokenChange);
  const tokenRef = useRef("");
  const [scriptReady, setScriptReady] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  const updateToken = useCallback((nextToken: string) => {
    tokenRef.current = nextToken;

    if (inputRef.current) {
      inputRef.current.value = nextToken;
    }

    setToken(nextToken);
    onTokenChangeRef.current?.(nextToken);
  }, []);

  const clearToken = useCallback(() => {
    updateToken("");
  }, [updateToken]);

  const resetWidget = useCallback(() => {
    clearToken();

    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [clearToken]);

  useEffect(() => {
    if (window.turnstile) {
      setScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (!siteKey || !scriptReady || !window.turnstile || !containerRef.current || widgetIdRef.current) {
      return;
    }

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "light",
      callback: (turnstileToken: string) => {
        updateToken(turnstileToken);
      },
      "expired-callback": clearToken,
      "error-callback": clearToken,
      "timeout-callback": clearToken
    });
    widgetIdRef.current = widgetId;

    const responseSyncInterval = window.setInterval(() => {
      if (!window.turnstile || !widgetIdRef.current) {
        return;
      }

      const responseToken = window.turnstile.getResponse(widgetIdRef.current);

      if (responseToken && responseToken !== tokenRef.current) {
        updateToken(responseToken);
      }
    }, 250);

    return () => {
      window.clearInterval(responseSyncInterval);

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      updateToken("");
    };
  }, [action, clearToken, scriptReady, siteKey, updateToken]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    resetWidget();
  }, [resetSignal, resetWidget]);

  if (!siteKey) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        人机验证暂未配置，请联系管理员。
      </div>
    );
  }

  return (
    <div className="flex justify-center rounded-md border bg-secondary/40 px-3 py-3">
      <input
        ref={inputRef}
        type="hidden"
        name="cf-turnstile-response"
        value={token}
        readOnly
      />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </div>
  );
}
