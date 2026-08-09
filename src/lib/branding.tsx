import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import tournamentPlaceholder from "@/assets/tournament-placeholder.jpg";

/* ------------------------------------------------------------------ *
 * Branding & Appearance — purely presentational global customization.
 * Values live in the `site_branding` table (single row, id = 1).
 * ------------------------------------------------------------------ */

export type AssetKey =
  /* Website branding */
  | "siteLogo"
  | "adminLogo"
  | "loadingLogo"
  | "favicon"
  | "headerBg"
  | "footerBg"
  | "loginBg"
  /* Tournament */
  | "tournamentHeroBanner"
  | "tournamentLogo"
  | "tournamentBg"
  | "tournamentPlaceholder"
  | "tournamentEmpty"
  /* Team */
  | "teamLogo"
  | "teamCardBg"
  | "teamDetailsBg"
  | "teamPlaceholder"
  | "teamBanner"
  /* Player */
  | "playerPhoto"
  | "playerProfileBg"
  | "playerHeroBanner"
  | "playerCardBg"
  | "playerPlaceholder"
  | "playerEmpty"
  /* Auction */
  | "auctionBg"
  | "auctionHeroBanner"
  | "soldAnimationBg"
  | "trophy"
  | "hammer"
  | "auctionPlaceholder"
  | "auctionLoading"
  /* Page backgrounds */
  | "teamsPageBg"
  | "playersPageBg"
  | "statsBg"
  | "resultsBg"
  | "dashboardBg"
  /* Placeholders / empty states */
  | "emptyState"
  | "noResults"
  | "noStats"
  | "errorIllustration"
  | "loadingIllustration";

export type ColorKey =
  | "primary"
  | "secondary"
  | "accent"
  | "background"
  | "card"
  | "text"
  | "mutedText"
  | "border"
  | "button"
  | "hover"
  | "header"
  | "footer"
  | "statusSold"
  | "statusAvailable"
  | "statusUnsold";

export type ImagePosition = "center" | "top" | "bottom" | "left" | "right";
export type ImageFit = "cover" | "contain";
export type AssetLayout = { position?: ImagePosition; fit?: ImageFit; overlay?: number };

export type BrandingAssets = Partial<Record<AssetKey, string>>;
export type BrandingColors = Partial<Record<ColorKey, string>>;
export type BrandingLayout = Partial<Record<AssetKey, AssetLayout>>;
export type BrandingTypography = {
  headingFont?: string;
  bodyFont?: string;
  fontScale?: number;
};

export type AssetDef = {
  key: AssetKey;
  label: string;
  usedOn: string;
  controls: string;
  /** background/banner assets get position / fit / overlay controls */
  background?: boolean;
};

export type AssetGroup = { title: string; description: string; items: AssetDef[] };

