import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
            注册后账号会进入审核队列，通过后按风控规则发放初始 10 credits。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />

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
