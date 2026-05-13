import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname === "/admin") {
    return NextResponse.redirect(new URL("/admin/users", request.url));
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Paths listed here BYPASS the auth gate. Add new public paths in two places:
    //   1. here (so the proxy doesn't run)
    //   2. confirm the underlying route works without `getSession()`
    // Public additions vs upstream:
    //   - api/health        — Sealos liveness/readiness probe (must respond 200)
    //   - api/payments/zpay — Zpay async notify + sync return (signed via MD5,
    //                         caller is the Zpay gateway, not a logged-in user)
    //   - pricing           — public pricing page so prospects can see plans
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth|api/health|api/payments/zpay|export|sign-in|sign-up|pricing).*)",
  ],
};
