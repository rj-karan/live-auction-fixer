import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Tournament = {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  default_purse: number;
  display_order?: number | null;
  banner_url?: string | null;
  logo_url?: string | null;
  [key: string]: any;
};

const STORAGE_KEY = "admin-selected-tournament";

/* ---- tiny external store for the admin's selected tournament ---- */
let selected: string | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function snapshot() {
  if (!hydrated) {
    selected = readStored();
    hydrated = true;
  }
  return selected;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function setSelectedTournamentId(id: string | null) {
  selected = id;
  hydrated = true;
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useSelectedTournamentId() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

/** All tournaments, newest / admin-ordered first. Realtime-aware. */
export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    setTournaments((data ?? []) as Tournament[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("tournaments-list-" + Math.random())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { tournaments, loading, reload: load };
}

/**
 * The tournament the admin is currently working on.
 * Falls back to the first tournament when nothing is selected yet.
 */
export function useActiveTournament() {
  const { tournaments, loading } = useTournaments();
  const selectedId = useSelectedTournamentId();
  const tournament =
    tournaments.find((t) => t.id === selectedId) ?? tournaments[0] ?? null;
  return { tournament, tournaments, loading, selectId: setSelectedTournamentId };
}
