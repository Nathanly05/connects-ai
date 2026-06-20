import Link from "next/link";
import { Sparkles } from "lucide-react";

type AuthShellProps = {
  children: React.ReactNode;
  eyebrow?: string;
};

export function AuthShell({ children, eyebrow = "小范围内测" }: AuthShellProps) {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm"
          >
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            One AI
          </Link>
          <p className="mt-8 text-sm font-medium text-primary">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">
            面向中文用户的 AI 聊天平台
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600">
            当前仅开放给内测用户。注册后需要管理员审核，通过后即可进入平台。
          </p>
        </div>
        {children}
      </section>
    </main>
  );
}
