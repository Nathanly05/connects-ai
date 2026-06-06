import Link from "next/link";
import { CircleX, LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export default function RejectedPage() {
  return (
    <AuthShell eyebrow="审核状态">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <CircleX className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>申请未通过</CardTitle>
          <CardDescription>
            账号申请未通过，如需帮助请联系管理员微信：wishmelucky555
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline">
            <Link href="/auth/login">返回登录</Link>
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" className="w-full">
              <LogOut aria-hidden="true" />
              退出当前账号
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
