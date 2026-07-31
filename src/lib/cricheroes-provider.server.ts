// Server-only CricHeroes provider. Replaceable: if official API access becomes
// available, only this file changes — the UI consumes CricheroesProfile.
import type { CricheroesProfile, CricheroesSearchHit } from "./cricheroes";
import { cricheroesProfileUrl } from "./cricheroes";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Attempts to read the embedded JSON payload CricHeroes ships in its player pages. */
function parseEmbeddedJson(html: string): Record<string, any> | null {
  const next = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (next?.[1]) {
    try {
      return JSON.parse(next[1]);
    } catch {
      /* ignore */
    }
  }
  const ld = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (ld?.[1]) {
    try {
      return JSON.parse(ld[1]);
    } catch {
      /* ignore */
    }
  }
  return null;
}

function deepFind(node: any, key: string, depth = 0): any {
  if (!node || depth > 8 || typeof node !== "object") return undefined;
  if (key in node) return node[key];
  for (const value of Object.values(node)) {
    const found = deepFind(value, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function mapProfile(playerId: string, raw: Record<string, any>): CricheroesProfile {
  const player = deepFind(raw, "playerDetail") ?? deepFind(raw, "player") ?? raw;
  const batting = deepFind(raw, "battingSummary") ?? deepFind(raw, "batting") ?? {};
  const bowling = deepFind(raw, "bowlingSummary") ?? deepFind(raw, "bowling") ?? {};
  const fielding = deepFind(raw, "fieldingSummary") ?? deepFind(raw, "fielding") ?? {};

  return {
    player_id: playerId,
    profile_url: cricheroesProfileUrl(playerId),
    name: player?.name ?? player?.full_name ?? null,
    photo_url: player?.profile_photo ?? player?.image ?? null,
    batting_style: player?.batting_style ?? player?.player_style ?? null,
    bowling_style: player?.bowling_style ?? null,
    role: player?.playing_role ?? player?.role ?? null,
    team: player?.team_name ?? null,
    city: player?.city_name ?? player?.city ?? null,
    state: player?.state_name ?? player?.state ?? null,
    rating: num(player?.rating ?? player?.player_rating),
    batting: {
      matches: num(batting?.matches ?? player?.total_matches),
      innings: num(batting?.innings),
      runs: num(batting?.runs),
      highest_score: batting?.highest ?? batting?.highest_score ?? null,
      average: num(batting?.average),
      strike_rate: num(batting?.strike_rate ?? batting?.strikerate),
      fifties: num(batting?.fifties),
      hundreds: num(batting?.hundreds),
      balls_faced: num(batting?.balls ?? batting?.balls_faced),
    },
    bowling: {
      wickets: num(bowling?.wickets),
      average: num(bowling?.average),
      economy: num(bowling?.economy),
      best_bowling: bowling?.best_bowling ?? bowling?.best ?? null,
      overs: num(bowling?.overs),
      maidens: num(bowling?.maidens),
    },
    fielding: {
      catches: num(fielding?.catches),
      run_outs: num(fielding?.run_outs ?? fielding?.runouts),
      stumpings: num(fielding?.stumpings),
    },
    recent_matches: null,
  };
}

export async function fetchCricheroesProfile(
  playerId: string,
): Promise<{ ok: true; profile: CricheroesProfile } | { ok: false; reason: string }> {
  try {
    const response = await fetch(cricheroesProfileUrl(playerId), {
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
    if (!response.ok) return { ok: false, reason: `CricHeroes responded ${response.status}` };
    const html = await response.text();
    const raw = parseEmbeddedJson(html);
    if (!raw) return { ok: false, reason: "CricHeroes profile data is not publicly readable" };
    return { ok: true, profile: mapProfile(playerId, raw) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Network error" };
  }
}

export async function searchCricheroesPlayers(query: string): Promise<CricheroesSearchHit[]> {
  try {
    const response = await fetch(
      `https://cricheroes.com/api/v1/search?q=${encodeURIComponent(query)}&type=player`,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
    );
    if (!response.ok) return [];
    const json: any = await response.json();
    const rows: any[] = json?.data?.players ?? json?.data ?? json?.players ?? [];
    return rows
      .map((row) => {
        const id = String(row?.player_id ?? row?.id ?? "");
        if (!id) return null;
        return {
          player_id: id,
          name: row?.name ?? row?.full_name ?? "Unknown",
          photo_url: row?.profile_photo ?? row?.image ?? null,
          city: row?.city_name ?? row?.city ?? null,
          profile_url: cricheroesProfileUrl(id),
        } satisfies CricheroesSearchHit;
      })
      .filter(Boolean) as CricheroesSearchHit[];
  } catch {
    return [];
  }
}

/**
 * Resolves a CricHeroes short share link (chshare.link/player/XXXX) to the
 * numeric player id by reading the redirect payload the share page embeds.
 */
export async function resolveCricheroesShareLink(shareUrl: string): Promise<string | null> {
  try {
    const response = await fetch(shareUrl, { headers: { "User-Agent": UA, Accept: "text/html" } });
    if (!response.ok) return null;
    const html = await response.text();
    const target =
      html.match(/player-profile\\?\/(\d+)/)?.[1] ??
      html.match(/player-profile\/(\d+)/)?.[1] ??
      null;
    return target;
  } catch {
    return null;
  }
}
