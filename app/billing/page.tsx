import Link from "next/link";
import { Check, CreditCard, MessageCircle } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/billing/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { billingPlans } from "@/lib/billing-plans";

type BillingPageProps = {
  searchParams: Promise<{
    success?: string;
    canceled?: string;
    error?: string;
    session_id?: string;
  }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams;

  return (
    <main className="page-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CreditCard className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">Stripe 自动充值</h1>
              <Badge variant="secondary">自动到账</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              选择套餐后进入 Stripe Checkout，支付成功后自动增加 credits。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/chat">
              <MessageCircle aria-hidden="true" />
              返回聊天
            </Link>
          </Button>
        </header>

        {params.success ? (
          <Alert className="border-primary/20 bg-primary/10 text-primary">
            <AlertDescription>
              支付已完成。Stripe webhook 处理后 credits 会自动到账。
            </AlertDescription>
          </Alert>
        ) : null}

        {params.canceled ? (
          <Alert>
            <AlertDescription>支付已取消，可以重新选择套餐。</AlertDescription>
          </Alert>
        ) : null}

        {params.error ? (
          <Alert variant="destructive">
            <AlertDescription>{params.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {billingPlans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>Stripe Checkout 一次性购买。</CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-[250px] flex-col">
                <div>
                  <p className="text-3xl font-semibold tracking-normal">{plan.priceLabel}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {plan.credits} credits
                  </p>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" aria-hidden="true" />
                    支付成功后自动到账
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" aria-hidden="true" />
                    Stripe 安全托管支付页面
                  </li>
                </ul>
                <form action={createCheckoutSessionAction} className="mt-auto">
                  <input type="hidden" name="planId" value={plan.id} />
                  <Button type="submit" className="w-full">
                    点击购买
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
