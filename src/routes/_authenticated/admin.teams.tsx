import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { slugify, formatMoney } from "@/lib/format";
import { useActiveTournament } from "@/hooks/use-active-tournament";
import { Pencil, Trash2, Users } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { ConfirmDelete } from "@/components/confirm-delete";

export const Route = createFileRoute("/_authenticated/admin/teams")({
  component: TeamsPage,
});

type Form = {
  name: string;
  short_name: string;
  logo_url: string;
  captain_name: string;
  captain_photo_url: string;
  captain_contact: string;
  owner_name: string;
  theme_color: string;
  max_players: number;
  initial_purse: number;
  description: string;
};

const emptyForm: Form = {
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
  description: "",
};

function TeamFields({
  form,
  setForm,
}: {
  form: Form;
  setForm: (f: Form) => void;
}) {
  return (
    <div className="space-y-3">
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
          onChange={(e) => setForm({ ...form, short_name: e.target.value })}
          required
        />
      </div>
      <ImageUpload
        label="Team Logo"
        value={form.logo_url}
        onChange={(url) => setForm({ ...form, logo_url: url })}
        folder="teams"
      />
      <div className="space-y-3 border-t pt-3">
        <p className="text-sm font-medium">Captain</p>
        <div>
          <Label>Captain Name *</Label>
          <Input
            value={form.captain_name}
            onChange={(e) => setForm({ ...form, captain_name: e.target.value })}
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
            onChange={(e) =>
              setForm({ ...form, max_players: Number(e.target.value) })
            }
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
      <div>
        <Label>Team Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
    </div>
  );
}

function TeamsPage() {
  const { tournament } = useActiveTournament();
  const [teams, setTeams] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Form>(emptyForm);

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
      description: form.description || null,
      max_players: Number(form.max_players) || 15,
      initial_purse: Number(form.initial_purse),
      remaining_purse: Number(form.initial_purse),
    } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("✅ Team created successfully");
    setForm({
      ...form,
      name: "",
      short_name: "",
      captain_name: "",
      captain_photo_url: "",
      captain_contact: "",
      logo_url: "",
      description: "",
    });
    load();
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setEditForm({
      name: t.name ?? "",
      short_name: t.short_name ?? "",
      logo_url: t.logo_url ?? "",
      captain_name: t.captain_name ?? "",
      captain_photo_url: t.captain_photo_url ?? "",
      captain_contact: t.captain_contact ?? "",
      owner_name: t.owner_name ?? "",
      theme_color: t.theme_color ?? "#1d4ed8",
      max_players: Number(t.max_players ?? 15),
      initial_purse: Number(t.initial_purse ?? 0),
      description: t.description ?? "",
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    // Keep spent money intact: remaining purse follows the new initial purse.
    const spent = Number(editing.total_spent ?? 0);
    const { error } = await supabase
      .from("teams")
      .update({
        name: editForm.name,
        short_name: editForm.short_name,
        logo_url: editForm.logo_url || null,
        captain_name: editForm.captain_name,
        captain_photo_url: editForm.captain_photo_url || null,
        captain_contact: editForm.captain_contact || null,
        owner_name: editForm.owner_name || null,
        theme_color: editForm.theme_color || null,
        description: editForm.description || null,
        max_players: Number(editForm.max_players) || 15,
        initial_purse: Number(editForm.initial_purse),
        remaining_purse: Number(editForm.initial_purse) - spent,
      } as never)
      .eq("id", editing.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("✅ Team updated successfully");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Team deleted");
      setEditing(null);
      load();
    }
  };

  if (!tournament)
    return <p className="text-muted-foreground">Create a tournament first.</p>;

  const c = tournament.currency;
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Add Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <TeamFields form={form} setForm={setForm} />
            <Button disabled={busy} type="submit">
              {busy ? "Adding…" : "Add Team"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((t) => (
          <Card
            key={t.id}
            className="rounded-xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-3">
                {t.logo_url && (
                  <img
                    src={t.logo_url}
                    alt={t.name}
                    loading="lazy"
                    className="h-10 w-10 rounded-md object-cover"
                  />
                )}
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t.short_name}</p>
                </div>
              </div>
              <div className="flex">
                <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDelete
                  title="Delete team?"
                  onConfirm={() => del(t.id)}
                >
                  <Button size="icon" variant="ghost">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </ConfirmDelete>
              </div>
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
          <p className="text-sm text-muted-foreground">No teams yet.</p>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <TeamFields form={editForm} setForm={setEditForm} />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
