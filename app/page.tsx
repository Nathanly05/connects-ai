import Link from "next/link";
import { Bot, CheckCircle2, CreditCard, MessageCircle, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { LegalFooter } from "@/components/layout/legal-footer";

export default function HomePage() {
  return (
    <main className="page-shell min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <nav className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              C
            </span>
            <span className="text-lg font-semibold tracking-normal">One AI</span>
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/auth/login">登录</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/auth/register">立即申请内测</Link>
            </Button>
          </div>
        </nav>

        <header className="flex min-h-[calc(100dvh-220px)] flex-col justify-center gap-8 py-6 sm:py-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">中文 AI 助手平台</Badge>
              <Badge variant="outline">Powered by OpenAI</Badge>
              <Badge variant="outline">小范围内测</Badge>
            </div>
            <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl lg:text-6xl">
              One AI
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              一个面向中文用户的 AI 聊天与智能创作平台，支持高速对话、
              Remaining Chats 管理，以及 Stripe / 微信支付宝充值。
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/auth/register">
                  <Sparkles aria-hidden="true" />
                  立即申请内测
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/auth/login">
                  <MessageCircle aria-hidden="true" />
                  登录
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-white px-4 py-3 text-sm shadow-sm">
              <div className="flex items-center gap-2 font-medium">
                <CreditCard className="size-4 text-primary" aria-hidden="true" />
                Stripe 自动充值
              </div>
              <p className="mt-1 text-muted-foreground">适合海外银行卡，支付后自动到账。</p>
            </div>
            <div className="rounded-lg border bg-white px-4 py-3 text-sm shadow-sm">
              <div className="flex items-center gap-2 font-medium">
                <QrCode className="size-4 text-primary" aria-hidden="true" />
                微信支付宝充值
              </div>
              <p className="mt-1 text-muted-foreground">适合中国用户，管理员审核到账。</p>
            </div>
            <div className="rounded-lg border bg-white px-4 py-3 text-sm shadow-sm">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                审核制内测
              </div>
              <p className="mt-1 text-muted-foreground">注册后等待开通，保护小范围体验。</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 pb-10 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Bot className="mb-2 size-9 text-primary" aria-hidden="true" />
              <CardTitle>高速中文对话</CardTitle>
              <CardDescription>
                适合日常问答、文案创作、翻译润色和灵感整理。
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <CheckCircle2 className="mr-2 inline size-4 text-primary" aria-hidden="true" />
              快速响应中文用户的日常创作与问答需求。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck className="mb-2 size-9 text-primary" aria-hidden="true" />
              <CardTitle>内测审核机制</CardTitle>
              <CardDescription>
                小范围用户审核开通，帮助保持稳定和可控的使用体验。
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <CheckCircle2 className="mr-2 inline size-4 text-primary" aria-hidden="true" />
              新用户通过审核后获得初始对话次数。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CreditCard className="mb-2 size-9 text-primary" aria-hidden="true" />
              <CardTitle>充值与余额管理</CardTitle>
              <CardDescription>
                支持 Stripe 自动充值，也支持 GlobePay 微信/支付宝扫码充值。
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <CheckCircle2 className="mr-2 inline size-4 text-primary" aria-hidden="true" />
              账户页可查看购买和 Remaining Chats 记录。
            </CardContent>
          </Card>
        </section>
      </section>
      <LegalFooter />
    </main>
  );
}
