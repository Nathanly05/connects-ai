import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, LifeBuoy, QrCode } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/billing/actions";
import { AppNav } from "@/components/layout/app-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { PageToast } from "@/components/ui/page-toast";
import { billingPlans } from "@/lib/billing-plans";

type PaymentMethod = "stripe" | "globepay";

type PaymentMethodPageProps = {
  basePath: "/billing" | "/recharge";
  method?: string;
  success?: string;
  canceled?: string;
  error?: string;
};

function getMethod(value?: string): PaymentMethod | null {
  if (value === "stripe" || value === "globepay") {
    return value;
  }

  return null;
}

function PageHeader({
  title,
  description,
  showSupportLink = false
}: {
  title: string;
  description: string;
  showSupportLink?: boolean;
}) {
  return (
    <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CreditCard className="size-5 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-semibold tracking-normal">{title}</h1>
          <Badge variant="secondary">Credits 充值</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showSupportLink ? (
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/support">
            <LifeBuoy aria-hidden="true" />
            联系客服 / 反馈问题
          </Link>
        </Button>
      ) : null}
    </header>
  );
}

function PaymentMethodChooser({ basePath }: { basePath: "/billing" | "/recharge" }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Link href={`${basePath}?method=stripe`} className="group block">
        <Card className="h-full transition-colors group-hover:border-primary/50">
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CreditCard className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>Stripe 自动充值</CardTitle>
            <CardDescription>
              适合海外银行卡，支付成功后 credits 自动到账
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
              选择 Stripe
            </span>
          </CardContent>
        </Card>
      </Link>

      <Link href={`${basePath}?method=globepay`} className="group block">
        <Card className="h-full transition-colors group-hover:border-primary/50">
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <QrCode className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>微信/支付宝扫码充值</CardTitle>
            <CardDescription>
              适合中国用户，扫码付款后由管理员审核到账
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors group-hover:bg-secondary">
              选择扫码充值
            </span>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function StripePlans({ basePath }: { basePath: "/billing" | "/recharge" }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">Stripe 自动充值</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            选择套餐后进入 Stripe Checkout，支付成功后 credits 自动到账。
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={basePath}>
            <ArrowLeft aria-hidden="true" />
            重新选择
          </Link>
        </Button>
      </div>

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
    </div>
  );
}

function GlobePayInstructions({ basePath }: { basePath: "/billing" | "/recharge" }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">微信/支付宝扫码充值</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            扫码付款后由管理员审核到账，适合中国用户。
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={basePath}>
            <ArrowLeft aria-hidden="true" />
            重新选择
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <QrCode className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>GlobePay 收款二维码</CardTitle>
            <CardDescription>支持微信支付和支付宝。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-xs overflow-hidden rounded-lg border bg-white p-3 sm:max-w-sm lg:max-w-none">
              <Image
                src="/globepay.jpg"
                alt="GlobePay 收款二维码"
                width={720}
                height={720}
                className="aspect-square w-full rounded-md object-cover"
                priority
              />
            </div>
            <div className="mt-4 rounded-md border bg-secondary/60 px-3 py-2 text-sm leading-6">
              管理员联系方式：微信 wishmelucky555
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {billingPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>{plan.credits} credits</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tracking-normal">{plan.priceLabel}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>充值说明</CardTitle>
              <CardDescription>付款后提交充值申请，等待管理员人工审核。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ol className="space-y-3 text-sm leading-6 text-muted-foreground">
                <li>1. 请扫码付款</li>
                <li>2. 付款时备注你的注册邮箱</li>
                <li>3. 付款后等待管理员审核</li>
                <li>4. 审核通过后 credits 会到账</li>
              </ol>
              <Button asChild className="w-full">
                <Link href="/recharge/request">提交充值申请</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PaymentMethodPage({
  basePath,
  method,
  success,
  canceled,
  error
}: PaymentMethodPageProps) {
  const selectedMethod = getMethod(method);
  const toastMessage = error
    ? error
    : success
      ? "支付已完成。Stripe webhook 处理后 credits 会自动到账。"
      : canceled
        ? "支付已取消，可以重新选择套餐。"
        : null;
  const toastVariant = error ? "error" : canceled ? "info" : "success";

  return (
    <main className="page-shell min-h-screen px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 sm:gap-8">
        <AppNav active={basePath === "/billing" ? "billing" : "recharge"} />
        <PageToast message={toastMessage} variant={toastVariant} />

        <PageHeader
          title="选择支付方式"
          description="可以选择 Stripe 自动充值，也可以使用 GlobePay 微信/支付宝扫码充值。"
          showSupportLink={basePath === "/billing"}
        />

        {!selectedMethod ? <PaymentMethodChooser basePath={basePath} /> : null}
        {selectedMethod === "stripe" ? <StripePlans basePath={basePath} /> : null}
        {selectedMethod === "globepay" ? <GlobePayInstructions basePath={basePath} /> : null}
      </section>
    </main>
  );
}
