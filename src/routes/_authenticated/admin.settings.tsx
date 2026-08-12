import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASSET_GROUPS,
  COLOR_FIELDS,
  EMPTY_BRANDING,
  FONT_OPTIONS,
  applyBranding,
  layoutOf,
  saveBranding,
  useBranding,
  type AssetDef,
  type AssetKey,
  type AssetLayout,
  type Branding,
  type ImageFit,
  type ImagePosition,
} from "@/lib/branding";
import { uploadImage } from "@/lib/upload";
import {
  Eye,
  ImageIcon,
  Loader2,
  MoonStar,
  Palette,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Type as TypeIcon,
  Upload,
  User,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Appearance & Branding — Auction Admin" },
      {
        name: "description",
        content:
          "Single source of truth for every logo, banner, background, placeholder and colour used across the auction platform.",
      },
      { property: "og:title", content: "Appearance & Branding — Auction Admin" },
      {
        property: "og:description",
        content: "Customize logos, banners, page backgrounds, placeholders and theme colours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandingSettings,
});

function BrandingSettings() {
  const { branding, refresh } = useBranding();
  const [draft, setDraft] = useState<Branding>(branding);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setDraft(branding);
  }, [branding]);

  const setAsset = (key: AssetKey, url: string) =>
    setDraft((d) => ({ ...d, assets: { ...d.assets, [key]: url || undefined } }));
  const setLayout = (key: AssetKey, patch: Partial<AssetLayout>) =>
    setDraft((d) => ({
      ...d,
      layout: { ...d.layout, [key]: { ...layoutOf(d, key), ...patch } },
    }));
  const setColor = (key: string, value: string) =>
    setDraft((d) => ({ ...d, colors: { ...d.colors, [key]: value || undefined } }));
  const setTheme = (patch: Record<string, any>) =>
    setDraft((d) => ({ ...d, theme: { ...d.theme, ...patch } }));
  const setType = (key: string, value: any) =>
    setDraft((d) => ({ ...d, typography: { ...d.typography, [key]: value } }));

  /* live preview keeps the whole app in sync with the draft */
  useEffect(() => {
    applyBranding(draft);
  }, [draft]);

  const save = async () => {
    setSaving(true);
    try {
      await saveBranding(draft);
      applyBranding(draft);
      await refresh();
      toast.success("Appearance saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save appearance");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    setSaving(true);
    try {
      await saveBranding(EMPTY_BRANDING);
      setDraft(EMPTY_BRANDING);
      applyBranding(EMPTY_BRANDING);
      await refresh();
      toast.success("Appearance reset to the default theme");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset appearance");
    } finally {
      setSaving(false);
    }
  };

  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      ASSET_GROUPS.map((g) => ({
        ...g,
        items: q
          ? g.items.filter((i) =>
              `${i.label} ${i.usedOn} ${i.controls} ${i.key}`.toLowerCase().includes(q),
            )
          : g.items,
      })).filter((g) => g.items.length > 0),
    [q],
  );

  const dirty = JSON.stringify(draft) !== JSON.stringify(branding);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight">Appearance &amp; Branding</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            The single source of truth for every logo, banner, background, placeholder and colour on
            the public site and the admin panel. Each setting shows exactly where it is used.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {dirty && <Badge variant="secondary" className="self-center">Unsaved changes</Badge>}
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save Changes
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={saving}>
                <RotateCcw className="mr-1 h-4 w-4" /> Reset Appearance
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all appearance settings?</AlertDialogTitle>
                <AlertDialogDescription>
                  Reset all appearance settings to the default theme? This restores the original
                  images and colours. Auction data is not affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetAll}>Reset Everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <Tabs defaultValue="images">
        <TabsList>
          <TabsTrigger value="images">
            <ImageIcon className="mr-1 h-4 w-4" /> Images
          </TabsTrigger>
          <TabsTrigger value="colors">
            <Palette className="mr-1 h-4 w-4" /> Colors
          </TabsTrigger>
          <TabsTrigger value="typography">
            <TypeIcon className="mr-1 h-4 w-4" /> Typography
          </TabsTrigger>
          <TabsTrigger value="theme">
            <MoonStar className="mr-1 h-4 w-4" /> Theme
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-1 h-4 w-4" /> Live Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="space-y-6 pt-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search appearance settings — try “player” or “team”"
              className="pl-9"
              aria-label="Search appearance settings"
            />
          </div>

          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">No appearance settings match “{query}”.</p>
          )}

          {groups.map((group) => (
            <section key={group.title} className="space-y-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight">{group.title}</h2>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {group.items.map((item) => (
                  <AssetCard
                    key={item.key}
                    def={item}
                    value={draft.assets?.[item.key] ?? ""}
                    layout={layoutOf(draft, item.key)}
                    onChange={(url) => setAsset(item.key, url)}
                    onLayout={(patch) => setLayout(item.key, patch)}
                  />
                ))}
              </div>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="colors" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Global Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COLOR_FIELDS.map((f) => {
                const value = draft.colors?.[f.key] ?? f.fallback;
                return (
                  <div key={f.key} className="space-y-2 rounded-lg border p-3">
                    <Label className="text-sm font-semibold">{f.label}</Label>
                    <p className="text-xs text-muted-foreground">Used on: {f.usedOn}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : f.fallback}
                        onChange={(e) => setColor(f.key, e.target.value)}
                        className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-background"
                        aria-label={f.label}
                      />
                      <Input
                        value={draft.colors?.[f.key] ?? ""}
                        placeholder={f.fallback}
                        onChange={(e) => setColor(f.key, e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Reset ${f.label}`}
                        onClick={() => setColor(f.key, "")}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fonts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Heading Font</Label>
                <FontSelect
                  value={draft.typography?.headingFont ?? "Default"}
                  onChange={(v) => setType("headingFont", v === "Default" ? undefined : v)}
                />
              </div>
              <div className="space-y-2">
                <Label>Body Font</Label>
                <FontSelect
                  value={draft.typography?.bodyFont ?? "Default"}
                  onChange={(v) => setType("bodyFont", v === "Default" ? undefined : v)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Base Font Size — {draft.typography?.fontScale ?? 100}%</Label>
                <Slider
                  min={85}
                  max={125}
                  step={5}
                  value={[draft.typography?.fontScale ?? 100]}
                  onValueChange={([v]) => setType("fontScale", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Used for visitors who have never picked a theme themselves.
                </p>
                <Select
                  value={draft.theme?.defaultTheme ?? "light"}
                  onValueChange={(v) => setTheme({ defaultTheme: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="stadium">Night Stadium</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dark Mode Accent</Label>
                <p className="text-xs text-muted-foreground">
                  Accent used by Dark and Night Stadium. Default is the auction orange.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(draft.theme?.darkAccent ?? "")
                        ? (draft.theme?.darkAccent as string)
                        : "#f59e0b"
                    }
                    onChange={(e) => setTheme({ darkAccent: e.target.value })}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-background"
                    aria-label="Dark mode accent"
                  />
                  <Input
                    value={draft.theme?.darkAccent ?? ""}
                    placeholder="#f59e0b"
                    onChange={(e) => setTheme({ darkAccent: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Reset dark accent"
                    onClick={() => setTheme({ darkAccent: undefined })}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <AssetCard
                  def={{
                    key: "nightStadiumBg",
                    label: "Night Stadium Background",
                    usedOn: "Every page while the Night Stadium theme is active",
                    controls:
                      "Floodlit stadium / turf image used as the app-wide backdrop in Night Stadium mode.",
                    background: true,
                  }}
                  value={draft.assets?.nightStadiumBg ?? ""}
                  layout={layoutOf(draft, "nightStadiumBg")}
                  onChange={(url) => setAsset("nightStadiumBg", url)}
                  onLayout={(patch) => setLayout("nightStadiumBg", patch)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4 pt-4">
          <PlayerProfilePreview draft={draft} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colour preview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {COLOR_FIELDS.slice(0, 6).map((f) => (
                <PreviewSwatch key={f.key} label={f.label} color={draft.colors?.[f.key]} />
              ))}
              <div className="rounded-xl border p-4 sm:col-span-3">
                <h3 className="text-xl font-black">Sample heading</h3>
                <p className="text-sm text-muted-foreground">
                  Sample body text showing the selected typography and colours.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm">Primary button</Button>
                  <Button size="sm" variant="outline">
                    Secondary
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AssetCard({
  def,
  value,
  layout,
  onChange,
  onLayout,
}: {
  def: AssetDef;
  value: string;
  layout: Required<AssetLayout>;
  onChange: (url: string) => void;
  onLayout: (patch: Partial<AssetLayout>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const pick = async (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) {
      toast.error("Please choose a JPG, JPEG, PNG or WebP image.");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadImage(file, "branding");
      setPending(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{def.label}</CardTitle>
        <p className="text-xs font-medium text-muted-foreground">
          Used on: <span className="text-foreground">{def.usedOn}</span>
        </p>
        <p className="text-xs text-muted-foreground">Controls: {def.controls}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Preview title="Current image" url={value} layout={layout} />
          {pending && <Preview title="New image" url={pending} layout={layout} highlight />}
        </div>

        {pending ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                onChange(pending);
                setPending(null);
                toast.success(`${def.label} updated`);
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              {busy ? "Uploading…" : "Change Image"}
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
                <Trash2 className="mr-1 h-4 w-4" /> Remove
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onChange("");
                onLayout({ position: "center", fit: "cover", overlay: 40 });
              }}
            >
              <RotateCcw className="mr-1 h-4 w-4" /> Reset to Default
            </Button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          className="h-8 text-xs"
        />

        {def.background && (
          <div className="grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Image Position</Label>
              <Select
                value={layout.position}
                onValueChange={(v) => onLayout({ position: v as ImagePosition })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["center", "top", "bottom", "left", "right"] as ImagePosition[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Image Fit</Label>
              <Select value={layout.fit} onValueChange={(v) => onLayout({ fit: v as ImageFit })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Overlay Darkness — {layout.overlay}%</Label>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[layout.overlay]}
                onValueChange={([v]) => onLayout({ overlay: v })}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Preview({
  title,
  url,
  layout,
  highlight,
}: {
  title: string;
  url?: string | null;
  layout: Required<AssetLayout>;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</div>
      <div
        className={
          "relative grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-md border bg-muted " +
          (highlight ? "border-active ring-1 ring-active/40" : "")
        }
      >
        {url ? (
          <>
            <img
              src={url}
              alt=""
              className="h-full w-full"
              style={{ objectFit: layout.fit, objectPosition: layout.position }}
            />
            <span
              className="pointer-events-none absolute inset-0 bg-primary"
              style={{ opacity: layout.overlay / 100 }}
            />
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Default</span>
        )}
      </div>
    </div>
  );
}

function PlayerProfilePreview({ draft }: { draft: Branding }) {
  const hero = draft.assets?.playerHeroBanner;
  const heroLayout = layoutOf(draft, "playerHeroBanner");
  const photo = draft.assets?.playerPhoto;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Live Preview — Player Profile</CardTitle>
        <p className="text-xs text-muted-foreground">
          Public Tournament → Players → Player Profile. Changes apply to the real page as soon as
          you save.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border">
          <div className="relative h-28 bg-primary">
            {hero && (
              <>
                <img
                  src={hero}
                  alt=""
                  className="h-full w-full"
                  style={{ objectFit: heroLayout.fit, objectPosition: heroLayout.position }}
                />
                <span
                  className="absolute inset-0 bg-primary"
                  style={{ opacity: heroLayout.overlay / 100 }}
                />
              </>
            )}
          </div>
          <div className="-mt-10 flex flex-col items-center gap-2 px-4 pb-5">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border-2 border-active bg-muted">
              {photo ? (
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="text-lg font-black">SAMPLE PLAYER</div>
            <div className="text-xs text-muted-foreground">BOWLER • #30</div>
            <span className="rounded-full bg-active px-2 py-0.5 text-[10px] font-bold uppercase text-active-foreground">
              Available
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FONT_OPTIONS.map((f) => (
          <SelectItem key={f} value={f}>
            {f}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PreviewSwatch({ label, color }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span className="h-8 w-8 rounded-md border" style={{ background: color ?? "var(--muted)" }} />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{color ?? "Default"}</div>
      </div>
    </div>
  );
}
