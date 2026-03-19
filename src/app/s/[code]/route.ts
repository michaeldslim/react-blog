import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getPublicBlogByShortCodeCached } from "@/lib/blogsCache";

interface IRouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, context: IRouteContext) {
  const { code } = await context.params;

  const blog = await getPublicBlogByShortCodeCached(code.trim());

  if (!blog) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const redirectUrl = new URL(`/blog/${blog.id}`, request.url);
  return NextResponse.redirect(redirectUrl, 307);
}

export const runtime = "nodejs";
