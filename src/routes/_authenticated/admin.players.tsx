import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useActiveTournament } from "@/hooks/use-active-tournament";
import { formatMoney } from "@/lib/format";
import { Pencil, Trash2, UserCircle } from "lucide-react";
import { extractCricheroesId, extractCricheroesUrl } from "@/lib/cricheroes";
import { ImageUpload } from "@/components/image-upload";
import { ConfirmDelete } from "@/components/confirm-delete";

export const Route = createFileRoute("/_authenticated/admin/players")({
  component: PlayersPage,
});

type Form = {
  name: string;
  photo_url: string;
  player_number: string;
  role: string;
  batting_style: string;
  bowling_style: string;
  base_price: string;
  age: string;
  city: string;
  state: string;
  details: string;
  notes: string;
  cricheroes: string;
  auction_round: string;
};

const emptyForm: Form = {
  name: "",
  photo_url: "",
  player_number: "",
  role: "",
  batting_style: "",
  bowling_style: "",
  base_price: "",
  age: "",
  city: "",
  state: "",
  details: "",
  notes: "",
  cricheroes: "",
  auction_round: "1",
};

function PlayerFields({
  form,
  setForm,
}: {
  form: Form;
  setForm: (f: Form) => void;
}) {
  return (
    <div className="space-y-3">
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
          <Label>Jersey Number</Label>
          <Input
            value={form.player_number}
            onChange={(e) =>
              setForm({ ...form, player_number: e.target.value })
            }
          />
        </div>
        <div>
          <Label>Batting Style</Label>
          <Input
            value={form.batting_style}
            onChange={(e) =>
              setForm({ ...form, batting_style: e.target.value })
            }
            placeholder="Right Handed Bat"
          />
        </div>
        <div>
          <Label>Bowling Style</Label>
          <Input
            value={form.bowling_style}
            onChange={(e) =>
              setForm({ ...form, bowling_style: e.target.value })
            }
            placeholder="Right Arm Medium"
          />
        </div>
        <div>
          <Label>Base Price</Label>
          <Input
            type="number"
            value={form.base_price}
            onChange={(e) => setForm({ ...form, base_price: e.target.value })}
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
        <div>
          <Label>City</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div>
          <Label>State</Label>
          <Input
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
          />
        </div>
      </div>
      <ImageUpload
        label="Player Photo"
        value={form.photo_url}
        onChange={(url) => setForm({ ...form, photo_url: url })}
        folder="players"
      />
      <div>
        <Label>CricHeroes ID, Profile URL or Share Link</Label>
        <Input
          value={form.cricheroes}
          onChange={(e) => setForm({ ...form, cricheroes: e.target.value })}
          placeholder="https://chshare.link/player/XXXXXX or cricheroes.com/player-profile/1234567/name"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Paste the whole share message if you like — the link is picked out
          automatically and shown on the public player page.
        </p>
      </div>
      <div>
        <Label>Auction Round</Label>
        <Input
          type="number"
          min={1}
          value={form.auction_round}
          onChange={(e) => setForm({ ...form, auction_round: e.target.value })}
        />
      </div>
      <div>
        <Label>Details</Label>
        <Input
          value={form.details}
          onChange={(e) => setForm({ ...form, details: e.target.value })}
        />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

function PlayersPage() {
  const { tournament } = useActiveTournament();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Form>(emptyForm);
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
      supabase
        .from("teams")
        .select("id,name,short_name")
        .eq("tournament_id", tournament.id),
    ]);
    setPlayers(p.data ?? []);
    setTeams(t.data ?? []);
  };
  useEffect(() => {
    load();
    if (!tournament) return;
    const ch = supabase
      .channel(`padmin-${tournament.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournament?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament) return;
    setBusy(true);
    const { error } = await supabase.from("players").insert({
      tournament_id: tournament.id,
      name: form.name,
      photo_url: form.photo_url || null,
      player_number: form.player_number || null,
      role: form.role || null,
      batting_style: form.batting_style || null,
      bowling_style: form.bowling_style || null,
      city: form.city || null,
      state: form.state || null,
      notes: form.notes || null,
      base_price: form.base_price ? Number(form.base_price) : null,
      age: form.age ? Number(form.age) : null,
      details: form.details || null,
      auction_round: Number(form.auction_round) || 1,
      cricheroes_player_id: extractCricheroesId(form.cricheroes),
      cricheroes_url: extractCricheroesUrl(form.cricheroes),
    } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("✅ Player added successfully");
    setForm({ ...emptyForm, auction_round: form.auction_round });
    load();
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setEditForm({
      name: p.name ?? "",
      photo_url: p.photo_url ?? "",
      player_number: p.player_number ?? "",
      role: p.role ?? "",
      batting_style: p.batting_style ?? "",
      bowling_style: p.bowling_style ?? "",
      base_price: p.base_price != null ? String(p.base_price) : "",
      age: p.age != null ? String(p.age) : "",
      city: p.city ?? "",
      state: p.state ?? "",
      details: p.details ?? "",
      notes: p.notes ?? "",
      cricheroes: p.cricheroes_url ?? p.cricheroes_player_id ?? "",
      auction_round: String(p.auction_round ?? 1),
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase
      .from("players")
      .update({
        name: editForm.name,
        photo_url: editForm.photo_url || null,
        player_number: editForm.player_number || null,
        role: editForm.role || null,
        batting_style: editForm.batting_style || null,
        bowling_style: editForm.bowling_style || null,
        city: editForm.city || null,
        state: editForm.state || null,
        notes: editForm.notes || null,
        base_price: editForm.base_price ? Number(editForm.base_price) : null,
        age: editForm.age ? Number(editForm.age) : null,
        details: editForm.details || null,
        auction_round: Number(editForm.auction_round) || 1,
        cricheroes_player_id: extractCricheroesId(editForm.cricheroes),
        cricheroes_url: extractCricheroesUrl(editForm.cricheroes),
      } as never)
      .eq("id", editing.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("✅ Player updated successfully");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Player deleted");
      setEditing(null);
      load();
    }
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
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" /> Add Player
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <PlayerFields form={form} setForm={setForm} />
            <Button type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add Player"}
            </Button>
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
            <Card
              key={p.id}
              className="rounded-xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardContent className="space-y-1 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {p.photo_url && (
                      <img
                        src={p.photo_url}
                        alt={p.name}
                        loading="lazy"
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.role || "—"} {p.age ? `· ${p.age}y` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDelete
                      title="Delete player?"
                      onConfirm={() => del(p.id)}
                    >
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </ConfirmDelete>
                  </div>
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
                      {teamName(p.team_id)} ·{" "}
                      {formatMoney(Number(p.final_price), c)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <PlayerFields form={editForm} setForm={setEditForm} />
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <ConfirmDelete
                title="Delete player?"
                onConfirm={() => editing && del(editing.id)}
              >
                <Button type="button" variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Player
                </Button>
              </ConfirmDelete>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
