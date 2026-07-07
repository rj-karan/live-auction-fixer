import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Trophy } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import { useActiveTournament } from "@/hooks/use-active-tournament";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { tournament } = useActiveTournament();
  const [stats, setStats] = useState({
    teams: 0,
    players: 0,
    sold: 0,
    unsold: 0,
    available: 0,
    spent: 0,
    remaining: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!tournament) return;
    const load = async () => {
      const [teamsR, playersR, eventsR] = await Promise.all([
        supabase.from("teams").select("*").eq("tournament_id", tournament.id),
        supabase.from("players").select("*").eq("tournament_id", tournament.id),
        supabase
          .from("auction_events")
          .select("*")
          .eq("tournament_id", tournament.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      const teams = teamsR.data ?? [];
      const players = playersR.data ?? [];
      setStats({
        teams: teams.length,
        players: players.length,
        sold: players.filter((p) => p.status === "sold").length,
        unsold: players.filter((p) => p.status === "unsold").length,
        available: players.filter((p) => p.status === "available").length,
        spent: teams.reduce((s, t) => s + Number(t.total_spent), 0),
        remaining: teams.reduce((s, t) => s + Number(t.remaining_purse), 0),
      });
      setRecent(eventsR.data ?? []);
    };
    load();
    const ch = supabase
      .channel(`dash-${tournament.id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournament?.id]);

  if (!tournament) {
    return (
      <div className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Create your first tournament to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/admin/tournaments">
              <Button>
                <Trophy className="mr-2 h-4 w-4" /> Create Tournament
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tournament/${tournament.slug}`
      : "";
  const c = tournament.currency || "₹";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tournament.name}</CardTitle>
          <CardDescription>
            Status: <span className="capitalize">{tournament.status}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 text-sm break-all">
              {publicUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success("Link copied");
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" /> Open Public Page
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Stat label="Total Teams" value={stats.teams} />
        <Stat label="Total Players" value={stats.players} />
        <Stat label="Sold" value={stats.sold} />
        <Stat label="Unsold" value={stats.unsold} />
        <Stat label="Available" value={stats.available} />
        <Stat label="Money Spent" value={formatMoney(stats.spent, c)} />
        <Stat label="Total Remaining Purse" value={formatMoney(stats.remaining, c)} />
        <Stat label="Default Team Purse" value={formatMoney(Number(tournament.default_purse), c)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((e) => (
                <li key={e.id} className="flex justify-between border-b pb-1">
                  <span>
                    <span className="font-medium">{e.player_name_snapshot}</span>{" "}
                    →{" "}
                    <span className="capitalize">
                      {e.event_type.replace("_", " ")}
                    </span>
                    {e.team_name_snapshot ? ` · ${e.team_name_snapshot}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {e.price ? formatMoney(Number(e.price), c) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
