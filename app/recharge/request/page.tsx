import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { submitGlobePayRechargeRequestAction } from "@/app/recharge/request/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageToast } from "@/components/ui/page-toast";
import { Textarea } from "@/components/ui/textarea";
import { billingPlans } from "@/lib/billing-plans";
import { createClient } from "@/lib/supabase/server";

type RechargeRequestPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function RechargeRequestPage({
  searchParams
}: RechargeRequestPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="page-shell min-h-screen px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6">
        <AppNav active="recharge" />
        <PageToast
          message={params.error ?? params.success}
          variant={params.error ? "error" : "success"}
        />

        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ReceiptText className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">提交充值申请</h1>
              <Badge variant="secondary">GlobePay</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              付款后提交信息，管理员审核通过后 credits 会到账。
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/recharge?method=globepay">
              <ArrowLeft aria-hidden="true" />
              返回扫码充值
            </Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>充值信息</CardTitle>
            <CardDescription>
              当前登录邮箱：{user.email ?? "未读取到邮箱"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <form action={submitGlobePayRechargeRequestAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="packageName">套餐</Label>
                <select
                  id="packageName"
                  name="packageName"
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                  defaultValue="Pro"
                  required
                >
                  {billingPlans.map((plan) => (
                    <option key={plan.id} value={plan.name}>
                      {plan.name} - {plan.priceLabel} - {plan.credits} credits
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">付款金额</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="例如：9.99"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTime">付款时间</Label>
                  <Input
                    id="paymentTime"
                    name="paymentTime"
                    type="datetime-local"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remark">付款备注</Label>
                <Textarea
                  id="remark"
                  name="remark"
                  placeholder="请填写付款时备注的邮箱、微信昵称或转账备注"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="screenshotUrl">付款截图链接（可选）</Label>
                <Input
                  id="screenshotUrl"
                  name="screenshotUrl"
                  type="url"
                  placeholder="https://..."
                />
              </div>

              <Button type="submit" className="w-full">
                提交充值申请
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
