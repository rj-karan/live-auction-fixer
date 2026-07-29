// Client-safe CricHeroes helpers + types.
// The network/provider layer lives in cricheroes.functions.ts so it can be
// swapped for an official API without touching any UI code.

export type CricheroesBatting = {
  matches?: number | null;
  innings?: number | null;
  runs?: number | null;
  highest_score?: number | string | null;
  average?: number | null;
  strike_rate?: number | null;
  fifties?: number | null;
  hundreds?: number | null;
  balls_faced?: number | null;
};

export type CricheroesBowling = {
  wickets?: number | null;
  average?: number | null;
  economy?: number | null;
  best_bowling?: string | null;
  overs?: number | null;
  maidens?: number | null;
};

export type CricheroesFielding = {
  catches?: number | null;
  run_outs?: number | null;
  stumpings?: number | null;
};

export type CricheroesMatch = {
  label?: string | null;
  date?: string | null;
  runs?: number | null;
  wickets?: number | null;
  result?: string | null;
};

export type CricheroesProfile = {
  player_id: string;
  profile_url?: string | null;
  name?: string | null;
  photo_url?: string | null;
  batting_style?: string | null;
  bowling_style?: string | null;
  role?: string | null;
  team?: string | null;
  city?: string | null;
  state?: string | null;
  rating?: number | null;
  batting?: CricheroesBatting | null;
  bowling?: CricheroesBowling | null;
  fielding?: CricheroesFielding | null;
  recent_matches?: CricheroesMatch[] | null;
};

export type CricheroesResult =
  | { available: true; profile: CricheroesProfile; fetched_at: string; source: "cache" | "live" }
  | { available: false; reason: string };

export type CricheroesSearchHit = {
  player_id: string;
  name: string;
  photo_url?: string | null;
  city?: string | null;
  profile_url: string;
};

/** Accepts a raw ID or any CricHeroes profile URL and returns the numeric player id. */
export function extractCricheroesId(input: string): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return value;
  const match = value.match(/cricheroes\.(?:in|com)\/player-profile\/(\d+)|cricheroes\.(?:in|com)\/player\/(\d+)/i);
  if (match) return match[1] ?? match[2] ?? null;
  const anyDigits = value.match(/\/(\d{4,})(?:[/?#]|$)/);
  return anyDigits ? anyDigits[1] : null;
}

export function cricheroesProfileUrl(playerId: string) {
  return `https://cricheroes.com/player-profile/${playerId}`;
}

/** Session-scoped cache so the same player is not refetched while browsing. */
const sessionCache = new Map<string, CricheroesResult>();
export const cricheroesSessionCache = {
  get: (id: string) => sessionCache.get(id),
  set: (id: string, value: CricheroesResult) => sessionCache.set(id, value),
  clear: (id?: string) => (id ? sessionCache.delete(id) : sessionCache.clear()),
};
