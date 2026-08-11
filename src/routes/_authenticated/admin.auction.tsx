import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useActiveTournament } from "@/hooks/use-active-tournament";
import { formatMoney } from "@/lib/format";
import { Undo2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/auction")({
  component: AuctionPage,
});

function AuctionPage() {
  const { tournament } = useActiveTournament();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!tournament) return;
    const [p, t, e] = await Promise.all([
      supabase.from("players").select("*").eq("tournament_id", tournament.id).order("name"),
      supabase.from("teams").select("*").eq("tournament_id", tournament.id).order("name"),
      supabase
        .from("auction_events")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);
    setPlayers(p.data ?? []);
    setTeams(t.data ?? []);
    setEvents(e.data ?? []);
  };
  useEffect(() => {
    load();
    if (!tournament) return;
    const ch = supabase
      .channel(`auction-${tournament.id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournament?.id]);

  // Publish the live auction board for public spectators (display only).
  const publishLive = async (patch: Record<string, any>) => {
    if (!tournament) return;
    await supabase
      .from("live_auction")
      .upsert(
        { tournament_id: tournament.id, updated_at: new Date().toISOString(), ...patch },
        { onConflict: "tournament_id" },
      );
  };

  useEffect(() => {
    if (!tournament) return;
    if (!selectedPlayer) {
      publishLive({ player_id: null, team_id: null, current_bid: null, status: "idle", round: null });
      return;
    }
    const p = players.find((x) => x.id === selectedPlayer);
    const t = setTimeout(() => {
      publishLive({
        player_id: selectedPlayer,
        team_id: selectedTeam,
        current_bid: price ? Number(price) : null,
        status: "live",
        round: p?.auction_round ?? 1,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [tournament?.id, selectedPlayer, selectedTeam, price]);

  if (!tournament)
    return <p className="text-muted-foreground">Create a tournament first.</p>;

  const c = tournament.currency;
  const available = players.filter((p) => p.status === "available");
  const filtered = available.filter((p) =>
    q ? p.name.toLowerCase().includes(q.toLowerCase()) : true,
  );
  const current = players.find((p) => p.id === selectedPlayer);

  const clearLiveSoon = () => {
    setTimeout(() => {
      publishLive({ player_id: null, team_id: null, current_bid: null, status: "idle", round: null });
    }, 7000);
  };

  const confirmSale = async () => {
    if (!selectedPlayer || !selectedTeam || !price) {
      toast.error("Select player, team, and enter price");
      return;
    }
    setBusy(true);
    const soldPlayer = selectedPlayer;
    const soldTeam = selectedTeam;
    const soldPrice = Number(price);
    const { error } = await supabase.rpc("confirm_player_sale", {
      p_player_id: selectedPlayer,
      p_team_id: selectedTeam,
      p_price: Number(price),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Sale confirmed");
    await publishLive({
      player_id: soldPlayer,
      team_id: soldTeam,
      current_bid: soldPrice,
      status: "sold",
      round: current?.auction_round ?? 1,
    });
    clearLiveSoon();
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setPrice("");
  };

  const markUnsold = async () => {
    if (!selectedPlayer) return;
    setBusy(true);
    const unsoldPlayer = selectedPlayer;
    const { error } = await supabase.rpc("mark_player_unsold", {
      p_player_id: selectedPlayer,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Marked unsold");
    await publishLive({
      player_id: unsoldPlayer,
      team_id: null,
      current_bid: null,
      status: "unsold",
      round: current?.auction_round ?? 1,
    });
    clearLiveSoon();
    setSelectedPlayer(null);
  };


  const undo = async () => {
    if (!confirm("Undo the last transaction?")) return;
    setBusy(true);
    const { error } = await supabase.rpc("undo_last_event", {
      p_tournament_id: tournament.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Undone");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr_320px]">
      {/* LEFT: available players */}
      <Card className="max-h-[calc(100vh-140px)] overflow-hidden flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Available Players ({available.length})</CardTitle>
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </CardHeader>
        <CardContent className="overflow-auto space-y-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlayer(p.id)}
              className={`w-full text-left rounded px-2 py-1.5 text-sm hover:bg-accent ${
                selectedPlayer === p.id ? "bg-accent" : ""
              }`}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">
                {p.role || "—"}
                {p.base_price ? ` · base ${formatMoney(Number(p.base_price), c)}` : ""}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground">No players.</p>
          )}
        </CardContent>
      </Card>

      {/* CENTER: entry */}
      <Card>
        <CardHeader>
          <CardTitle>Record Auction Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {current ? (
            <div className="rounded border p-4 space-y-2">
              <div className="text-xs text-muted-foreground uppercase">Current Player</div>
              <div className="text-2xl font-bold">{current.name}</div>
              <div className="text-sm text-muted-foreground">
                {current.role || "—"}
                {current.base_price ? ` · Base ${formatMoney(Number(current.base_price), c)}` : ""}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Select a player on the left.</p>
          )}

          <div>
            <Label>Winning Team</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {teams.map((t) => (
                <button
                  key={t.id}
                  disabled={!current}
                  onClick={() => setSelectedTeam(t.id)}
                  className={`text-left rounded border p-2 text-sm disabled:opacity-40 ${
                    selectedTeam === t.id
                      ? "border-primary bg-primary/10"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Purse {formatMoney(Number(t.remaining_purse), c)} · Squad{" "}
                    {t.players_purchased_count + 1}
                  </div>
                </button>
              ))}
              {teams.length === 0 && (
                <p className="text-sm text-muted-foreground">No teams yet.</p>
              )}
            </div>
          </div>

          <div>
            <Label>Final Purchase Price</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={!current}
              className="text-lg"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              onClick={confirmSale}
              disabled={busy || !current || !selectedTeam || !price}
            >
              Confirm Sale
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={markUnsold}
              disabled={busy || !current}
            >
              Mark Unsold
            </Button>
            <Button size="lg" variant="outline" onClick={undo} disabled={busy}>
              <Undo2 className="mr-2 h-4 w-4" /> Undo Last
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RIGHT: teams + recent */}
      <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Teams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {teams.map((t) => (
              <div key={t.id} className="flex justify-between border-b pb-1">
                <div>
                  <div className="font-medium">{t.short_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.players_purchased_count + 1} players
                  </div>
                </div>
                <div className="text-right">
                  <div>{formatMoney(Number(t.remaining_purse), c)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {events.map((e) => (
              <div key={e.id} className="flex justify-between border-b pb-1">
                <span>
                  <Badge variant="outline" className="mr-1">
                    {e.event_type.replace("_", " ")}
                  </Badge>
                  {e.player_name_snapshot}
                </span>
                <span>{e.price ? formatMoney(Number(e.price), c) : ""}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
