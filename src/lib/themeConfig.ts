import type { ThemeName } from "@/types";

export type ThemeConfigSource = "local" | "public";

export interface IThemeOption {
  name: ThemeName;
  label: string;
}

const localThemeOptions: IThemeOption[] = [
  { name: "dark-teal", label: "Dark teal" },
  { name: "dark-green", label: "Dark green" },
  { name: "light-neutral", label: "Light neutral" },
];

const publicThemeOptions: IThemeOption[] = [
  { name: "dark-teal", label: "Dark teal" },
  { name: "dark-green", label: "Dark green" },
  { name: "light-neutral", label: "Light neutral" },
];

const rawSource = process.env.NEXT_PUBLIC_THEME_SOURCE;
const source: ThemeConfigSource = rawSource === "public" ? "public" : "local";

export const themeOptions: IThemeOption[] =
  source === "public" ? publicThemeOptions : localThemeOptions;

export const DEFAULT_THEME: ThemeName = themeOptions[0]?.name ?? "dark-teal";

export const ENABLE_THEME_SWITCHER =
  process.env.NEXT_PUBLIC_ENABLE_THEME_SWITCHER === "true";

export function isValidThemeName(value: string): value is ThemeName {
  return themeOptions.some((option) => option.name === value);
}