export const ASSET_GROUPS: AssetGroup[] = [
  {
    title: "Website Branding",
    description: "Logos and chrome shared by the public site and the admin panel.",
    items: [
      {
        key: "siteLogo",
        label: "Main Website Logo",
        usedOn: "Public header + Admin header",
        controls: "The logo mark shown next to the site name in every header.",
      },
      {
        key: "adminLogo",
        label: "Admin Logo",
        usedOn: "Admin → Sidebar / header",
        controls: "Logo used inside the admin dashboard only.",
      },
      {
        key: "loadingLogo",
        label: "Loading Logo",
        usedOn: "Any page → Loading state",
        controls: "Logo displayed while a page is fetching data.",
      },
      {
        key: "favicon",
        label: "Favicon / Browser Tab Icon",
        usedOn: "Browser tab",
        controls: "The small icon shown in the browser tab.",
      },
      {
        key: "headerBg",
        label: "Header Background",
        usedOn: "Public header",
        controls: "Background image behind the sticky site header.",
        background: true,
      },
      {
        key: "footerBg",
        label: "Footer Background",
        usedOn: "Public footer",
        controls: "Background image behind the footer area.",
        background: true,
      },
      {
        key: "loginBg",
        label: "Login Background",
        usedOn: "Admin → Login page",
        controls: "Full page background on the admin sign-in screen.",
        background: true,
      },
    ],
  },
  {
    title: "Tournament Appearance",
    description: "Everything shown on the public tournament pages.",
    items: [
      {
        key: "tournamentHeroBanner",
        label: "Tournament Hero Banner",
        usedOn: "Public Tournament → Header",
        controls: "The large banner image at the top of the tournament page.",
        background: true,
      },
      {
        key: "tournamentLogo",
        label: "Default Tournament Logo",
        usedOn: "Public Tournament → Header, Home → Tournament cards",
        controls: "Fallback logo when a tournament has no logo uploaded.",
      },
      {
        key: "tournamentBg",
        label: "Tournament Default Background",
        usedOn: "Public Tournament → Overview",
        controls: "Page background behind the tournament overview content.",
        background: true,
      },
      {
        key: "tournamentPlaceholder",
        label: "Tournament Placeholder Image",
        usedOn: "Home → Tournament cards",
        controls: "Image used when a tournament has neither banner nor logo.",
      },
      {
        key: "tournamentEmpty",
        label: "Tournament Empty-State Image",
        usedOn: "Home → No tournaments yet",
        controls: "Illustration shown when no tournaments exist.",
      },
    ],
  },
  {
    title: "Team Appearance",
    description: "Team cards, team detail pages and their fallbacks.",
    items: [
      {
        key: "teamLogo",
        label: "Default Team Logo",
        usedOn: "Tournament → Teams grid, Team details, Player profile",
        controls: "Fallback logo when a team has no logo uploaded.",
      },
      {
        key: "teamCardBg",
        label: "Team Card Background",
        usedOn: "Public Tournament → Teams grid",
        controls: "Background image behind each team card.",
        background: true,
      },
      {
        key: "teamDetailsBg",
        label: "Team Details Background",
        usedOn: "Public Tournament → Team → Team details",
        controls: "The large background behind the team detail header.",
        background: true,
      },
      {
        key: "teamPlaceholder",
        label: "Team Placeholder",
        usedOn: "Anywhere a team image is missing",
        controls: "Generic placeholder for missing team imagery.",
      },
      {
        key: "teamBanner",
        label: "Team Banner",
        usedOn: "Team details → Banner strip",
        controls: "Wide banner image on the team detail page.",
        background: true,
      },
    ],
  },
  {
    title: "Player Appearance",
    description: "Player cards and the public player profile page.",
    items: [
      {
        key: "playerPhoto",
        label: "Default Player Photo",
        usedOn: "Players grid, Team squad, Player profile",
        controls: "Fallback photo when a player has no photo uploaded.",
      },
      {
        key: "playerProfileBg",
        label: "Player Profile Background",
        usedOn: "Public Tournament → Players → Player Profile",
        controls: "Page background behind the whole player profile.",
        background: true,
      },
      {
        key: "playerHeroBanner",
        label: "Player Profile Hero Background",
        usedOn: "Public Tournament → Players → Player Profile (top banner)",
        controls: "The large background image directly behind the player profile header.",
        background: true,
      },
      {
        key: "playerCardBg",
        label: "Player Card Background",
        usedOn: "Public Tournament → Players grid",
        controls: "Background image behind each player card.",
        background: true,
      },
      {
        key: "playerPlaceholder",
        label: "Player Placeholder",
        usedOn: "Anywhere a player image is missing",
        controls: "Generic placeholder for missing player imagery.",
      },
      {
        key: "playerEmpty",
        label: "Player Empty-State Image",
        usedOn: "Players grid → No players found",
        controls: "Illustration shown when the player list is empty.",
      },
    ],
  },
  {
    title: "Live Auction Appearance",
    description: "Admin live auction console and the public SOLD broadcast.",
    items: [
      {
        key: "auctionBg",
        label: "Auction Background",
        usedOn: "Admin → Live Auction",
        controls: "Page background of the live auction console.",
        background: true,
      },
      {
        key: "auctionHeroBanner",
        label: "Auction Hero Banner",
        usedOn: "Admin → Live Auction → Header",
        controls: "Banner image at the top of the live auction console.",
        background: true,
      },
      {
        key: "soldAnimationBg",
        label: "Sold Animation Background",
        usedOn: "Public Tournament → SOLD announcement overlay",
        controls: "Backdrop image behind the fullscreen SOLD celebration.",
        background: true,
      },
      {
        key: "trophy",
        label: "Auction Trophy",
        usedOn: "Tournament stats, Team details",
        controls: "Trophy artwork used in winner / stats highlights.",
      },
      {
        key: "hammer",
        label: "Auction Hammer",
        usedOn: "SOLD announcement overlay",
        controls: "Hammer artwork in the SOLD animation.",
      },
      {
        key: "auctionPlaceholder",
        label: "Auction Placeholder",
        usedOn: "Live Auction → No player on the block",
        controls: "Placeholder shown when no player is currently up.",
      },
      {
        key: "auctionLoading",
        label: "Auction Loading Image",
        usedOn: "Live Auction → Loading state",
        controls: "Image shown while auction data loads.",
      },
    ],
  },
  {
    title: "Page Backgrounds",
    description: "One configurable background per public page — no shared generic setting.",
    items: [
      {
        key: "teamsPageBg",
        label: "Teams Page Background",
        usedOn: "Public Tournament → Teams tab",
        controls: "Background behind the teams listing.",
        background: true,
      },
      {
        key: "playersPageBg",
        label: "Players Page Background",
        usedOn: "Public Tournament → Players tab",
        controls: "Background behind the players listing.",
        background: true,
      },
      {
        key: "statsBg",
        label: "Statistics Page Background",
        usedOn: "Public Tournament → Statistics",
        controls: "Background behind the statistics section.",
        background: true,
      },
      {
        key: "resultsBg",
        label: "Recent Results Background",
        usedOn: "Public Tournament → Recent results",
        controls: "Background behind the recent auction results feed.",
        background: true,
      },
      {
        key: "dashboardBg",
        label: "Dashboard Background",
        usedOn: "Admin → Dashboard",
        controls: "Background of the admin dashboard.",
        background: true,
      },
    ],
  },
  {
    title: "Default Placeholders",
    description: "Fallback artwork used when data or images are missing.",
    items: [
      {
        key: "emptyState",
        label: "No Player Data",
        usedOn: "Any list with no player records",
        controls: "Generic empty-state illustration.",
      },
      {
        key: "noResults",
        label: "No Results",
        usedOn: "Search / filters with no matches",
        controls: "Illustration shown when filters return nothing.",
      },
      {
        key: "noStats",
        label: "No Statistics",
        usedOn: "Statistics section with no data",
        controls: "Illustration shown when stats are unavailable.",
      },
      {
        key: "errorIllustration",
        label: "Error Illustration",
        usedOn: "Error / not-found screens",
        controls: "Artwork shown on error pages.",
      },
      {
        key: "loadingIllustration",
        label: "Loading Illustration",
        usedOn: "Full page loading states",
        controls: "Artwork shown while a page loads.",
      },
    ],
  },
];

