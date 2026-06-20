import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { PageToast } from "@/components/ui/page-toast";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    r?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthShell eyebrow="欢迎回来">
      <PageToast message={params.error} variant="error" />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>登录 One AI</CardTitle>
          <CardDescription>
            登录后系统会根据账号审核状态自动跳转。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm resetSignal={params.r ?? params.error ?? ""} />

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
