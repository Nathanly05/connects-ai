import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type ProfileStatus = "pending" | "approved" | "rejected" | "banned";
type ProfileRole = "user" | "admin";

const bannedMessage = "账号已被限制使用，如有疑问请联系客服。";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function redirectToLoginWithError(request: NextRequest, message: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.search = "";
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function pathForStatus(status?: ProfileStatus | null) {
  if (status === "approved") {
    return "/chat";
  }

  if (status === "rejected") {
    return "/auth/rejected";
  }

  if (status === "banned") {
    return "/auth/login";
  }

  return "/auth/pending";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  const pathname = request.nextUrl.pathname;

  if (!hasSupabaseEnv()) {
    if (
      pathname.startsWith("/chat") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/billing") ||
      pathname.startsWith("/account") ||
      pathname.startsWith("/recharge") ||
      pathname.startsWith("/support")
    ) {
      return redirectTo(request, "/auth/login");
    }

    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/recharge") ||
    pathname.startsWith("/support")
  ) {
    if (!user) {
      return redirectTo(request, "/auth/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    const status = profile?.status as ProfileStatus | undefined;
    const role = profile?.role as ProfileRole | undefined;

    if (status === "banned") {
      await supabase.auth.signOut();
      return redirectToLoginWithError(request, bannedMessage);
    }

    if (status !== "approved") {
      return redirectTo(request, pathForStatus(status));
    }

    if (pathname.startsWith("/admin") && role !== "admin") {
      return redirectTo(request, "/chat");
    }
  }

  if (user && (pathname === "/auth/login" || pathname === "/auth/register")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    const status = profile?.status as ProfileStatus | undefined;

    if (status === "banned") {
      await supabase.auth.signOut();
      return redirectToLoginWithError(request, bannedMessage);
    }

    return redirectTo(request, pathForStatus(status));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
