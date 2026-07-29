import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Trophy,
  User,
  Crown,
  Wallet,
  Coins,
  TrendingUp,
  Users,
  LayoutGrid,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/tournament/$slug/team/$teamSlug")({
  loader: async ({ params }) => {
    const { data: tour } = await supabase
      .from("tournaments")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!tour) throw notFound();
    const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tour.id)
      .eq("slug", params.teamSlug)
      .maybeSingle();
    if (!team) throw notFound();
    return { tournament: tour, team };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.team.name} — ${loaderData.tournament.name}` },
          {
            name: "description",
            content: `Squad, purse and purchase history for ${loaderData.team.name} in ${loaderData.tournament.name}.`,
          },
        ]
      : [{ title: "Team" }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Team not found</h1>
      </div>
    </div>
  ),
  component: TeamPage,
});

type SortKey = "latest" | "oldest" | "high" | "low";

function TeamPage() {
  const { tournament, team: initialTeam } = Route.useLoaderData();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(initialTeam);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [sort, setSort] = useState<SortKey>("latest");
  const c = tournament.currency;

  useEffect(() => {
    setTeam(initialTeam);
  }, [initialTeam.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [teamR, teamsR, playersR, eventsR] = await Promise.all([
        supabase.from("teams").select("*").eq("id", initialTeam.id).maybeSingle(),
        supabase.from("teams").select("*").eq("tournament_id", tournament.id).order("name"),
        supabase.from("players").select("*").eq("team_id", initialTeam.id),
        supabase
          .from("auction_events")
          .select("*")
          .eq("tournament_id", tournament.id)
          .eq("team_id", initialTeam.id)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (teamR.data) setTeam(teamR.data);
      setTeams(teamsR.data ?? []);
      setPlayers(playersR.data ?? []);
      setEvents(eventsR.data ?? []);
    };
    load();
    const ch = supabase
      .channel(`team-${initialTeam.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_events" }, load)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [initialTeam.id, tournament.id]);

  const teamIdx = teams.findIndex((t) => t.id === team.id);
  const prevTeam = teamIdx > 0 ? teams[teamIdx - 1] : null;
  const nextTeam = teamIdx >= 0 && teamIdx < teams.length - 1 ? teams[teamIdx + 1] : null;

  const prices = players.map((p) => Number(p.final_price)).filter(Boolean);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const hi = prices.length ? Math.max(...prices) : 0;
  const lo = prices.length ? Math.min(...prices) : 0;

  const maxPlayers = Number(team.max_players ?? 0);
  const squadSize = players.length + 1; // incl. captain
  const remainingSlots = maxPlayers ? Math.max(0, maxPlayers - squadSize) : null;
  const utilization = Number(team.initial_purse)
    ? (Number(team.total_spent) / Number(team.initial_purse)) * 100
    : 0;

  const roleCount = (matcher: RegExp) =>
    players.filter((p) => matcher.test(String(p.role ?? ""))).length;
  const composition = {
    batsmen: roleCount(/bat/i),
    bowlers: roleCount(/bowl/i),
    allRounders: roleCount(/all[\s-]?round/i),
    keepers: roleCount(/keep|wk/i),
  };

  const sortedPlayers = useMemo(() => {
    const arr = [...players];
    switch (sort) {
      case "latest":
        return arr.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      case "oldest":
        return arr.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
      case "high":
        return arr.sort((a, b) => Number(b.final_price ?? 0) - Number(a.final_price ?? 0));
      case "low":
        return arr.sort((a, b) => Number(a.final_price ?? 0) - Number(b.final_price ?? 0));
    }
  }, [players, sort]);

  const salesEvents = events.filter((e) => e.event_type === "sale" && !e.is_undone);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="border-b bg-background sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-2">
          <Link
            to="/tournament/$slug"
            params={{ slug: tournament.slug }}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-active transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to</span> {tournament.name}
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <button
              disabled={!prevTeam}
              onClick={() =>
                prevTeam &&
                navigate({
                  to: "/tournament/$slug/team/$teamSlug",
                  params: { slug: tournament.slug, teamSlug: prevTeam.slug },
                })
              }
              className={cn(
                "grid h-8 w-8 place-items-center rounded-md border transition-colors",
                prevTeam
                  ? "hover:bg-active hover:text-active-foreground hover:border-active"
                  : "opacity-40 cursor-not-allowed",
              )}
              aria-label="Previous team"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="hidden sm:block w-56">
              <Select
                value={team.id}
                onValueChange={(id) => {
                  const t = teams.find((x) => x.id === id);
                  if (t)
                    navigate({
                      to: "/tournament/$slug/team/$teamSlug",
                      params: { slug: tournament.slug, teamSlug: t.slug },
                    });
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              disabled={!nextTeam}
              onClick={() =>
                nextTeam &&
                navigate({
                  to: "/tournament/$slug/team/$teamSlug",
                  params: { slug: tournament.slug, teamSlug: nextTeam.slug },
                })
              }
              className={cn(
                "grid h-8 w-8 place-items-center rounded-md border transition-colors",
                nextTeam
                  ? "hover:bg-active hover:text-active-foreground hover:border-active"
                  : "opacity-40 cursor-not-allowed",
              )}
              aria-label="Next team"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Team header */}
      <div className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-start gap-4">
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt=""
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover ring-2 ring-active shrink-0"
              />
            ) : (
              <div className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-lg bg-active text-active-foreground shrink-0">
                <Trophy className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 text-xs opacity-80">
                <span>{tournament.name}</span>
                <span>·</span>
                <span className="uppercase tracking-wide">{team.short_name}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black truncate">{team.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-3">
                  {team.captain_photo_url ? (
                    <img
                      src={team.captain_photo_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-active/60"
                    />
                  ) : (
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-active/20">
                      <Crown className="h-4 w-4 text-active" />
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="opacity-70 text-[11px] uppercase tracking-wider">Captain</div>
                    <div className="font-semibold">{team.captain_name}</div>
                  </div>
                </div>
                {team.owner_name && (
                  <div className="text-sm">
                    <div className="opacity-70 text-[11px] uppercase tracking-wider">Owner</div>
                    <div className="font-semibold">{team.owner_name}</div>
                  </div>
                )}
                {team.theme_color && (
                  <div className="text-sm">
                    <div className="opacity-70 text-[11px] uppercase tracking-wider">Team Colour</div>
                    <div className="flex items-center gap-2 font-semibold">
                      <span
                        className="inline-block h-4 w-4 rounded-full ring-1 ring-white/40"
                        style={{ backgroundColor: team.theme_color }}
                      />
                      {team.theme_color}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Financial cards */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Financial Overview
          </h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <FinCard label="Initial Purse" value={formatMoney(Number(team.initial_purse), c)} icon={<Wallet className="h-3.5 w-3.5" />} />
            <FinCard label="Total Spent" value={formatMoney(Number(team.total_spent), c)} icon={<Coins className="h-3.5 w-3.5" />} />
            <FinCard label="Remaining" value={formatMoney(Number(team.remaining_purse), c)} accent icon={<TrendingUp className="h-3.5 w-3.5" />} />
            <FinCard label="Squad Size" value={`${team.players_purchased_count + 1}`} sub="incl. captain" icon={<Users className="h-3.5 w-3.5" />} />
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mt-3">
            <FinCard small label="Highest Buy" value={formatMoney(hi, c)} />
            <FinCard small label="Lowest Buy" value={formatMoney(lo, c)} />
            <FinCard small label="Avg Price" value={formatMoney(avg, c)} />
            <FinCard small label="Purse Used" value={`${utilization.toFixed(1)}%`} />
            <FinCard small label="Max Players" value={maxPlayers ? String(maxPlayers) : "—"} />
            <FinCard
              small
              label="Slots Left"
              value={remainingSlots === null ? "—" : String(remainingSlots)}
            />
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Purse used</span>
              <span>{utilization.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-active transition-all duration-500"
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
          </div>
        </section>

        {/* Team composition */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Team Statistics
          </h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <FinCard small label="Total Players" value={String(squadSize)} sub="incl. captain" />
            <FinCard small label="Batsmen" value={String(composition.batsmen)} />
            <FinCard small label="Bowlers" value={String(composition.bowlers)} />
            <FinCard small label="All-rounders" value={String(composition.allRounders)} />
            <FinCard small label="Wicket Keepers" value={String(composition.keepers)} />
          </div>
        </section>

        {/* Squad */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Complete Squad
              <Badge variant="outline" className="ml-1">{players.length + 1}</Badge>
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground hidden sm:inline">Sort:</span>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="high">Highest price</SelectItem>
                  <SelectItem value="low">Lowest price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Captain */}
            <Card className="border-active/60 bg-active-soft/40">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  {team.captain_photo_url ? (
                    <img src={team.captain_photo_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-active" />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-active text-active-foreground">
                      <Crown className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{team.captain_name}</span>
                    </div>
                    <Badge className="mt-1 bg-active text-active-foreground border-0 text-[10px]">
                      CAPTAIN
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {sortedPlayers.map((p) => (
              <Link
                key={p.id}
                to="/tournament/$slug/player/$playerId"
                params={{ slug: tournament.slug, playerId: p.id }}
                className="group"
              >
                <Card className="h-full transition-all hover:border-active hover:shadow-md cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate group-hover:text-active">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.role || "—"}
                          {p.player_number ? ` · #${p.player_number}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-active">
                          {formatMoney(Number(p.final_price), c)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {players.length === 0 && (
              <Card className="sm:col-span-2 border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No players purchased yet.
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Purchase Timeline */}
        <section>
          <h2 className="text-lg font-bold tracking-tight mb-3">Transaction Timeline</h2>
          <Card>
            <CardContent className="p-0">
              {salesEvents.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  No transactions recorded yet.
                </p>
              ) : (
                <ol className="relative">
                  <TimelineItem
                    label="Team registered"
                    detail={`Initial purse ${formatMoney(Number(team.initial_purse), c)}`}
                    time=""
                    first
                  />
                  {[...salesEvents]
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((e, i, arr) => {
                      const runningSpent = arr
                        .slice(0, i + 1)
                        .reduce((s, x) => s + Number(x.price ?? 0), 0);
                      const remaining = Number(team.initial_purse) - runningSpent;
                      return (
                        <TimelineItem
                          key={e.id}
                          label={
                            e.player_id ? (
                              <Link
                                to="/tournament/$slug/player/$playerId"
                                params={{ slug: tournament.slug, playerId: e.player_id }}
                                className="hover:text-active"
                              >
                                {e.player_name_snapshot}
                              </Link>
                            ) : (
                              e.player_name_snapshot
                            )
                          }
                          detail={`Purchased for ${formatMoney(Number(e.price), c)} · Remaining ${formatMoney(remaining, c)}`}
                          time={new Date(e.created_at).toLocaleString()}
                          price={formatMoney(Number(e.price), c)}
                        />
                      );
                    })}
                </ol>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Bottom prev/next */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          {prevTeam ? (
            <Link
              to="/tournament/$slug/team/$teamSlug"
              params={{ slug: tournament.slug, teamSlug: prevTeam.slug }}
              className="group flex items-center gap-2 rounded-lg border p-3 hover:border-active hover:bg-active-soft/30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-active" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Previous</div>
                <div className="text-sm font-semibold truncate">{prevTeam.name}</div>
              </div>
            </Link>
          ) : <div />}
          {nextTeam ? (
            <Link
              to="/tournament/$slug/team/$teamSlug"
              params={{ slug: tournament.slug, teamSlug: nextTeam.slug }}
              className="group flex items-center gap-2 rounded-lg border p-3 hover:border-active hover:bg-active-soft/30 transition-colors text-right justify-end"
            >
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Next</div>
                <div className="text-sm font-semibold truncate">{nextTeam.name}</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-active" />
            </Link>
          ) : <div />}
        </div>
      </main>
    </div>
  );
}

function FinCard({
  label,
  value,
  sub,
  accent,
  small,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  small?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card className={cn(accent && "border-active/60 bg-active-soft/30")}>
      <CardContent className={cn("pt-4 pb-3", small && "pt-3")}>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          {icon}
          {label}
        </div>
        <div className={cn(
          "font-bold mt-0.5",
          small ? "text-base" : "text-xl",
          accent && "text-active",
        )}>
          {value}
        </div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function TimelineItem({
  label,
  detail,
  time,
  price,
  first,
}: {
  label: React.ReactNode;
  detail: string;
  time: string;
  price?: string;
  first?: boolean;
}) {
  return (
    <li className="relative flex gap-3 px-4 py-3 border-b last:border-b-0">
      <div className="relative flex flex-col items-center">
        <div className={cn(
          "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold shrink-0",
          first ? "bg-primary text-primary-foreground" : "bg-active text-active-foreground",
        )}>
          {first ? "•" : "✓"}
        </div>
      </div>
      <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{label}</div>
          <div className="text-xs text-muted-foreground">{detail}</div>
          {time && <div className="text-[10px] text-muted-foreground mt-0.5">{time}</div>}
        </div>
        {price && (
          <div className="text-sm font-bold text-active shrink-0">{price}</div>
        )}
      </div>
    </li>
  );
}
