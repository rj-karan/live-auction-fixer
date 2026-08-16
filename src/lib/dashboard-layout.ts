import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Every widget that can appear on the public tournament overview. */
export type WidgetId =
  | "pulse"
  | "live"
  | "results"
  | "purse"
  | "sponsors"
  | "teams"
  | "stats"
  | "info";

/** Column footprint on the 6-column dashboard grid. */
export type WidgetSpan = 2 | 3 | 4 | 6;

export type WidgetLayoutItem = {
  id: WidgetId;
  span: WidgetSpan;
  hidden?: boolean;
};

export const WIDGET_LABELS: Record<WidgetId, string> = {
  pulse: "Tournament Pulse",
  live: "Live Auction",
  results: "Latest Results",
  purse: "Purse Overview",
  sponsors: "Sponsors",
  teams: "Teams",
  stats: "Statistics",
  info: "Tournament Info",
};

export const SPAN_LABELS: Record<WidgetSpan, string> = {
  2: "Small",
  3: "Medium",
  4: "Large",
  6: "Full width",
};

/** Professionally tuned default: live auction first and largest. */
export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { id: "pulse", span: 6 },
  { id: "live", span: 4 },
  { id: "sponsors", span: 2 },
  { id: "results", span: 3 },
  { id: "purse", span: 3 },
  { id: "teams", span: 6 },
  { id: "stats", span: 3 },
  { id: "info", span: 3 },
];

const ALL_IDS = DEFAULT_LAYOUT.map((w) => w.id);

/** Merge a stored layout with the registry so new widgets never disappear. */
export function normalizeLayout(raw: unknown): WidgetLayoutItem[] {
  const list = Array.isArray(raw) ? (raw as WidgetLayoutItem[]) : [];
  const seen = new Set<WidgetId>();
  const out: WidgetLayoutItem[] = [];
  for (const item of list) {
    if (!item || !ALL_IDS.includes(item.id as WidgetId) || seen.has(item.id)) continue;
    seen.add(item.id);
    const span = ([2, 3, 4, 6] as WidgetSpan[]).includes(item.span as WidgetSpan)
      ? (item.span as WidgetSpan)
      : 3;
    out.push({ id: item.id, span, hidden: !!item.hidden });
  }
  for (const d of DEFAULT_LAYOUT) if (!seen.has(d.id)) out.push({ ...d });
  return out;
}

/**
 * Per-tournament dashboard layout. Read-only for the public, editable by admins.
 * Purely a presentation concern — no auction data is touched here.
 */
export function useDashboardLayout(tournamentId: string) {
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(DEFAULT_LAYOUT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("dashboard_layouts")
        .select("layout")
        .eq("tournament_id", tournamentId)
        .maybeSingle();
      if (cancelled) return;
      setLayout(data?.layout ? normalizeLayout(data.layout) : DEFAULT_LAYOUT);
      setLoaded(true);
    };
    setLoaded(false);
    load();
    const ch = supabase
      .channel(`dash-layout-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dashboard_layouts",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [tournamentId]);

  const save = useCallback(
    async (next: WidgetLayoutItem[]) => {
      const { error } = await supabase
        .from("dashboard_layouts")
        .upsert(
          { tournament_id: tournamentId, layout: next as any },
          { onConflict: "tournament_id" },
        );
      if (!error) setLayout(next);
      return error;
    },
    [tournamentId],
  );

  const reset = useCallback(async () => {
    const { error } = await supabase
      .from("dashboard_layouts")
      .upsert(
        { tournament_id: tournamentId, layout: DEFAULT_LAYOUT as any },
        { onConflict: "tournament_id" },
      );
    if (!error) setLayout(DEFAULT_LAYOUT);
    return error;
  }, [tournamentId]);

  return { layout, setLayout, save, reset, loaded };
}
