import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LAYOUT,
  SPAN_LABELS,
  WIDGET_LABELS,
  type WidgetId,
  type WidgetLayoutItem,
  type WidgetSpan,
} from "@/lib/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  MoreVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Sliders,
  X,
  Maximize2,
} from "lucide-react";

/** Static class map so Tailwind keeps every span literal in the bundle. */
const SPAN_CLASS: Record<WidgetSpan, string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  6: "lg:col-span-6",
};

export type WidgetNode = { id: WidgetId; node: React.ReactNode };

export function DashboardGrid({
  layout,
  widgets,
  canEdit,
  editing,
  onEditingChange,
  onLayoutChange,
  onSave,
  onReset,
  saving,
}: {
  layout: WidgetLayoutItem[];
  widgets: WidgetNode[];
  canEdit: boolean;
  editing: boolean;
  onEditingChange: (v: boolean) => void;
  onLayoutChange: (next: WidgetLayoutItem[]) => void;
  onSave: () => void;
  onReset: () => void;
  saving?: boolean;
}) {
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const byId = new Map(widgets.map((w) => [w.id, w.node]));

  const move = (from: WidgetId, to: WidgetId) => {
    if (from === to) return;
    const next = [...layout];
    const fi = next.findIndex((w) => w.id === from);
    const ti = next.findIndex((w) => w.id === to);
    if (fi < 0 || ti < 0) return;
    const [item] = next.splice(fi, 1);
    next.splice(ti, 0, item);
    onLayoutChange(next);
  };

  const update = (id: WidgetId, patch: Partial<WidgetLayoutItem>) =>
    onLayoutChange(layout.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const visible = layout.filter((w) => editing || !w.hidden);

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-active/30 bg-active-soft/40 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sliders className="h-3.5 w-3.5 shrink-0 text-active" />
            <span className="truncate">
              {editing ? "Drag • Resize • Hide • Show" : "Dashboard layout"}
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={onReset}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEditingChange(false)}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                </Button>
                <Button size="sm" disabled={saving} onClick={onSave}>
                  <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Saving…" : "Save layout"}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => onEditingChange(true)}>
                <Sliders className="mr-1 h-3.5 w-3.5" /> Customize dashboard
              </Button>
            )}
          </div>
        </div>
      )}

      <div className={cn("dash-grid grid gap-4 lg:grid-cols-6", editing && "dash-grid--editing")}>
        {visible.map((item, i) => {
          const node = byId.get(item.id);
          if (!node) return null;
          return (
            <motion.section
              key={item.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: item.hidden ? 0.45 : 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "dash-cell relative min-w-0",
                SPAN_CLASS[item.span],
                editing && "rounded-2xl outline-dashed outline-1 outline-active/40",
                dragId === item.id && "opacity-60",
              )}
              draggable={editing}
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => editing && e.preventDefault()}
              onDrop={(e) => {
                if (!editing || !dragId) return;
                e.preventDefault();
                move(dragId, item.id);
                setDragId(null);
              }}
            >
              {editing && (
                <div className="absolute -top-3 left-3 z-20 flex items-center gap-1 rounded-full border border-active/40 bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow">
                  <GripVertical className="h-3 w-3 cursor-grab text-active" />
                  <span className="max-w-[9rem] truncate">{WIDGET_LABELS[item.id]}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger aria-label="Widget options" className="ml-0.5">
                      <MoreVertical className="h-3 w-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                        <Maximize2 className="h-3 w-3" /> Size
                      </DropdownMenuLabel>
                      {([2, 3, 4, 6] as WidgetSpan[]).map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => update(item.id, { span: s })}
                          className={cn("text-xs", item.span === s && "text-active")}
                        >
                          {SPAN_LABELS[s]}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => update(item.id, { hidden: !item.hidden })}
                      >
                        {item.hidden ? (
                          <>
                            <Eye className="mr-2 h-3 w-3" /> Show
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-2 h-3 w-3" /> Hide
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => {
                          const def = DEFAULT_LAYOUT.find((d) => d.id === item.id);
                          if (def) update(item.id, { span: def.span, hidden: false });
                        }}
                      >
                        <RotateCcw className="mr-2 h-3 w-3" /> Reset widget
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {item.hidden && (
                    <span className="flex items-center gap-0.5 text-muted-foreground">
                      <X className="h-3 w-3" /> hidden
                    </span>
                  )}
                </div>
              )}
              {node}
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
