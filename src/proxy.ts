import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { isConfigured } from "@/lib/env";

const PUBLIC_PATHS = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/atualizar-senha",
  "/api/",
  "/sw.js",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/convite/",
];
const AUTH_ONLY_PAGES = ["/login", "/cadastro", "/recuperar-senha"];

/**
 * Proteção de rotas: sem cookie de sessão → /login. A sessão é validada de fato
 * no servidor (getViewer), aqui só se decide o redirecionamento.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isConfigured()) return NextResponse.next();

  const hasSession = Boolean(getSessionCookie(request));
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_ONLY_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