export const ALL_ASSETS: AssetDef[] = ASSET_GROUPS.flatMap((g) => g.items);
export const assetDef = (key: AssetKey) => ALL_ASSETS.find((a) => a.key === key);

export const COLOR_FIELDS: { key: ColorKey; label: string; fallback: string; usedOn: string }[] = [
  { key: "primary", label: "Primary Color", fallback: "#16213c", usedOn: "Headers, primary buttons, brand surfaces" },
  { key: "secondary", label: "Secondary Color", fallback: "#f0f2f6", usedOn: "Secondary buttons and chips" },
  { key: "accent", label: "Accent Color", fallback: "#f0f2f6", usedOn: "Subtle highlighted surfaces" },
  { key: "background", label: "Background Color", fallback: "#f7f8fb", usedOn: "Page background everywhere" },
  { key: "card", label: "Card Color", fallback: "#ffffff", usedOn: "All cards and popovers" },
  { key: "text", label: "Text Color", fallback: "#16213c", usedOn: "Default body text" },
  { key: "mutedText", label: "Muted Text Color", fallback: "#64748b", usedOn: "Labels and helper text" },
  { key: "border", label: "Border Color", fallback: "#e2e8f0", usedOn: "Card borders and dividers" },
  { key: "button", label: "Button / Highlight Color", fallback: "#f59e0b", usedOn: "Active accent, CTAs, focus rings" },
  { key: "hover", label: "Hover Color", fallback: "#fde9c8", usedOn: "Hover states on cards and rows" },
  { key: "header", label: "Header Background", fallback: "#16213c", usedOn: "Site header bar" },
  { key: "footer", label: "Footer Background", fallback: "#16213c", usedOn: "Site footer bar" },
  { key: "statusSold", label: "Sold Color", fallback: "#f59e0b", usedOn: "SOLD badges" },
  { key: "statusAvailable", label: "Available Color", fallback: "#64748b", usedOn: "AVAILABLE badges" },
  { key: "statusUnsold", label: "Unsold Color", fallback: "#dc2626", usedOn: "UNSOLD badges" },
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
  background: ["--background"],
  card: ["--card", "--popover"],
  text: ["--foreground", "--card-foreground", "--popover-foreground"],
  mutedText: ["--muted-foreground"],
  border: ["--border", "--input"],
  button: ["--active", "--ring"],
  hover: ["--active-soft"],
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
  layout: BrandingLayout;
};

