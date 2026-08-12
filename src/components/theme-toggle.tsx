import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { THEME_OPTIONS, useTheme, type ThemeMode } from "@/lib/theme";
import { Check, Monitor, Moon, Stars, Sun } from "lucide-react";

const ICONS: Record<ThemeMode, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  stadium: Stars,
  system: Monitor,
};

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const Icon = ICONS[mode] ?? Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className} aria-label="Change theme">
          <Icon className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ml-2">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_OPTIONS.map((o) => {
          const OptIcon = ICONS[o.value];
          return (
            <DropdownMenuItem
              key={o.value}
              onSelect={() => setMode(o.value)}
              className="gap-2"
            >
              <OptIcon className="h-4 w-4 text-active" />
              <span className="flex-1">
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </span>
              {mode === o.value && <Check className="h-4 w-4 text-active" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
