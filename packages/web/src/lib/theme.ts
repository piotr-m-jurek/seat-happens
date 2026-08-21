export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

export function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function isDark(theme: Theme): boolean {
  return theme === "dark" || (theme === "system" && systemPrefersDark());
}

// Applies the theme to the document and persists it, then — only while
// "system" is selected — keeps it in sync with OS-level changes. Mirrors
// the inline script in index.html that applies the stored/system theme
// before this ever runs, so there's no flash of the wrong theme on load.
// Returns a cleanup function for the OS-preference listener.
export function applyTheme(theme: Theme): () => void {
  localStorage.setItem(STORAGE_KEY, theme);
  const apply = () => document.documentElement.classList.toggle("dark", isDark(theme));
  apply();
  if (theme !== "system") return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", apply);
  return () => media.removeEventListener("change", apply);
}
