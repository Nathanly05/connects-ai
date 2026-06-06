import Image from "next/image";
import { redirect } from "next/navigation";
import { CreditCard, Upload } from "lucide-react";
import { submitRechargeRequestAction } from "@/app/recharge/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getRechargePlan, rechargePlans } from "@/lib/recharge-plans";
import { createClient } from "@/lib/supabase/server";

type RechargePageProps = {
  searchParams: Promise<{
    plan?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function RechargePage({ searchParams }: RechargePageProps) {
  const params = await searchParams;
  const selectedPlan = getRechargePlan(params.plan);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="page-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CreditCard className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>GlobePay 收款二维码</CardTitle>
            <CardDescription>
              支持：
              <br />
              微信支付
              <br />
              支付宝
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border bg-white p-3">
              <Image
                src="/globepay.jpg"
                alt="GlobePay 收款二维码"
                width={720}
                height={720}
                className="aspect-square w-full rounded-md object-cover"
                priority
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              付款后请上传付款截图等待审核。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>提交充值申请</CardTitle>
              <Badge variant="secondary">{selectedPlan.name}</Badge>
            </div>
            <CardDescription>
              当前选择：{selectedPlan.priceLabel} / {selectedPlan.credits} Credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {params.success ? (
              <Alert className="mb-5 border-primary/20 bg-primary/10 text-primary">
                <AlertDescription>{params.success}</AlertDescription>
              </Alert>
            ) : null}

            {params.error ? (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>{params.error}</AlertDescription>
              </Alert>
            ) : null}

            <form action={submitRechargeRequestAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="planId">充值套餐</Label>
                <select
                  id="planId"
                  name="planId"
                  defaultValue={selectedPlan.id}
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                >
                  {rechargePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.priceLabel} - {plan.credits} Credits
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="screenshot">上传付款截图</Label>
                <Input
                  id="screenshot"
                  name="screenshot"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  支持 JPG、PNG、WebP，最大 5MB。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">备注（可选）</Label>
                <Textarea
                  id="note"
                  name="note"
                  placeholder="可以填写付款账号、微信昵称或其他备注"
                />
              </div>

              <Button type="submit" className="w-full">
                <Upload aria-hidden="true" />
                提交审核
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
