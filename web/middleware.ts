import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/adminCookie";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const session = request.cookies.get(ADMIN_COOKIE)?.value;
  if (session) response.cookies.set(ADMIN_COOKIE, session, adminCookieOptions);
  return response;
}

export const config = { matcher: "/admin/:path*" };
