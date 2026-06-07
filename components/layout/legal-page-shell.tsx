import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, MessageCircle, Sparkles } from "lucide-react";
import { LegalFooter } from "@/components/layout/legal-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type LegalPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function LegalPageShell({ title, description, children }: LegalPageShellProps) {
  return (
    <main className="page-shell min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <nav className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-normal">Connects AI</span>
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
                返回首页
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/chat">
                <MessageCircle aria-hidden="true" />
                返回聊天
              </Link>
            </Button>
          </div>
        </nav>

        <Card>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">
              Connects AI
            </Badge>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="leading-6">{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-7 text-muted-foreground">
            {children}
          </CardContent>
        </Card>
      </section>
      <div className="mt-10">
        <LegalFooter />
      </div>
    </main>
  );
}
