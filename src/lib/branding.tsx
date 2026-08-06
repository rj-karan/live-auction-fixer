import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import tournamentPlaceholder from "@/assets/tournament-placeholder.jpg";

/* ------------------------------------------------------------------ *
 * Branding & Appearance — purely presentational global customization.
 * Values live in the `site_branding` table (single row, id = 1).
 * ------------------------------------------------------------------ */

export type BrandingAssets = Partial<Record<AssetKey, string>>;
export type BrandingColors = Partial<Record<ColorKey, string>>;
export type BrandingTypography = {
  headingFont?: string;
  bodyFont?: string;
  fontScale?: number;
};

export type AssetKey =
  | "tournamentBanner"
  | "tournamentLogo"
  | "teamLogo"
  | "teamBanner"
  | "playerPhoto"
  | "playerAvatar"
  | "trophy"
  | "emptyState"
  | "heroBanner"
  | "stadiumBg"
  | "auctionBg"
  | "siteLogo"
  | "adminLogo"
  | "loadingLogo"
  | "favicon"
  | "headerBg"
  | "footerBg"
  | "loginBg"
  | "dashboardBg"
  | "tournamentBg"
  | "teamPageBg"
  | "playerPageBg"
  | "statsBg";

export type ColorKey =
  | "primary"
  | "secondary"
  | "accent"
  | "button"
  | "card"
  | "header"
  | "footer"
  | "statusSold"
  | "statusUnsold"
  | "statusAvailable";

export const ASSET_GROUPS: { title: string; items: { key: AssetKey; label: string }[] }[] = [
  {
    title: "Default images",
    items: [
      { key: "tournamentBanner", label: "Default Tournament Banner" },
      { key: "tournamentLogo", label: "Default Tournament Logo" },
      { key: "teamLogo", label: "Default Team Logo" },
      { key: "teamBanner", label: "Default Team Banner" },
      { key: "playerPhoto", label: "Default Player Image" },
      { key: "playerAvatar", label: "Default Player Avatar" },
      { key: "trophy", label: "Default Trophy Image" },
      { key: "emptyState", label: "Empty State Illustration" },
    ],
  },
  {
    title: "Theme backgrounds",
    items: [
      { key: "heroBanner", label: "Hero Banner" },
      { key: "stadiumBg", label: "Stadium Background" },
      { key: "auctionBg", label: "Auction Background" },
      { key: "headerBg", label: "Header Background" },
      { key: "footerBg", label: "Footer Background" },
      { key: "loginBg", label: "Login Background" },
      { key: "dashboardBg", label: "Dashboard Background" },
      { key: "tournamentBg", label: "Public Tournament Background" },
      { key: "teamPageBg", label: "Team Page Background" },
      { key: "playerPageBg", label: "Player Page Background" },
      { key: "statsBg", label: "Statistics Background" },
    ],
  },
  {
    title: "Logos",
    items: [
      { key: "siteLogo", label: "Main Website Logo" },
      { key: "adminLogo", label: "Admin Logo" },
      { key: "loadingLogo", label: "Loading Logo" },
      { key: "favicon", label: "Favicon / Browser Tab Icon" },
    ],
  },
];

export const COLOR_FIELDS: { key: ColorKey; label: string; fallback: string }[] = [
  { key: "primary", label: "Primary Color", fallback: "#16213c" },
  { key: "secondary", label: "Secondary Color", fallback: "#f0f2f6" },
  { key: "accent", label: "Accent Color", fallback: "#f0f2f6" },
  { key: "button", label: "Button / Highlight Color", fallback: "#f59e0b" },
  { key: "card", label: "Card Background", fallback: "#ffffff" },
  { key: "header", label: "Header Background", fallback: "#16213c" },
  { key: "footer", label: "Footer Background", fallback: "#16213c" },
  { key: "statusSold", label: "SOLD Badge", fallback: "#f59e0b" },
  { key: "statusUnsold", label: "UNSOLD Badge", fallback: "#dc2626" },
  { key: "statusAvailable", label: "AVAILABLE Badge", fallback: "#64748b" },
];

