import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LifeBuoy, Send } from "lucide-react";
import { submitSupportTicketAction } from "@/app/support/actions";
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
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support"
};

type SupportPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

const supportTypes = ["账号问题", "充值问题", "AI回复问题", "剩余次数问题", "其他"];

export default async function SupportPage({ searchParams }: SupportPageProps) {
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
        <AppNav active="support" />
        <PageToast
          message={params.error ?? params.success}
          variant={params.error ? "error" : "success"}
        />

        <header className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <LifeBuoy className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-normal">联系客服 / 反馈问题</h1>
              <Badge variant="secondary">Support</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              提交账号、充值、AI 回复或 Remaining Chats 相关问题，我们会尽快处理。
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>提交反馈</CardTitle>
            <CardDescription>
              当前登录邮箱：{user.email ?? "未读取到邮箱"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={submitSupportTicketAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="type">问题类型</Label>
                <select
                  id="type"
                  name="type"
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                  defaultValue="充值问题"
                  required
                >
                  {supportTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="例如：Stripe 支付后 Remaining Chats 未到账"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">详细描述</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="请尽量描述发生时间、页面、操作步骤和你看到的提示。"
                  className="min-h-36"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">联系方式（可选）</Label>
                <Input
                  id="contact"
                  name="contact"
                  placeholder="微信、邮箱或其他方便联系你的方式"
                />
              </div>

              <Button type="submit" className="w-full">
                <Send aria-hidden="true" />
                提交反馈
              </Button>
            </form>

            <div className="rounded-lg border bg-secondary/60 px-4 py-3 text-sm leading-6 text-muted-foreground">
              如需紧急处理，也可以联系微信：wishmelucky555
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
