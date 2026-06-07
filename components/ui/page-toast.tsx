"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageToastProps = {
  message?: string | null;
  variant?: "success" | "error" | "info";
};

export function PageToast({ message, variant = "info" }: PageToastProps) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));

    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || !visible) {
    return null;
  }

  const isError = variant === "error";
  const isInfo = variant === "info";

  return (
    <div className="fixed right-4 top-4 z-[80] w-[calc(100vw-2rem)] max-w-sm sm:right-6 sm:top-6">
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg",
          isError
            ? "border-destructive/30"
            : isInfo
              ? "border-border"
              : "border-primary/20"
        )}
        role={isError ? "alert" : "status"}
      >
        {isError ? (
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        ) : isInfo ? (
          <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        )}
        <p className="min-w-0 flex-1 leading-6 text-foreground">{message}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-1 size-8 shrink-0"
          aria-label="关闭提示"
          onClick={() => setVisible(false)}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
