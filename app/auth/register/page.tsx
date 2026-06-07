import Link from "next/link";
import { UserPlus } from "lucide-react";
import { signUpAction } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";
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

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  return (
    <AuthShell>
      <PageToast message={params.error} variant="error" />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>创建内测账号</CardTitle>
          <CardDescription>
            注册后账号会进入审核队列，通过后获得初始 50 credits。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUpAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="至少 6 位"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <UserPlus aria-hidden="true" />
              注册并等待审核
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              去登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