export const EMPTY_BRANDING: Branding = { assets: {}, colors: {}, typography: {}, layout: {} };

/* Module cache so non-React helpers can read the current defaults. */
let cache: Branding = EMPTY_BRANDING;
export const brandingCache = () => cache;

export const DEFAULT_FALLBACKS: Partial<Record<AssetKey, string>> = {
  tournamentPlaceholder: tournamentPlaceholder,
  tournamentLogo: tournamentPlaceholder,
};

export function brandAsset(key: AssetKey): string | undefined {
  return cache.assets?.[key] || DEFAULT_FALLBACKS[key];
}

export function brandLayout(key: AssetKey): Required<AssetLayout> {
  const l = cache.layout?.[key] ?? {};
  return { position: l.position ?? "center", fit: l.fit ?? "cover", overlay: l.overlay ?? 40 };
}

export function layoutOf(b: Branding, key: AssetKey): Required<AssetLayout> {
  const l = b.layout?.[key] ?? {};
  return { position: l.position ?? "center", fit: l.fit ?? "cover", overlay: l.overlay ?? 40 };
}

const BrandingContext = createContext<{
  branding: Branding;
  loading: boolean;
  refresh: () => Promise<void>;
}>({ branding: EMPTY_BRANDING, loading: true, refresh: async () => {} });

export function applyBranding(b: Branding) {
  cache = b;
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
}

function normalize(row: any): Branding {
  const { __layout, ...assets } = (row?.assets ?? {}) as Record<string, any>;
  return {
    assets: assets as BrandingAssets,
    colors: (row?.colors ?? {}) as BrandingColors,
    typography: (row?.typography ?? {}) as BrandingTypography,
    layout: (__layout ?? {}) as BrandingLayout,
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

/** Reactive asset lookup — re-renders when the admin saves/previews a change. */
export function useBrandAsset(key: AssetKey): string | undefined {
  const { branding } = useBranding();
  return branding.assets?.[key] || DEFAULT_FALLBACKS[key];
}

export function useBrandLayout(key: AssetKey): Required<AssetLayout> {
  const { branding } = useBranding();
  return layoutOf(branding, key);
}

export async function saveBranding(b: Branding) {
  // `layout` is persisted inside the existing `assets` JSON column so the
  // database schema stays untouched.
  const { layout, ...rest } = b;
  const { error } = await supabase.from("site_branding").upsert({
    id: 1,
    assets: { ...rest.assets, __layout: layout ?? {} },
    colors: rest.colors ?? {},
    typography: rest.typography ?? {},
    updated_at: new Date().toISOString(),
  } as any);
  if (error) throw new Error(error.message);
}
