import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, ExternalLink, Activity } from "lucide-react";
import {
  cricheroesSessionCache,
  type CricheroesProfile,
  type CricheroesResult,
} from "@/lib/cricheroes";
import { getCricheroesProfile } from "@/lib/cricheroes.functions";

function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value ?? "—"}</div>
    </div>
  );
}

function StatGrid({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{children}</div>
    </div>
  );
}

export function CricheroesPanel({
  playerRowId,
  linked,
}: {
  playerRowId: string;
  linked: boolean;
}) {
  const [state, setState] = useState<CricheroesResult | null>(
    () => cricheroesSessionCache.get(playerRowId) ?? null,
  );
  const [loading, setLoading] = useState(false);

  const load = async (force = false) => {
    setLoading(true);
    try {
      const result = await getCricheroesProfile({ data: { playerRowId, force } });
      cricheroesSessionCache.set(playerRowId, result);
      setState(result);
    } catch {
      setState({ available: false, reason: "CricHeroes profile not available." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!linked) return;
    const cached = cricheroesSessionCache.get(playerRowId);
    if (cached) {
      setState(cached);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRowId, linked]);

  if (!linked) return null;

  if (loading && !state) {
    return (
      <Card>
        <CardContent className="pt-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!state || !state.available) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <div className="font-semibold">CricHeroes profile not available.</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {state?.reason ?? "Showing auction information only."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const p: CricheroesProfile = state.profile;

  return (
    <Card className="animate-fade-in">
      <CardContent className="pt-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-active" />
            <h2 className="text-lg font-bold tracking-tight">CricHeroes Profile</h2>
            <Badge variant="outline" className="text-[10px]">
              ID {p.player_id}
            </Badge>
            {state.source === "cache" && (
              <Badge variant="secondary" className="text-[10px]">cached</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {p.profile_url && (
              <a
                href={p.profile_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-active"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button size="sm" variant="ghost" onClick={() => load(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>
        </div>

        <StatGrid title="Basic Information">
          <Stat label="Full Name" value={p.name} />
          <Stat label="Role" value={p.role} />
          <Stat label="Batting Style" value={p.batting_style} />
          <Stat label="Bowling Style" value={p.bowling_style} />
          <Stat label="Team" value={p.team} />
          <Stat label="City" value={p.city} />
          <Stat label="State" value={p.state} />
        </StatGrid>

        {p.rating != null && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Performance rating</span>
              <span>{p.rating}</span>
            </div>
            <Progress value={Math.max(0, Math.min(100, Number(p.rating)))} />
          </div>
        )}

        <StatGrid title="Batting">
          <Stat label="Matches" value={p.batting?.matches} />
          <Stat label="Innings" value={p.batting?.innings} />
          <Stat label="Runs" value={p.batting?.runs} />
          <Stat label="Highest" value={p.batting?.highest_score} />
          <Stat label="Average" value={p.batting?.average} />
          <Stat label="Strike Rate" value={p.batting?.strike_rate} />
          <Stat label="50s" value={p.batting?.fifties} />
          <Stat label="100s" value={p.batting?.hundreds} />
          <Stat label="Balls Faced" value={p.batting?.balls_faced} />
        </StatGrid>

        <StatGrid title="Bowling">
          <Stat label="Wickets" value={p.bowling?.wickets} />
          <Stat label="Average" value={p.bowling?.average} />
          <Stat label="Economy" value={p.bowling?.economy} />
          <Stat label="Best" value={p.bowling?.best_bowling} />
          <Stat label="Overs" value={p.bowling?.overs} />
          <Stat label="Maidens" value={p.bowling?.maidens} />
        </StatGrid>

        <StatGrid title="Fielding">
          <Stat label="Catches" value={p.fielding?.catches} />
          <Stat label="Run Outs" value={p.fielding?.run_outs} />
          <Stat label="Stumpings" value={p.fielding?.stumpings} />
        </StatGrid>

        {p.recent_matches && p.recent_matches.length > 0 && (
          <StatGrid title="Recent Form">
            {p.recent_matches.slice(0, 5).map((m, i) => (
              <Stat
                key={i}
                label={m.label ?? m.date ?? `Match ${i + 1}`}
                value={`${m.runs ?? 0} runs · ${m.wickets ?? 0} wkts`}
              />
            ))}
          </StatGrid>
        )}
      </CardContent>
    </Card>
  );
}
