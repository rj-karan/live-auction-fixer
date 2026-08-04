import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HeroBackdrop, SpinningBall } from "@/components/sports/hero-backdrop";
import {
  AnimatedBar,
  CardSkeletonGrid,
  CountUp,
  EmptyState,
  LiftCard,
  Shimmer,
} from "@/components/sports/motion-bits";
import {
  Trophy,
  Users,
  User,
  Wallet,
  Coins,
  TrendingUp,
  Activity,
  ChevronRight,
  MapPin,
  Calendar,
  Gavel,
} from "lucide-react";

export const Route = createFileRoute("/tournament/$slug/")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!data) throw notFound();
    return { tournament: data };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.tournament.name} — Live Auction` },
          {
            name: "description",
            content:
              loaderData.tournament.description ??
              `Live auction results for ${loaderData.tournament.name}`,
          },
          { property: "og:title", content: loaderData.tournament.name },
          {
            property: "og:description",
            content:
              loaderData.tournament.description ??
              `Live auction results for ${loaderData.tournament.name}`,
          },
        ]
      : [{ title: "Tournament" }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Tournament not found</h1>
        <Link to="/" className="text-active underline mt-2 inline-block">
          Home
        </Link>
      </div>
    </div>
  ),
  component: PublicTournament,
});

type Section = "overview" | "teams" | "players" | "results" | "stats";

const SECTIONS: { id: Section; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "teams", label: "Teams", icon: Users },
  { id: "players", label: "Players", icon: User },
  { id: "results", label: "Recent Results", icon: TrendingUp },
  { id: "stats", label: "Statistics", icon: Trophy },
];

function PublicTournament() {
  const { tournament } = Route.useLoaderData();
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [section, setSection] = useState<Section>("overview");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [t, p, e] = await Promise.all([
      supabase.from("teams").select("*").eq("tournament_id", tournament.id).order("name"),
      supabase.from("players").select("*").eq("tournament_id", tournament.id).order("name"),
      supabase
        .from("auction_events")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setTeams(t.data ?? []);
    setPlayers(p.data ?? []);
    setEvents(e.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`pub-${tournament.id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id]);

  const c = tournament.currency;
  const sold = useMemo(() => players.filter((p) => p.status === "sold"), [players]);
  const unsold = useMemo(() => players.filter((p) => p.status === "unsold"), [players]);
  const available = useMemo(() => players.filter((p) => p.status === "available"), [players]);
  const totalSpent = teams.reduce((s, t) => s + Number(t.total_spent), 0);
  const totalRemaining = teams.reduce((s, t) => s + Number(t.remaining_purse), 0);
  const totalInitial = teams.reduce((s, t) => s + Number(t.initial_purse), 0);
  const prices = sold.map((p) => Number(p.final_price)).filter(Boolean);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const topSale = prices.length ? Math.max(...prices) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative border-b bg-primary text-primary-foreground overflow-hidden">
        {tournament.banner_url && (
          <img
            src={tournament.banner_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
        )}
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
          <div className="flex items-start gap-4">
            {tournament.logo_url ? (
              <img
                src={tournament.logo_url}
                alt=""
                className="h-14 w-14 sm:h-20 sm:w-20 rounded-lg object-cover ring-2 ring-active shrink-0"
              />
            ) : (
              <div className="grid h-14 w-14 sm:h-20 sm:w-20 place-items-center rounded-lg bg-active text-active-foreground shrink-0">
                <Trophy className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-active text-active-foreground border-0 uppercase tracking-wide text-[10px]">
                  {tournament.status}
                </Badge>
                <span className="text-xs opacity-70">Live Auction</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight truncate">
                {tournament.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-85">
                {tournament.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {tournament.location}
                  </span>
                )}
                {tournament.tournament_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(tournament.tournament_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section nav */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-2 sm:px-6">
          <nav className="flex overflow-x-auto no-scrollbar">
            {SECTIONS.map((s) => {
              const active = section === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "text-active"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 bg-active rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : section === "overview" ? (
          <OverviewSection
            teams={teams}
            players={players}
            sold={sold}
            available={available}
            unsold={unsold}
            events={events}
            currency={c}
            totalInitial={totalInitial}
            totalSpent={totalSpent}
            totalRemaining={totalRemaining}
            tournament={tournament}
            onSection={setSection}
          />
        ) : section === "teams" ? (
          <TeamsGrid teams={teams} sold={sold} tournament={tournament} />
        ) : section === "players" ? (
          <PlayersView players={players} teams={teams} tournament={tournament} />
        ) : section === "results" ? (
          <ResultsSection events={events} teams={teams} tournament={tournament} />
        ) : (
          <StatsSection
            teams={teams}
            sold={sold}
            unsold={unsold}
            available={available}
            currency={c}
            avgPrice={avgPrice}
            topSale={topSale}
            totalSpent={totalSpent}
          />
        )}
      </main>
    </div>
  );
}

function StatMini({
  label,
  value,
  icon,
  accent,
  count,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: boolean;
  count?: number;
}) {
  return (
    <Card className={cn("glass-card glow-border transition-shadow hover:shadow-lg", accent && "border-active/50")}>
      <CardContent className="pt-4 pb-3">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          {icon}
          {label}
        </div>
        <div className={cn("text-xl font-bold mt-1", accent && "text-active")}>
          {count != null ? <CountUp value={count} /> : value}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewSection({
  teams,
  players,
  sold,
  available,
  unsold,
  events,
  currency,
  totalInitial,
  totalSpent,
  totalRemaining,
  tournament,
  onSection,
}: any) {
  const recent = events.filter((e: any) => !e.is_undone && !e.event_type.startsWith("undo")).slice(0, 5);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatMini label="Teams" value={teams.length} icon={<Users className="h-3.5 w-3.5" />} />
        <StatMini label="Players" value={players.length} icon={<User className="h-3.5 w-3.5" />} />
        <StatMini label="Sold" value={sold.length} accent />
        <StatMini label="Available" value={available.length} />
        <StatMini label="Unsold" value={unsold.length} />
        <StatMini label="Spent" value={formatMoney(totalSpent, currency)} icon={<Coins className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader title="Latest Results" action={
            <button onClick={() => onSection("results")} className="text-sm text-active hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          } />
          <Card>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No auction results yet.</p>
              ) : (
                <ul className="divide-y">
                  {recent.map((e: any) => (
                    <li key={e.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{e.player_name_snapshot}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {e.event_type === "sale" ? `→ ${e.team_name_snapshot}` : "Marked unsold"}
                        </div>
                      </div>
                      <div className={cn("font-semibold text-sm", e.event_type === "sale" ? "text-active" : "text-muted-foreground")}>
                        {e.price ? formatMoney(Number(e.price), currency) : "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Purse Overview" />
          <Card>
            <CardContent className="pt-5 space-y-3">
              <PurseRow label="Total Purse" value={formatMoney(totalInitial, currency)} />
              <PurseRow label="Total Spent" value={formatMoney(totalSpent, currency)} highlight />
              <PurseRow label="Remaining" value={formatMoney(totalRemaining, currency)} />
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-active transition-all"
                  style={{ width: `${totalInitial ? Math.min(100, (totalSpent / totalInitial) * 100) : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <SectionHeader title="Teams" action={
          <button onClick={() => onSection("teams")} className="text-sm text-active hover:underline flex items-center gap-1">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        } />
        <TeamsGrid teams={teams.slice(0, 6)} sold={sold} tournament={tournament} />
      </div>
    </div>
  );
}

function PurseRow({ label, value, highlight }: any) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", highlight && "text-active")}>{value}</span>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

function TeamsGrid({ teams, sold, tournament }: any) {
  const c = tournament.currency;
  if (teams.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-7 w-7" />}
        title="No teams yet"
        hint="Teams appear here once the admin adds them."
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((t: any, i: number) => {
        const teamPlayers = sold.filter((p: any) => p.team_id === t.id);
        const usedPct = t.initial_purse ? (Number(t.total_spent) / Number(t.initial_purse)) * 100 : 0;
        return (
          <LiftCard key={t.id} delay={Math.min(i, 8) * 0.05}>
            <Link
              to="/tournament/$slug/team/$teamSlug"
              params={{ slug: tournament.slug, teamSlug: t.slug }}
              className="group block h-full focus:outline-none"
            >
              <Card className="glass-card glow-border h-full overflow-hidden transition-shadow cursor-pointer hover:shadow-2xl group-focus-visible:ring-2 group-focus-visible:ring-active">
                <div className="flex items-center gap-3 border-b bg-[linear-gradient(100deg,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)] px-4 py-3 transition-colors group-hover:bg-[linear-gradient(100deg,color-mix(in_oklab,var(--active)_16%,transparent),transparent)]">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      loading="lazy"
                      className="h-10 w-10 rounded object-cover shrink-0 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110"
                      alt=""
                    />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-primary text-primary-foreground transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                      <Trophy className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate group-hover:text-active transition-colors">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.short_name} · Captain: {t.captain_name}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-active transition-all group-hover:translate-x-1 shrink-0" />
                </div>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Spent" value={formatMoney(Number(t.total_spent), c)} />
                    <MiniStat label="Left" value={formatMoney(Number(t.remaining_purse), c)} accent />
                    <MiniStat label="Squad" value={teamPlayers.length + 1} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Purse used</span>
                      <span>
                        <CountUp value={usedPct} format={(n) => `${n.toFixed(0)}%`} />
                      </span>
                    </div>
                    <AnimatedBar pct={usedPct} />
                  </div>
                  <div className="pt-1 text-xs font-semibold text-active flex items-center gap-1 group-hover:gap-2 transition-all">
                    View team details <ChevronRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </LiftCard>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value, accent }: any) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-bold", accent && "text-active")}>{value}</div>
    </div>
  );
}

function PlayersView({ players, teams, tournament }: any) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "sold" | "available" | "unsold">("all");
  const c = tournament.currency;
  const teamMap = new Map(teams.map((t: any) => [t.id, t]));

  const filtered = players.filter((p: any) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search players…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {(["all", "available", "sold", "unsold"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium capitalize border transition-colors",
                filter === f
                  ? "bg-active text-active-foreground border-active"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-active/50",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<User className="h-7 w-7" />}
          title="No players match"
          hint="Try a different search or filter."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p: any, i: number) => {
            const team: any = p.team_id ? teamMap.get(p.team_id) : null;
            return (
              <LiftCard key={p.id} delay={Math.min(i, 8) * 0.03}>
                <Link
                  to="/tournament/$slug/player/$playerId"
                  params={{ slug: tournament.slug, playerId: p.id }}
                  className="group block h-full"
                >
                  <Card className="glass-card glow-border h-full overflow-hidden transition-shadow hover:shadow-xl cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="shine relative h-12 w-12 shrink-0 rounded-full ring-2 ring-transparent transition group-hover:ring-active/70">
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt=""
                              loading="lazy"
                              className="h-12 w-12 rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold truncate group-hover:text-active transition-colors">
                                {p.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {p.role || "—"}
                                {p.player_number ? ` · #${p.player_number}` : ""}
                              </div>
                            </div>
                            <StatusBadge status={p.status} />
                          </div>
                          {p.status === "sold" && team && (
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                              <span className="flex items-center gap-1 min-w-0">
                                {team.logo_url && (
                                  <img src={team.logo_url} loading="lazy" className="h-4 w-4 rounded shrink-0" alt="" />
                                )}
                                <span className="truncate text-muted-foreground">{team.name}</span>
                              </span>
                              <span className="font-semibold text-active shrink-0">
                                {formatMoney(Number(p.final_price), c)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </LiftCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sold: "bg-active text-active-foreground border-transparent",
    unsold: "bg-destructive/10 text-destructive border-destructive/30",
    available: "bg-secondary text-secondary-foreground border-border",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", map[status] ?? map.available)}>
      {status}
    </span>
  );
}

function ResultsSection({ events, teams, tournament }: any) {
  const c = tournament.currency;
  const teamMap = new Map(teams.map((t: any) => [t.id, t]));
  const clean = events.filter((e: any) => !e.is_undone && !e.event_type.startsWith("undo"));
  if (clean.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No auction results yet.</p>;
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {clean.map((e: any) => {
            const team: any = e.team_id ? teamMap.get(e.team_id) : null;
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  {e.player_id ? (
                    <Link
                      to="/tournament/$slug/player/$playerId"
                      params={{ slug: tournament.slug, playerId: e.player_id }}
                      className="font-medium hover:text-active"
                    >
                      {e.player_name_snapshot}
                    </Link>
                  ) : (
                    <span className="font-medium">{e.player_name_snapshot}</span>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {e.event_type === "sale" && team ? (
                      <>
                        Purchased by{" "}
                        <Link
                          to="/tournament/$slug/team/$teamSlug"
                          params={{ slug: tournament.slug, teamSlug: team.slug }}
                          className="hover:text-active"
                        >
                          {e.team_name_snapshot}
                        </Link>
                      </>
                    ) : (
                      "Marked unsold"
                    )}
                    {" · "}
                    {new Date(e.created_at).toLocaleString()}
                  </div>
                </div>
                <div className={cn("text-sm font-bold shrink-0", e.event_type === "sale" ? "text-active" : "text-muted-foreground")}>
                  {e.price ? formatMoney(Number(e.price), c) : "UNSOLD"}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function StatsSection({ teams, sold, unsold, available, currency, avgPrice, topSale, totalSpent }: any) {
  const priciest = [...sold]
    .filter((p: any) => p.final_price)
    .sort((a: any, b: any) => Number(b.final_price) - Number(a.final_price))
    .slice(0, 5);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatMini label="Total Spent" value={formatMoney(totalSpent, currency)} icon={<Wallet className="h-3.5 w-3.5" />} />
        <StatMini label="Avg Price" value={formatMoney(avgPrice, currency)} />
        <StatMini label="Top Sale" value={formatMoney(topSale, currency)} accent />
        <StatMini label="Sold / Total" value={`${sold.length}/${sold.length + unsold.length + available.length}`} />
      </div>

      <div>
        <SectionHeader title="Top Purchases" />
        <Card>
          <CardContent className="p-0">
            {priciest.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <ul className="divide-y">
                {priciest.map((p: any, i: number) => {
                  const team = teams.find((t: any) => t.id === p.team_id);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                        i === 0 ? "bg-active text-active-foreground" : "bg-muted text-muted-foreground",
                      )}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {team ? team.name : "—"}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-active shrink-0">
                        {formatMoney(Number(p.final_price), currency)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
