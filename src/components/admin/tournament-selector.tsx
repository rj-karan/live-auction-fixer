import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveTournament } from "@/hooks/use-active-tournament";

/** Persistent admin tournament switcher — every admin query follows this. */
export function TournamentSelector() {
  const { tournament, tournaments, selectId } = useActiveTournament();
  if (tournaments.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline">
        Tournament
      </span>
      <Select value={tournament?.id ?? ""} onValueChange={(v) => selectId(v)}>
        <SelectTrigger className="h-8 w-[190px] text-xs sm:w-[240px]">
          <SelectValue placeholder="Select tournament" />
        </SelectTrigger>
        <SelectContent align="end">
          {tournaments.map((t) => (
            <SelectItem key={t.id} value={t.id} className="text-xs">
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
