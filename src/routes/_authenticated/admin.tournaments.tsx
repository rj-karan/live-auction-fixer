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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { slugify } from "@/lib/format";
import { Pencil, Trash2, Trophy } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { ConfirmDelete } from "@/components/confirm-delete";
import { tournamentImage } from "@/lib/tournament-image";

export const Route = createFileRoute("/_authenticated/admin/tournaments")({
  component: TournamentsPage,
});

type Form = {
  name: string;
  description: string;
  logo_url: string;
  banner_url: string;
  tournament_date: string;
  location: string;
  currency: string;
  default_purse: number;
  max_teams: string;
  team_size: string;
  status: string;
};

const emptyForm: Form = {
  name: "",
  description: "",
  logo_url: "",
  banner_url: "",
  tournament_date: "",
  location: "",
  currency: "₹",
  default_purse: 10000000,
  max_teams: "",
  team_size: "",
  status: "draft",
};

function TournamentFields({
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
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <ImageUpload
        label="Tournament Image / Banner"
        value={form.banner_url}
        onChange={(url) => setForm({ ...form, banner_url: url })}
        folder="tournaments"
      />
      <ImageUpload
        label="Tournament Logo"
        value={form.logo_url}
        onChange={(url) => setForm({ ...form, logo_url: url })}
        folder="tournaments"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={form.tournament_date}
            onChange={(e) =>
              setForm({ ...form, tournament_date: e.target.value })
            }
          />
        </div>
        <div>
          <Label>Venue</Label>
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
        <div>
          <Label>Currency</Label>
          <Input
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </div>
        <div>
          <Label>Starting Purse</Label>
          <Input
            type="number"
            value={form.default_purse}
            onChange={(e) =>
              setForm({ ...form, default_purse: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Maximum Teams</Label>
          <Input
            type="number"
            min={1}
            value={form.max_teams}
            onChange={(e) => setForm({ ...form, max_teams: e.target.value })}
          />
        </div>
        <div>
          <Label>Team Size</Label>
          <Input
            type="number"
            min={1}
            value={form.team_size}
            onChange={(e) => setForm({ ...form, team_size: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Live</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function TournamentsPage() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Form>(emptyForm);

  const load = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let slug = slugify(form.name);
    if (!slug) {
      toast.error("Name required");
      setBusy(false);
      return;
    }
    const { data: existing } = await supabase
      .from("tournaments")
      .select("slug")
      .eq("slug", slug);
    if (existing && existing.length) slug = `${slug}-${Date.now().toString(36)}`;

    const { error } = await supabase.from("tournaments").insert({
      name: form.name,
      description: form.description || null,
      logo_url: form.logo_url || null,
      banner_url: form.banner_url || null,
      location: form.location || null,
      currency: form.currency,
      slug,
      status: form.status as "draft" | "active" | "completed",
      tournament_date: form.tournament_date || null,
      default_purse: Number(form.default_purse),
      max_teams: form.max_teams ? Number(form.max_teams) : null,
      team_size: form.team_size ? Number(form.team_size) : null,
    } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("✅ Tournament created successfully");
    setForm({ ...emptyForm, currency: form.currency });
    load();
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setEditForm({
      name: t.name ?? "",
      description: t.description ?? "",
      logo_url: t.logo_url ?? "",
      banner_url: t.banner_url ?? "",
      tournament_date: t.tournament_date ?? "",
      location: t.location ?? "",
      currency: t.currency ?? "₹",
      default_purse: Number(t.default_purse ?? 0),
      max_teams: t.max_teams != null ? String(t.max_teams) : "",
      team_size: t.team_size != null ? String(t.team_size) : "",
      status: t.status ?? "draft",
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase
      .from("tournaments")
      .update({
        name: editForm.name,
        description: editForm.description || null,
        logo_url: editForm.logo_url || null,
        banner_url: editForm.banner_url || null,
        tournament_date: editForm.tournament_date || null,
        location: editForm.location || null,
        currency: editForm.currency,
        default_purse: Number(editForm.default_purse),
        max_teams: editForm.max_teams ? Number(editForm.max_teams) : null,
        team_size: editForm.team_size ? Number(editForm.team_size) : null,
        status: editForm.status as "draft" | "active" | "completed",
      } as never)
      .eq("id", editing.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("✅ Tournament updated successfully");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Tournament deleted");
      setEditing(null);
      load();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Create Tournament
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <TournamentFields form={form} setForm={setForm} />
            <Button disabled={busy} type="submit">
              {busy ? "Creating…" : "Create Tournament"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>All Tournaments</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground">No tournaments yet.</p>
          )}
          <ul className="space-y-3">
            {list.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <img
                  src={tournamentImage(t)}
                  alt={t.name}
                  loading="lazy"
                  className="h-12 w-20 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{t.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    /tournament/{t.slug}
                  </div>
                </div>
                <Badge variant={t.status === "active" ? "default" : "secondary"}>
                  {t.status === "active" ? "Live" : t.status}
                </Badge>
                <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDelete
                  title="Delete tournament?"
                  description="This deletes the tournament and everything under it. This action cannot be undone."
                  onConfirm={() => del(t.id)}
                >
                  <Button size="icon" variant="ghost">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </ConfirmDelete>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tournament</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <TournamentFields form={editForm} setForm={setEditForm} />
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <ConfirmDelete
                title="Delete tournament?"
                description="This deletes the tournament and everything under it. This action cannot be undone."
                onConfirm={() => editing && del(editing.id)}
              >
                <Button type="button" variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Tournament
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
                  {busy ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
