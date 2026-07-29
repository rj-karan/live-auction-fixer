import { createServerFn } from "@tanstack/react-start";
import type { CricheroesResult, CricheroesSearchHit } from "./cricheroes";

const REFRESH_MS = 1000 * 60 * 60 * 24; // 24h

export const getCricheroesProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { playerRowId: string; force?: boolean }) => input)
  .handler(async ({ data }): Promise<CricheroesResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("players")
      .select("id, cricheroes_player_id, cricheroes_data, cricheroes_fetched_at")
      .eq("id", data.playerRowId)
      .maybeSingle();

    if (!row?.cricheroes_player_id) {
      return { available: false, reason: "No CricHeroes profile linked to this player." };
    }

    const fetchedAt = row.cricheroes_fetched_at ? new Date(row.cricheroes_fetched_at).getTime() : 0;
    const fresh = Date.now() - fetchedAt < REFRESH_MS;
    if (!data.force && fresh && row.cricheroes_data) {
      return {
        available: true,
        profile: row.cricheroes_data as CricheroesResult extends { profile: infer P } ? P : never,
        fetched_at: row.cricheroes_fetched_at as string,
        source: "cache",
      };
    }

    const { fetchCricheroesProfile } = await import("./cricheroes-provider.server");
    const result = await fetchCricheroesProfile(row.cricheroes_player_id);

    if (!result.ok) {
      if (row.cricheroes_data) {
        return {
          available: true,
          profile: row.cricheroes_data as never,
          fetched_at: (row.cricheroes_fetched_at as string) ?? new Date().toISOString(),
          source: "cache",
        };
      }
      return { available: false, reason: result.reason };
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("players")
      .update({ cricheroes_data: result.profile as never, cricheroes_fetched_at: now })
      .eq("id", row.id);

    return { available: true, profile: result.profile, fetched_at: now, source: "live" };
  });

export const searchCricheroes = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data }): Promise<{ hits: CricheroesSearchHit[] }> => {
    const query = (data.query ?? "").trim();
    if (query.length < 3) return { hits: [] };
    const { searchCricheroesPlayers } = await import("./cricheroes-provider.server");
    return { hits: await searchCricheroesPlayers(query) };
  });
