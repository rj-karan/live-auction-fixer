import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { useActiveTournament } from "@/hooks/use-active-tournament";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: TxPage,
});

function TxPage() {
  const { tournament } = useActiveTournament();
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    if (!tournament) return;
    const load = async () => {
      const { data } = await supabase
        .from("auction_events")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("created_at", { ascending: false });
      setEvents(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`tx-${tournament.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_events" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournament?.id]);

  if (!tournament) return <p className="text-muted-foreground">No tournament.</p>;
  const c = tournament.currency;

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        )}
        <ul className="divide-y">
          {events.map((e) => (
            <li key={e.id} className="py-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    e.is_undone
                      ? "outline"
                      : e.event_type === "sale"
                      ? "default"
                      : "secondary"
                  }
                >
                  {e.event_type.replace("_", " ")}
                </Badge>
                <span className="font-medium">{e.player_name_snapshot}</span>
                {e.team_name_snapshot && (
                  <span className="text-muted-foreground">
                    → {e.team_name_snapshot}
                  </span>
                )}
                {e.is_undone && (
                  <Badge variant="outline">undone</Badge>
                )}
              </div>
              <div className="text-muted-foreground">
                {e.price ? formatMoney(Number(e.price), c) : "—"} ·{" "}
                {new Date(e.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
