import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";
import {
  ASSET_GROUPS,
  COLOR_FIELDS,
  EMPTY_BRANDING,
  FONT_OPTIONS,
  applyBranding,
  saveBranding,
  useBranding,
  type Branding,
} from "@/lib/branding";
import { Eye, Palette, RotateCcw, Save, Type as TypeIcon, ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: BrandingSettings,
});

function BrandingSettings() {
  const { branding, refresh } = useBranding();
  const [draft, setDraft] = useState<Branding>(branding);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(branding);
  }, [branding]);

  const setAsset = (key: string, url: string) =>
    setDraft((d) => ({ ...d, assets: { ...d.assets, [key]: url || undefined } }));
  const setColor = (key: string, value: string) =>
    setDraft((d) => ({ ...d, colors: { ...d.colors, [key]: value || undefined } }));
  const setType = (key: string, value: any) =>
    setDraft((d) => ({ ...d, typography: { ...d.typography, [key]: value } }));

  const preview = () => {
    applyBranding(draft);
    toast.success("Live preview applied — save to keep it");
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveBranding(draft);
      applyBranding(draft);
      await refresh();
      toast.success("Theme saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save theme");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await saveBranding(EMPTY_BRANDING);
      setDraft(EMPTY_BRANDING);
      applyBranding(EMPTY_BRANDING);
      await refresh();
      toast.success("Reset to default");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset theme");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black tracking-tight">Branding &amp; Appearance</h1>
          <p className="text-sm text-muted-foreground">
            Customize default images, placeholders, logos, colors and fonts across the whole site.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={preview}>
            <Eye className="mr-1 h-4 w-4" /> Preview
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="mr-1 h-4 w-4" /> Save Theme
          </Button>
          <Button variant="ghost" onClick={reset} disabled={saving}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset
          </Button>
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
        </TabsList>

        <TabsContent value="images" className="space-y-6 pt-4">
          {ASSET_GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="text-base">{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <ImageUpload
                    key={item.key}
                    label={item.label}
                    folder="branding"
                    value={draft.assets?.[item.key] ?? ""}
                    onChange={(url) => setAsset(item.key, url)}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="colors" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme colors</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COLOR_FIELDS.map((f) => {
                const value = draft.colors?.[f.key] ?? f.fallback;
                return (
                  <div key={f.key} className="space-y-2">
                    <Label>{f.label}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => setColor(f.key, e.target.value)}
                        className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-background"
                        aria-label={f.label}
                      />
                      <Input
                        value={draft.colors?.[f.key] ?? ""}
                        placeholder={f.fallback}
                        onChange={(e) => setColor(f.key, e.target.value)}
                      />
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
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live preview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <PreviewSwatch label="Primary" color={draft.colors?.primary} />
          <PreviewSwatch label="Button" color={draft.colors?.button} />
          <PreviewSwatch label="Card" color={draft.colors?.card} />
          <div className="sm:col-span-3 rounded-xl border p-4">
            <h3 className="text-xl font-black">Sample heading</h3>
            <p className="text-sm text-muted-foreground">
              Sample body text showing the selected typography and colors.
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
    </div>
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
      <span
        className="h-8 w-8 rounded-md border"
        style={{ background: color ?? "var(--muted)" }}
      />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{color ?? "Default"}</div>
      </div>
    </div>
  );
}
