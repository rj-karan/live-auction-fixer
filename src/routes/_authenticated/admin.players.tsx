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
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/players")({
  component: PlayersPage,
});

function PlayersPage() {
  const { tournament } = useActiveTournament();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    photo_url: "",
    player_number: "",
    role: "",
    base_price: "",
    age: "",
    details: "",
  });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "sold" | "unsold">(
    "all",
  );

  const load = async () => {
    if (!tournament) return;
    const [p, t] = await Promise.all([
      supabase
        .from("players")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("created_at"),
      supabase.from("teams").select("id,name,short_name").eq("tournament_id", tournament.id),
    ]);
    setPlayers(p.data ?? []);
    setTeams(t.data ?? []);
  };
  useEffect(() => {
    load();
    if (!tournament) return;
    const ch = supabase
      .channel(`padmin-${tournament.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournament?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament) return;
    const { error } = await supabase.from("players").insert({
      tournament_id: tournament.id,
      name: form.name,
      photo_url: form.photo_url || null,
      player_number: form.player_number || null,
      role: form.role || null,
      base_price: form.base_price ? Number(form.base_price) : null,
      age: form.age ? Number(form.age) : null,
      details: form.details || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Player added");
    setForm({
      name: "",
      photo_url: "",
      player_number: "",
      role: "",
      base_price: "",
      age: "",
      details: "",
    });
  };

  const del = async (id: string) => {
    if (!confirm("Delete player?")) return;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  if (!tournament)
    return <p className="text-muted-foreground">Create a tournament first.</p>;

  const teamName = (id: string | null) =>
    teams.find((t) => t.id === id)?.name ?? "";
  const c = tournament.currency;

  const filtered = players.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Add Player</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Batter, Bowler…"
                />
              </div>
              <div>
                <Label>Number</Label>
                <Input
                  value={form.player_number}
                  onChange={(e) =>
                    setForm({ ...form, player_number: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Base Price</Label>
                <Input
                  type="number"
                  value={form.base_price}
                  onChange={(e) =>
                    setForm({ ...form, base_price: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Age</Label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Photo URL</Label>
              <Input
                value={form.photo_url}
                onChange={(e) =>
                  setForm({ ...form, photo_url: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Details</Label>
              <Input
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
              />
            </div>
            <Button type="submit">Add Player</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          {(["all", "available", "sold", "unsold"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.role || "—"} {p.age ? `· ${p.age}y` : ""}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      p.status === "sold"
                        ? "default"
                        : p.status === "unsold"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {p.status}
                  </Badge>
                  {p.status === "sold" && (
                    <span className="text-xs text-muted-foreground">
                      {teamName(p.team_id)} · {formatMoney(Number(p.final_price), c)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
