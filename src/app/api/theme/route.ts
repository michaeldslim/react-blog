import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { ThemeName } from "@/types";
import { DEFAULT_THEME, isValidThemeName } from "@/lib/themeConfig";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { THEME_ANON_COOKIE_NAME, THEME_COOKIE_NAME } from "@/lib/themeServer";

interface IThemeRequestBody {
  theme?: string;
}

export async function POST(request: Request) {
  let body: IThemeRequestBody | null = null;

  try {
    body = (await request.json()) as IThemeRequestBody;
  } catch {
    body = null;
  }

  const rawTheme = body?.theme ?? DEFAULT_THEME;

  if (!isValidThemeName(rawTheme)) {
    return NextResponse.json({ ok: false, error: "Invalid theme" }, { status: 400 });
  }

  const theme = rawTheme as ThemeName;

  const cookieStore = await cookies();
  let anonId = cookieStore.get(THEME_ANON_COOKIE_NAME)?.value;
  if (!anonId) {
    anonId = crypto.randomUUID();
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceRoleKey) {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from("theme_preferences")
        .upsert({ anon_id: anonId, theme }, { onConflict: "anon_id" });

      if (error) {
        // Log and continue; client-side theming should still work.
        console.error("Supabase theme_preferences upsert error:", error.message);
      }
    } catch (error) {
      console.error("Supabase theme_preferences unexpected error:", error);
    }
  }

  const response = NextResponse.json({ ok: true, theme });

  // Persist the theme directly in a cookie so it works even without Supabase.
  response.cookies.set(THEME_COOKIE_NAME, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: "lax",
  });

  // Also keep an anon id cookie so we can link to Supabase rows when available.
  response.cookies.set(THEME_ANON_COOKIE_NAME, anonId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: "lax",
  });

  return response;
}

export const runtime = "nodejs";
