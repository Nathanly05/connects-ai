import Link from "next/link";
import { LogIn } from "lucide-react";
import { signInAction } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthShell eyebrow="欢迎回来">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>登录 Connects AI</CardTitle>
          <CardDescription>
            登录后系统会根据账号审核状态自动跳转。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error ? (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{params.error}</AlertDescription>
            </Alert>
          ) : null}

          <form action={signInAction} className="space-y-5">
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
                autoComplete="current-password"
                placeholder="请输入密码"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <LogIn aria-hidden="true" />
              登录
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              申请内测
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
