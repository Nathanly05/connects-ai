import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type ProfileStatus = "pending" | "approved" | "rejected";
type ProfileRole = "user" | "admin";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
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
      pathname.startsWith("/billing")
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
    pathname.startsWith("/billing")
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

    return redirectTo(request, pathForStatus(profile?.status as ProfileStatus | undefined));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
