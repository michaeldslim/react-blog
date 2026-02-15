import { cookies } from "next/headers";

import type { ThemeName } from "@/types";
import { DEFAULT_THEME, isValidThemeName } from "@/lib/themeConfig";
import { getSupabaseClient } from "@/lib/supabaseClient";

// Cookie that stores the actual theme name (used everywhere, even without Supabase).
export const THEME_COOKIE_NAME = "theme";

// Cookie that stores an anonymous id used to link a browser to a Supabase row.
export const THEME_ANON_COOKIE_NAME = "anon_theme_id";

export async function getThemeForRequest(): Promise<ThemeName> {
  const cookieStore = await cookies();

  // 1) Prefer the theme stored directly in the cookie.
  const themeFromCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  if (themeFromCookie && isValidThemeName(themeFromCookie)) {
    return themeFromCookie as ThemeName;
  }

  // 2) Fallback to Supabase if configured and we have an anon id.
  const anonId = cookieStore.get(THEME_ANON_COOKIE_NAME)?.value;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || !anonId) {
    return DEFAULT_THEME;
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("theme_preferences")
      .select("theme")
      .eq("anon_id", anonId)
      .maybeSingle();

    if (error || !data || typeof (data as { theme?: unknown }).theme !== "string") {
      return DEFAULT_THEME;
    }

    const rawTheme = (data as { theme: string }).theme;
    return isValidThemeName(rawTheme) ? (rawTheme as ThemeName) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
