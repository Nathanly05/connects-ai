import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Menu, Sparkles, X } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type AppNavItem = "chat" | "billing" | "recharge" | "account" | "support" | "admin";

type AppNavProps = {
  active: AppNavItem;
};

type ProfileRole = "user" | "admin";
type ProfileStatus = "pending" | "approved" | "rejected";

type Profile = {
  email: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  credits: number;
};

const baseLinks: Array<{
  key: AppNavItem;
  label: string;
  href: string;
}> = [
  { key: "chat", label: "Chat", href: "/chat" },
  { key: "billing", label: "Billing", href: "/billing" },
  { key: "recharge", label: "Recharge", href: "/recharge" },
  { key: "account", label: "Account", href: "/account" },
  { key: "support", label: "Support", href: "/support" }
];

function initialsFromEmail(email: string) {
  const name = email.split("@")[0]?.trim() || "U";
  return name.slice(0, 2).toUpperCase();
}

function NavLink({
  href,
  label,
  active
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        active && "bg-primary/10 text-primary"
      )}
    >
      {label}
    </Link>
  );
}

export async function AppNav({ active }: AppNavProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select("email, role, status, credits")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as Profile | null;
  const email = profile?.email ?? user.email ?? "user";
  const credits = profile?.credits ?? 0;
  const isAdmin = profile?.role === "admin" && profile.status === "approved";
  const links = isAdmin
    ? [...baseLinks, { key: "admin" as const, label: "Admin", href: "/admin" }]
    : baseLinks;

  return (
    <nav className="rounded-lg border bg-white px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/chat" className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <span className="truncate text-base font-semibold tracking-normal">Connects AI</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((item) => (
            <NavLink
              key={item.key}
              href={item.href}
              label={item.label}
              active={active === item.key}
            />
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Badge variant="secondary">{credits} Credits</Badge>
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-md border bg-white px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initialsFromEmail(email)}
            </span>
            <span className="max-w-[180px] truncate text-muted-foreground">{email}</span>
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut aria-hidden="true" />
              退出登录
            </Button>
          </form>
        </div>

        <details className="group relative md:hidden">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md border bg-white transition-colors hover:bg-secondary [&::-webkit-details-marker]:hidden">
            <Menu className="size-5 group-open:hidden" aria-hidden="true" />
            <X className="hidden size-5 group-open:block" aria-hidden="true" />
            <span className="sr-only">打开导航</span>
          </summary>
          <div className="absolute right-0 top-12 z-40 w-[min(86vw,320px)] rounded-xl border bg-white p-3 shadow-lg">
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initialsFromEmail(email)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{email}</p>
                <p className="text-xs text-muted-foreground">{credits} Credits</p>
              </div>
            </div>
            <div className="grid gap-1">
              {links.map((item) => (
                <NavLink
                  key={item.key}
                  href={item.href}
                  label={item.label}
                  active={active === item.key}
                />
              ))}
            </div>
            <form action={signOutAction} className="mt-3 border-t pt-3">
              <Button type="submit" variant="outline" className="w-full justify-start">
                <LogOut aria-hidden="true" />
                退出登录
              </Button>
            </form>
          </div>
        </details>
      </div>
    </nav>
  );
}
