import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ *
 * Theme system — Light / Dark / Night Stadium / System.
 * Purely presentational: it only toggles classes on <html>.
 * ------------------------------------------------------------------ */

export type ThemeMode = "light" | "dark" | "stadium" | "system";

export const THEME_STORAGE_KEY = "auction-theme";
export const THEME_DEFAULT_KEY = "auction-theme-default";

export const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string; hint: string }[] = [
  { value: "light", label: "Light", icon: "☀", hint: "The original daytime theme" },
  { value: "dark", label: "Dark", icon: "🌙", hint: "Professional dark dashboard" },
  { value: "stadium", label: "Night Stadium", icon: "🏟", hint: "Night turf broadcast look" },
  { value: "system", label: "System", icon: "🖥", hint: "Follow your device setting" },
];

/** Inline script injected in <head> so the theme is applied before first paint. */
export const THEME_INIT_SCRIPT = `
(function(){try{
  var s=localStorage.getItem('${THEME_STORAGE_KEY}')||localStorage.getItem('${THEME_DEFAULT_KEY}')||'light';
  var m=s;
  if(m==='system'){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  var r=document.documentElement;
  r.classList.toggle('dark', m==='dark'||m==='stadium');
  r.classList.toggle('theme-stadium', m==='stadium');
  r.dataset.theme=m;
}catch(e){}})();
`;

export function resolveTheme(mode: ThemeMode): "light" | "dark" | "stadium" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark" || resolved === "stadium");
  root.classList.toggle("theme-stadium", resolved === "stadium");
  root.dataset.theme = resolved;
}

/** True whenever a dark-ish theme is active (dark or night stadium). */
export function isDarkActive() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

const ThemeContext = createContext<{
  mode: ThemeMode;
  resolved: "light" | "dark" | "stadium";
  setMode: (m: ThemeMode) => void;
}>({ mode: "light", resolved: "light", setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [resolved, setResolved] = useState<"light" | "dark" | "stadium">("light");

  useEffect(() => {
    const stored =
      (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ??
      (localStorage.getItem(THEME_DEFAULT_KEY) as ThemeMode | null) ??
      "light";
    setModeState(stored);
    applyTheme(stored);
    setResolved(resolveTheme(stored));
  }, []);

  // Follow the OS when the user picked "System".
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
      setResolved(resolveTheme("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
    applyTheme(m);
    setResolved(resolveTheme(m));
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Admin-configured default (used only when the visitor never picked a theme). */
export function rememberDefaultTheme(mode: ThemeMode | undefined) {
  if (typeof window === "undefined" || !mode) return;
  try {
    localStorage.setItem(THEME_DEFAULT_KEY, mode);
    if (!localStorage.getItem(THEME_STORAGE_KEY)) applyTheme(mode);
  } catch {
    /* ignore */
  }
}
