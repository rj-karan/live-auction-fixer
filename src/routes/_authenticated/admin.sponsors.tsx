import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useActiveTournament } from "@/hooks/use-active-tournament";
import { toast } from "sonner";
import { Eye, EyeOff, GripVertical, Handshake, Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/sponsors")({
  component: SponsorsPage,
});

type Sponsor = {
  id: string;
  tournament_id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
};

type Form = {
  name: string;
  logo_url: string;
  website_url: string;
  display_order: string;
  is_active: boolean;
};

const emptyForm: Form = {
  name: "",
  logo_url: "",
  website_url: "",
  display_order: "0",
  is_active: true,
};

function SponsorsPage() {
  const { tournament } = useActiveTournament();
  const [list, setList] = useState<Sponsor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tournament) return;
    const { data } = await supabase
      .from("sponsors")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("display_order", { ascending: true });
    setList((data ?? []) as Sponsor[]);
  }, [tournament?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!tournament)
    return <p className="text-muted-foreground">Create a tournament first.</p>;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, display_order: String(list.length) });
    setOpen(true);
  };

  const openEdit = (s: Sponsor) => {
    setEditing(s);
    setForm({
      name: s.name,
      logo_url: s.logo_url ?? "",
      website_url: s.website_url ?? "",
      display_order: String(s.display_order),
      is_active: s.is_active,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Sponsor name is required");
    setBusy(true);
    const payload = {
      tournament_id: tournament.id,
      name: form.name.trim(),
      logo_url: form.logo_url || null,
      website_url: form.website_url || null,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("sponsors").update(payload as never).eq("id", editing.id)
      : await supabase.from("sponsors").insert(payload as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Sponsor updated" : "Sponsor added");
    setOpen(false);
    load();
  };

  const toggleActive = async (s: Sponsor) => {
    const { error } = await supabase
      .from("sponsors")
      .update({ is_active: !s.is_active } as never)
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("sponsors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Sponsor removed");
    load();
  };

  const persistOrder = async (ordered: Sponsor[]) => {
    setList(ordered);
    await Promise.all(
      ordered.map((s, i) =>
        supabase.from("sponsors").update({ display_order: i } as never).eq("id", s.id),
      ),
    );
    load();
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = list.findIndex((s) => s.id === dragId);
    const to = list.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    persistOrder(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="heading-chaingpt">
          <h1 className="text-xl font-bold uppercase tracking-[0.1em]">Sponsors</h1>
          <p className="text-xs text-muted-foreground">{tournament.name}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Sponsor
        </Button>
      </div>

      <Card className="corner-frame">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-4 w-4" /> Sponsor list ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sponsors yet. Add one to show it on the public tournament page.
            </p>
          ) : (
            <ul className="space-y-2">
              {list.map((s) => (
                <li
                  key={s.id}
                  draggable
                  onDragStart={() => setDragId(s.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(s.id)}
                  className="flex items-center gap-3 rounded-md border p-2 transition-colors hover:bg-muted/50"
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded bg-muted">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Handshake className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    {s.website_url && (
                      <div className="truncate text-xs text-muted-foreground">{s.website_url}</div>
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">#{s.display_order}</span>
                  <Badge variant={s.is_active ? "default" : "secondary"}>
                    {s.is_active ? "Active" : "Disabled"}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={() => toggleActive(s)}>
                    {s.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDelete
                    title="Delete sponsor?"
                    description="This removes the sponsor from the public page."
                    onConfirm={async () => {
                      await del(s.id);
                    }}
                  >
                    <Button size="icon" variant="ghost">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </ConfirmDelete>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Sponsor" : "Add Sponsor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>Sponsor Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <ImageUpload
              label="Sponsor Logo"
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              folder="sponsors"
            />
            <div>
              <Label>Website URL</Label>
              <Input
                value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label className="mb-0">Active</Label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