export const FONT_OPTIONS = [
  "Default",
  "Inter",
  "Poppins",
  "Montserrat",
  "Oswald",
  "Bebas Neue",
  "Rubik",
  "Space Grotesk",
  "Playfair Display",
] as const;

const COLOR_VAR: Record<ColorKey, string[]> = {
  primary: ["--primary"],
  secondary: ["--secondary"],
  accent: ["--accent"],
  button: ["--active", "--ring"],
  card: ["--card", "--popover"],
  header: ["--brand-header-bg"],
  footer: ["--brand-footer-bg"],
  statusSold: ["--brand-status-sold"],
  statusUnsold: ["--brand-status-unsold"],
  statusAvailable: ["--brand-status-available"],
};

export type Branding = {
  assets: BrandingAssets;
  colors: BrandingColors;
  typography: BrandingTypography;
};

export const EMPTY_BRANDING: Branding = { assets: {}, colors: {}, typography: {} };

/* Module cache so non-React helpers can read the current defaults. */
let cache: Branding = EMPTY_BRANDING;
export const brandingCache = () => cache;

export const DEFAULT_FALLBACKS: Partial<Record<AssetKey, string>> = {
  tournamentBanner: tournamentPlaceholder,
  tournamentLogo: tournamentPlaceholder,
};

export function brandAsset(key: AssetKey): string | undefined {
  return cache.assets?.[key] || DEFAULT_FALLBACKS[key];
}

const BrandingContext = createContext<{
  branding: Branding;
  loading: boolean;
  refresh: () => Promise<void>;
}>({ branding: EMPTY_BRANDING, loading: true, refresh: async () => {} });

export function applyBranding(b: Branding) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  for (const { key } of COLOR_FIELDS) {
    const vars = COLOR_VAR[key];
    const value = b.colors?.[key];
    for (const v of vars) {
      if (value) root.style.setProperty(v, value);
      else root.style.removeProperty(v);
    }
  }

  const fonts = [b.typography?.headingFont, b.typography?.bodyFont].filter(
    (f): f is string => !!f && f !== "Default",
  );
  const existing = document.getElementById("brand-fonts");
  if (fonts.length) {
    const href = `https://fonts.googleapis.com/css2?${fonts
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800;900`)
      .join("&")}&display=swap`;
    if (existing) (existing as HTMLLinkElement).href = href;
    else {
      const link = document.createElement("link");
      link.id = "brand-fonts";
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  } else if (existing) {
    existing.remove();
  }

  const heading = b.typography?.headingFont;
  const body = b.typography?.bodyFont;
  if (heading && heading !== "Default") root.style.setProperty("--brand-font-heading", `"${heading}"`);
  else root.style.removeProperty("--brand-font-heading");
  if (body && body !== "Default") root.style.setProperty("--brand-font-body", `"${body}"`);
  else root.style.removeProperty("--brand-font-body");

  const scale = b.typography?.fontScale;
  if (scale && scale !== 100) root.style.setProperty("--brand-font-scale", `${scale}%`);
  else root.style.removeProperty("--brand-font-scale");

  const favicon = b.assets?.favicon;
  if (favicon) {
    let icon = document.querySelector<HTMLLinkElement>("link#brand-favicon");
    if (!icon) {
      icon = document.createElement("link");
      icon.id = "brand-favicon";
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = favicon;
  }

  cache = b;
}

function normalize(row: any): Branding {
  return {
    assets: (row?.assets ?? {}) as BrandingAssets,
    colors: (row?.colors ?? {}) as BrandingColors,
    typography: (row?.typography ?? {}) as BrandingTypography,
  };
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(EMPTY_BRANDING);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("site_branding").select("*").eq("id", 1).maybeSingle();
    const next = normalize(data);
    setBranding(next);
    applyBranding(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ branding, loading, refresh }), [branding, loading, refresh]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}

export async function saveBranding(b: Branding) {
  const { error } = await supabase
    .from("site_branding")
    .upsert({ id: 1, ...b, updated_at: new Date().toISOString() } as any);
  if (error) throw new Error(error.message);
}
