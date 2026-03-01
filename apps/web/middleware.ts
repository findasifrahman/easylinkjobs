import { NextRequest, NextResponse } from "next/server";
import { isSupportedLocale } from "@/lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/en", request.url));
  }

  const maybeLocale = pathname.split("/")[1];
  if (!isSupportedLocale(maybeLocale)) {
    return NextResponse.redirect(new URL(`/en${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"]
};
