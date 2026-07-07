import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { slugify } from "@/lib/format";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tournaments")({
  component: TournamentsPage,
});

function TournamentsPage() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    logo_url: "",
    banner_url: "",
    tournament_date: "",
    location: "",
    currency: "₹",
    default_purse: 10000000,
    status: "draft",
  });
  const [busy, setBusy] = useState(false);

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
    // ensure unique slug
    const { data: existing } = await supabase
      .from("tournaments")
      .select("slug")
      .eq("slug", slug);
    if (existing && existing.length) slug = `${slug}-${Date.now().toString(36)}`;

    const { error } = await supabase.from("tournaments").insert({
      ...form,
      slug,
      status: form.status as "draft" | "active" | "completed",
      tournament_date: form.tournament_date || null,
      default_purse: Number(form.default_purse),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tournament created");
    setForm({ ...form, name: "", description: "" });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this tournament and everything under it?")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create Tournament</CardTitle>
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
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={form.logo_url}
                  onChange={(e) =>
                    setForm({ ...form, logo_url: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Banner URL</Label>
                <Input
                  value={form.banner_url}
                  onChange={(e) =>
                    setForm({ ...form, banner_url: e.target.value })
                  }
                />
              </div>
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
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Default Team Purse</Label>
                <Input
                  type="number"
                  value={form.default_purse}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      default_purse: Number(e.target.value),
                    })
                  }
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button disabled={busy} type="submit">
              {busy ? "Creating…" : "Create Tournament"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
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
                className="flex items-start justify-between border-b pb-3"
              >
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    /tournament/{t.slug} · {t.status}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => del(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
