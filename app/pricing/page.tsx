import Link from "next/link";
import { Check, MessageCircle, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { rechargePlans } from "@/lib/recharge-plans";

export default function PricingPage() {
  return (
    <main className="page-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <WalletCards className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">充值套餐</h1>
              <Badge variant="secondary">GlobePay 人工审核</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              选择套餐后提交充值申请，管理员审核通过后发放 Remaining Chats。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/chat">
              <MessageCircle aria-hidden="true" />
              返回聊天
            </Link>
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {rechargePlans.map((plan) => (
            <Card key={plan.id} className="relative overflow-hidden">
              {plan.badge ? (
                <div className="absolute right-4 top-4">
                  <Badge>{plan.badge}</Badge>
                </div>
              ) : null}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>适合不同阶段的中文 AI 对话使用。</CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-[250px] flex-col">
                <div>
                  <p className="text-3xl font-semibold tracking-normal">{plan.priceLabel}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.credits} chats</p>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" aria-hidden="true" />
                    人工审核充值
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" aria-hidden="true" />
                    支持微信支付和支付宝
                  </li>
                </ul>
                <Button asChild className="mt-auto w-full">
                  <Link href={`/recharge?plan=${plan.id}`}>立即充值</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
