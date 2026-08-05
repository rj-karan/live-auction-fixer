import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Copy,
  ExternalLink,
  Trophy,
  Users,
  UserPlus,
  Gavel,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import { useActiveTournament } from "@/hooks/use-active-tournament";
import { CountUp, LiftCard, Reveal } from "@/components/sports/motion-bits";
import { tournamentImage } from "@/lib/tournament-image";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Stat({
  label,
  value,
  money,
  currency,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: number;
  money?: boolean;
  currency?: string;
  icon: React.ComponentType<{ className?: string }>;
  delay?: number;
}) {
  return (
    <LiftCard delay={delay}>
      <Card className="h-full overflow-hidden rounded-xl border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className="mt-1 text-2xl font-bold">
                <CountUp
                  value={value}
                  format={
                    money
                      ? (n) => formatMoney(n, currency)
                      : (n) => String(Math.round(n))
                  }
                />
              </div>
            </div>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </LiftCard>
  );
}

function QuickAction({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link to={to} className="block">
      <Button
        variant="outline"
        className="h-auto w-full justify-start gap-3 rounded-xl border-border/60 py-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
      >
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-medium">{label}</span>
      </Button>
    </Link>
  );
}

function Dashboard() {
  const { tournament } = useActiveTournament();
  const [stats, setStats] = useState({
    tournaments: 0,
    teams: 0,
    players: 0,
    sold: 0,
    unsold: 0,
    available: 0,
    spent: 0,
    remaining: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!tournament) return;
    const load = async () => {
      const [teamsR, playersR, eventsR, tourR] = await Promise.all([
        supabase.from("teams").select("*").eq("tournament_id", tournament.id),
        supabase.from("players").select("*").eq("tournament_id", tournament.id),
        supabase
          .from("auction_events")
          .select("*")
          .eq("tournament_id", tournament.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("tournaments").select("id"),
      ]);
      const teams = teamsR.data ?? [];
      const players = playersR.data ?? [];
      setStats({
        tournaments: (tourR.data ?? []).length,
        teams: teams.length,
        players: players.length,
        sold: players.filter((p) => p.status === "sold").length,
        unsold: players.filter((p) => p.status === "unsold").length,
        available: players.filter((p) => p.status === "available").length,
        spent: teams.reduce((s, t) => s + Number(t.total_spent), 0),
        remaining: teams.reduce((s, t) => s + Number(t.remaining_purse), 0),
      });
      setRecent(eventsR.data ?? []);
    };
    load();
    const ch = supabase
      .channel(`dash-${tournament.id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournament?.id]);

  if (!tournament) {
    return (
      <div className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Create your first tournament to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/admin/tournaments">
              <Button>
                <Trophy className="mr-2 h-4 w-4" /> Create Tournament
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tournament/${tournament.slug}`
      : "";
  const c = tournament.currency || "₹";
  const banner = tournamentImage(tournament);

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <Reveal>
        <Card className="overflow-hidden rounded-2xl border-border/60">
          <div className="relative">
            <img
              src={banner}
              alt={tournament.name}
              className="h-40 w-full object-cover sm:h-52"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5">
              <div>
                <Badge className="mb-2 capitalize">{tournament.status}</Badge>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  {tournament.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Total purse pool ·{" "}
                  {formatMoney(stats.spent + stats.remaining, c)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy Link
                </Button>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <Button size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" /> Public Page
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </Card>
      </Reveal>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tournaments" value={stats.tournaments} icon={Trophy} delay={0} />
        <Stat label="Teams" value={stats.teams} icon={Users} delay={0.05} />
        <Stat label="Players" value={stats.players} icon={UserPlus} delay={0.1} />
        <Stat label="Sold" value={stats.sold} icon={CheckCircle2} delay={0.15} />
        <Stat label="Unsold" value={stats.unsold} icon={XCircle} delay={0.2} />
        <Stat label="Available" value={stats.available} icon={Clock} delay={0.25} />
        <Stat
          label="Money Spent"
          value={stats.spent}
          money
          currency={c}
          icon={Wallet}
          delay={0.3}
        />
        <Stat
          label="Remaining Purse"
          value={stats.remaining}
          money
          currency={c}
          icon={Wallet}
          delay={0.35}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Quick actions */}
        <Reveal delay={0.05}>
          <Card className="rounded-xl border-border/60">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump straight into the work</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <QuickAction
                to="/admin/tournaments"
                label="Create Tournament"
                icon={Trophy}
              />
              <QuickAction to="/admin/teams" label="Add Team" icon={Users} />
              <QuickAction
                to="/admin/players"
                label="Add Player"
                icon={UserPlus}
              />
              <QuickAction
                to="/admin/auction"
                label="Start Auction"
                icon={Gavel}
              />
            </CardContent>
          </Card>
        </Reveal>

        {/* Activity timeline */}
        <Reveal delay={0.1}>
          <Card className="rounded-xl border-border/60">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest auction transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border/70 pl-5">
                  {recent.map((e) => (
                    <li key={e.id} className="relative">
                      <span
                        className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-background ${
                          e.event_type === "sale"
                            ? "bg-emerald-500"
                            : e.event_type === "unsold"
                              ? "bg-destructive"
                              : "bg-muted-foreground"
                        }`}
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm">
                          <span className="font-medium">
                            {e.player_name_snapshot}
                          </span>{" "}
                          <span className="capitalize text-muted-foreground">
                            {e.event_type.replace("_", " ")}
                          </span>
                          {e.team_name_snapshot
                            ? ` · ${e.team_name_snapshot}`
                            : ""}
                        </span>
                        <span className="text-sm font-medium">
                          {e.price ? formatMoney(Number(e.price), c) : "—"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
