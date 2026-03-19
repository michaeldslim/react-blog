import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getAllowedHosts(request: NextRequest): Set<string> {
  const hosts = new Set<string>();

  hosts.add(request.nextUrl.host);

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    hosts.add(forwardedHost);
  }

  const baseUrls = [process.env.NEXT_PUBLIC_BASE_URL, process.env.NEXTAUTH_URL].filter(Boolean);
  for (const baseUrl of baseUrls) {
    try {
      hosts.add(new URL(baseUrl as string).host);
    } catch {
      // ignore invalid URL envs
    }
  }

  return hosts;
}

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    return getAllowedHosts(request).has(originUrl.host);
  } catch {
    return false;
  }
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const strictGraphqlOriginCheck = process.env.ENFORCE_GRAPHQL_ORIGIN_CHECK === "true";

  const isStateChangingApiRequest =
    request.method === "POST" &&
    (pathname === "/api/theme" || (strictGraphqlOriginCheck && pathname === "/api/graphql"));

  if (isStateChangingApiRequest && !isAllowedOrigin(request)) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Forbidden: cross-origin POST blocked" }, { status: 403 }),
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};