export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "navo-theme";

export function getThemePreference(): ThemePreference {
  if (typeof localStorage === "undefined") return "system";
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyTheme(theme: ThemePreference): void {
  if (typeof document === "undefined") return;
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function setThemePreference(theme: ThemePreference): void {
  if (typeof localStorage !== "undefined") {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  }
  applyTheme(theme);
}
