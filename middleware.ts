import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, cookieIsValid } from "@/lib/auth";

// Routes that work without auth. Everything else needs the cookie.
//   /login   — the password form itself
//   /study-next — accepts ?t=<password> so the Telegram link can sign you
//                 in on first tap. Without ?t, falls through to /login.
//   /api/* — server-to-server endpoints check their own ?t=<password>.
const PUBLIC_PATHS = new Set(["/login", "/study-next"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.next();
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (await cookieIsValid(cookie)) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  // Preserve where the user was heading so we can bounce them back.
  loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

// Skip Next.js internals + static assets.
export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
