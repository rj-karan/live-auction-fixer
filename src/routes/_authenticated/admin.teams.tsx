import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { slugify, formatMoney } from "@/lib/format";
import { useActiveTournament } from "@/hooks/use-active-tournament";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/teams")({
  component: TeamsPage,
});

function TeamsPage() {
  const { tournament } = useActiveTournament();
  const [teams, setTeams] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    short_name: "",
    logo_url: "",
    captain_name: "",
    captain_photo_url: "",
    captain_contact: "",
    owner_name: "",
    theme_color: "#1d4ed8",
    max_players: 15,
    initial_purse: 0,
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!tournament) return;
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("created_at");
    setTeams(data ?? []);
  };
  useEffect(() => {
    if (tournament) {
      setForm((f) => ({
        ...f,
        initial_purse: Number(tournament.default_purse),
      }));
      load();
    }
  }, [tournament?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament) return;
    setBusy(true);
    const slug = slugify(form.name) || `team-${Date.now().toString(36)}`;
    const { error } = await supabase.from("teams").insert({
      tournament_id: tournament.id,
      name: form.name,
      short_name: form.short_name,
      slug,
      logo_url: form.logo_url || null,
      captain_name: form.captain_name,
      captain_photo_url: form.captain_photo_url || null,
      captain_contact: form.captain_contact || null,
      owner_name: form.owner_name || null,
      theme_color: form.theme_color || null,
      max_players: Number(form.max_players) || 15,
      initial_purse: Number(form.initial_purse),
      remaining_purse: Number(form.initial_purse),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Team created");
    setForm({
      ...form,
      name: "",
      short_name: "",
      captain_name: "",
      captain_photo_url: "",
      captain_contact: "",
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete team?")) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  if (!tournament)
    return (
      <p className="text-muted-foreground">
        Create a tournament first.
      </p>
    );

  const c = tournament.currency;
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Add Team</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Team Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Short Name *</Label>
              <Input
                value={form.short_name}
                onChange={(e) =>
                  setForm({ ...form, short_name: e.target.value })
                }
                required
              />
            </div>
            <ImageUpload
              label="Team Logo"
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              folder="teams"
            />
            <div className="border-t pt-3 space-y-3">
              <p className="text-sm font-medium">Captain</p>
              <div>
                <Label>Captain Name *</Label>
                <Input
                  value={form.captain_name}
                  onChange={(e) =>
                    setForm({ ...form, captain_name: e.target.value })
                  }
                  required
                />
              </div>
              <ImageUpload
                label="Captain Photo"
                value={form.captain_photo_url}
                onChange={(url) => setForm({ ...form, captain_photo_url: url })}
                folder="captains"
              />

              <div>
                <Label>Captain Contact (admin only)</Label>
                <Input
                  value={form.captain_contact}
                  onChange={(e) =>
                    setForm({ ...form, captain_contact: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Team Owner</Label>
                <Input
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Team Colour</Label>
                <Input
                  type="color"
                  value={form.theme_color || "#1d4ed8"}
                  onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                />
              </div>
              <div>
                <Label>Max Players</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_players}
                  onChange={(e) => setForm({ ...form, max_players: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Initial Purse</Label>
                <Input
                  type="number"
                  value={form.initial_purse}
                  onChange={(e) =>
                    setForm({ ...form, initial_purse: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <Button disabled={busy} type="submit">
              {busy ? "Adding…" : "Add Team"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{t.short_name}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => del(t.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Captain:</span>{" "}
                {t.captain_name}
              </div>
              <div>
                <span className="text-muted-foreground">Purse:</span>{" "}
                {formatMoney(Number(t.remaining_purse), c)} /{" "}
                {formatMoney(Number(t.initial_purse), c)}
              </div>
              <div>
                <span className="text-muted-foreground">Spent:</span>{" "}
                {formatMoney(Number(t.total_spent), c)}
              </div>
              <div>
                <span className="text-muted-foreground">Players:</span>{" "}
                {t.players_purchased_count}
              </div>
            </CardContent>
          </Card>
        ))}
        {teams.length === 0 && (
          <p className="text-muted-foreground text-sm">No teams yet.</p>
        )}
      </div>
    </div>
  );
}
