import { LiveAuctionPanel } from "@/components/sports/live-auction-panel";
import { SponsorStrip } from "@/components/sports/sponsor-strip";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { brandAsset, useBrandAsset } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { HeroBackdrop, SpinningBall } from "@/components/sports/hero-backdrop";
import { DashboardGrid, type WidgetNode } from "@/components/sports/dashboard-grid";
import { useDashboardLayout } from "@/lib/dashboard-layout";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useSponsors } from "@/components/sports/sponsor-strip";
import {
  SoldAnnouncement,
  type SoldAnnouncementItem,
} from "@/components/sports/sold-announcement";
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
  Shirt,
  Target,
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
  const defaultTournamentLogo = useBrandAsset("tournamentLogo");
  const { tournament } = Route.useLoaderData();
  const sponsors = useSponsors(tournament.id);
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

  /* ---- Sold announcement queue (UI only, derived from live player rows) ---- */
  const seenSold = useRef<Map<string, string> | null>(null);
  const [queue, setQueue] = useState<SoldAnnouncementItem[]>([]);
  const dismissAnnouncement = useCallback(() => setQueue((q) => q.slice(1)), []);

  useEffect(() => {
    if (!players.length) return;
    const prev = seenSold.current;
    const next = new Map<string, string>(players.map((p) => [p.id, p.status]));
    seenSold.current = next;
    if (!prev) return; // first snapshot: don't replay history
    const fresh = players.filter(
      (p) => p.status === "sold" && prev.has(p.id) && prev.get(p.id) !== "sold",
    );
    if (!fresh.length) return;
    setQueue((q) => [
      ...q,
      ...fresh.map((p) => {
        const team = teams.find((t) => t.id === p.team_id);
        return {
          key: `${p.id}-${p.final_price}`,
          playerName: p.name,
          playerPhoto: p.photo_url || brandAsset("playerPhoto") || brandAsset("playerPlaceholder"),
          teamName: team?.name ?? "—",
          teamLogo: team?.logo_url ?? null,
          price: Number(p.final_price ?? 0),
          currency: tournament.currency,
        } satisfies SoldAnnouncementItem;
      }),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  const totalSpent = teams.reduce((s, t) => s + Number(t.total_spent), 0);
  const totalRemaining = teams.reduce((s, t) => s + Number(t.remaining_purse), 0);
  const totalInitial = teams.reduce((s, t) => s + Number(t.initial_purse), 0);
  const prices = sold.map((p) => Number(p.final_price)).filter(Boolean);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const topSale = prices.length ? Math.max(...prices) : 0;

  return (
    <div className="pitch-grid min-h-screen bg-background">
      {/* Hero */}
      <div className="relative border-b bg-background text-foreground overflow-hidden">
        <HeroBackdrop variant="stadium" priority assetKey="tournamentHeroBanner" />
        {tournament.banner_url && (
          <img
            src={tournament.banner_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-luminosity"
          />
        )}
        <SpinningBall className="pointer-events-none absolute -right-6 top-6 h-24 w-24 opacity-40 sm:h-32 sm:w-32 sm:opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-14">
          <motion.div
            className="flex items-start gap-4"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="shrink-0"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              {(tournament.logo_url || defaultTournamentLogo) ? (
                <img
                  src={tournament.logo_url || defaultTournamentLogo}
                  alt=""
                  className="h-14 w-14 sm:h-20 sm:w-20 rounded-lg object-cover ring-2 ring-active shadow-[0_0_30px_-6px_var(--active)]"
                />
              ) : (
                <div className="grid h-14 w-14 sm:h-20 sm:w-20 place-items-center rounded-lg bg-active text-active-foreground shadow-[0_0_30px_-6px_var(--active)]">
                  <Trophy className="h-8 w-8" />
                </div>
              )}
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-active text-active-foreground border-0 uppercase tracking-wide text-[10px]">
                  {tournament.status}
                </Badge>
                <span className="flex items-center gap-1.5 text-xs opacity-80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-active opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-active" />
                  </span>
                  Live Auction
                </span>
              </div>
              <h1 className="heading-chaingpt inline-block text-3xl sm:text-5xl font-black tracking-tight truncate drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)]">
                {tournament.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-90">
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
                <span className="flex items-center gap-1">
                  <Gavel className="h-3.5 w-3.5 text-active" /> Physical auction · live results
                </span>
              </div>
            </div>
          </motion.div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--active),transparent)] lights-pulse" />
      </div>

      {/* Section nav */}
      <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-2 sm:px-6">
          <nav className="flex flex-1 overflow-x-auto no-scrollbar">
            {SECTIONS.map((s) => {
              const active = section === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "ripple relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "text-active"
                      : "text-muted-foreground hover:text-foreground hover:drop-shadow-[0_0_10px_color-mix(in_oklab,var(--active)_60%,transparent)]",
                  )}
                >
                  <Icon className={cn("h-4 w-4 transition-transform", active && "scale-110")} />
                  {s.label}
                  {active && (
                    <motion.span
                      layoutId="section-underline"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[linear-gradient(90deg,var(--active),color-mix(in_oklab,var(--active)_50%,white))]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
          <ThemeToggle className="shrink-0" />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={loading ? "loading" : section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {loading ? (
              <div className="space-y-6">
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Shimmer key={i} className="h-24" />
                  ))}
                </div>
                <CardSkeletonGrid count={6} />
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
          </motion.div>
        </AnimatePresence>
      </main>

      <SoldAnnouncement
        item={queue[0] ?? null}
        onDismiss={dismissAnnouncement}
        sponsors={sponsors}
      />
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
  value: React.ReactNode;
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
  const { isAdmin } = useAdminAuth();
  const { layout, setLayout, save, reset } = useDashboardLayout(tournament.id);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const recent = events
    .filter((e: any) => !e.is_undone && !e.event_type.startsWith("undo"))
    .slice(0, 6);

  const prices = sold.map((p: any) => Number(p.final_price)).filter(Boolean);
  const avgPrice = prices.length
    ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
    : 0;
  const topSale = prices.length ? Math.max(...prices) : 0;
  const usedPct = totalInitial ? (totalSpent / totalInitial) * 100 : 0;

  const widgets: WidgetNode[] = [
    {
      id: "pulse",
      node: (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatMini label="Teams" value={teams.length} count={teams.length} icon={<Users className="h-3.5 w-3.5" />} />
          <StatMini label="Players" value={players.length} count={players.length} icon={<User className="h-3.5 w-3.5" />} />
          <StatMini label="Sold" value={sold.length} count={sold.length} accent />
          <StatMini label="Available" value={available.length} count={available.length} />
          <StatMini label="Unsold" value={unsold.length} count={unsold.length} />
          <StatMini
            label="Spent"
            value={<CountUp value={Number(totalSpent)} format={(n) => formatMoney(n, currency)} />}
            icon={<Coins className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
    {
      id: "live",
      node: (
        <LiveAuctionPanel
          tournamentId={tournament.id}
          currency={currency}
          players={players}
          teams={teams}
        />
      ),
    },
    {
      id: "results",
      node: (
        <div className="flex h-full flex-col">
          <SectionHeader
            title="Latest Results"
            action={
              <button
                onClick={() => onSection("results")}
                className="text-sm text-active hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          <Card className="corner-frame glass-card flex-1">
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <EmptyState
                  className="border-0"
                  icon={<Gavel className="h-7 w-7" />}
                  title="No auction results yet"
                  hint="Sales appear here the moment the admin records them."
                />
              ) : (
                <ul className="divide-y">
                  <AnimatePresence initial={false}>
                    {recent.map((e: any, i: number) => (
                      <motion.li
                        key={e.id}
                        layout
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{
                          duration: 0.35,
                          delay: Math.min(i, 6) * 0.04,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{e.player_name_snapshot}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {e.event_type === "sale" ? `→ ${e.team_name_snapshot}` : "Marked unsold"}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "font-semibold text-sm",
                            e.event_type === "sale" ? "text-active" : "text-muted-foreground",
                          )}
                        >
                          {e.price ? formatMoney(Number(e.price), currency) : "—"}
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "purse",
      node: (
        <div className="flex h-full flex-col">
          <SectionHeader title="Purse Overview" />
          <Card className="corner-frame glass-card flex-1">
            <CardContent className="pt-5 space-y-3">
              <PurseRow label="Total Purse" value={formatMoney(totalInitial, currency)} />
              <PurseRow label="Total Spent" value={formatMoney(totalSpent, currency)} highlight />
              <PurseRow label="Remaining" value={formatMoney(totalRemaining, currency)} />
              <AnimatedBar className="h-2" pct={usedPct} />
              <div className="text-right text-[11px] text-muted-foreground">
                <CountUp value={usedPct} format={(n) => `${n.toFixed(0)}% of purse used`} />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "sponsors",
      node: <SponsorStrip tournamentId={tournament.id} />,
    },
    {
      id: "teams",
      node: (
        <div>
          <SectionHeader
            title="Teams"
            action={
              <button
                onClick={() => onSection("teams")}
                className="text-sm text-active hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          <TeamsGrid teams={teams.slice(0, 6)} sold={sold} tournament={tournament} />
        </div>
      ),
    },
    {
      id: "stats",
      node: (
        <div className="flex h-full flex-col">
          <SectionHeader title="Statistics" />
          <Card className="corner-frame glass-card flex-1">
            <CardContent className="grid grid-cols-2 gap-3 pt-5">
              <MiniStat label="Avg Price" value={formatMoney(avgPrice, currency)} />
              <MiniStat label="Top Sale" value={formatMoney(topSale, currency)} accent />
              <MiniStat label="Sold" value={sold.length} />
              <MiniStat
                label="Remaining"
                value={available.length + unsold.length}
              />
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "info",
      node: (
        <div className="flex h-full flex-col">
          <SectionHeader title="Tournament Info" />
          <Card className="corner-frame glass-card flex-1">
            <CardContent className="space-y-3 pt-5 text-sm">
              <PurseRow label="Status" value={String(tournament.status).toUpperCase()} highlight />
              {tournament.location && <PurseRow label="Location" value={tournament.location} />}
              {tournament.tournament_date && (
                <PurseRow
                  label="Date"
                  value={new Date(tournament.tournament_date).toLocaleDateString()}
                />
              )}
              <PurseRow label="Teams" value={teams.length} />
              <PurseRow label="Squad size" value={tournament.team_size ?? "—"} />
              {tournament.description && (
                <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
                  {tournament.description}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <DashboardGrid
      layout={layout}
      widgets={widgets}
      canEdit={isAdmin}
      editing={editing && isAdmin}
      onEditingChange={setEditing}
      onLayoutChange={setLayout}
      saving={saving}
      onSave={async () => {
        setSaving(true);
        await save(layout);
        setSaving(false);
        setEditing(false);
      }}
      onReset={async () => {
        await reset();
      }}
    />
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
  const defaultTeamLogo = useBrandAsset("teamLogo");
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
                  {(t.logo_url || defaultTeamLogo) ? (
                    <img
                      src={t.logo_url || defaultTeamLogo}
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p: any, i: number) => {
            const team: any = p.team_id ? teamMap.get(p.team_id) : null;
            return (
              <LiftCard key={p.id} delay={Math.min(i, 8) * 0.03}>
                <PlayerCard player={p} team={team} tournament={tournament} currency={c} />
              </LiftCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayerCard({
  player: p,
  team,
  tournament,
  currency,
}: {
  player: any;
  team: any;
  tournament: any;
  currency: string;
}) {
  const photo = p.photo_url || brandAsset("playerPhoto") || brandAsset("playerPlaceholder");
  return (
    <Card className="group glass-card glow-border relative h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[color-mix(in_oklab,var(--active)_25%,transparent)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_oklab,var(--active)_14%,transparent),transparent_55%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <CardContent className="relative flex h-full flex-col gap-4 p-4">
        <div className="flex items-start gap-4">
          {/* Portrait — primary focus, ~42% of card */}
          <div className="relative w-[42%] shrink-0">
            <div className="shine relative aspect-square overflow-hidden rounded-2xl border-2 border-active/70 bg-muted shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--active)_70%,transparent)] ring-1 ring-active/25">
              {photo ? (
                <img
                  src={photo}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <User className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <StatusBadge status={p.status} animated />
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <h3 className="truncate text-xl font-black uppercase tracking-tight transition-colors group-hover:text-active">
              {p.name}
            </h3>
            <ul className="space-y-1.5 text-xs">
              <PlayerMeta icon={<Gavel className="h-3.5 w-3.5" />} label={p.role || "Player"} />
              {p.player_number && (
                <PlayerMeta icon={<Shirt className="h-3.5 w-3.5" />} label={`#${p.player_number}`} />
              )}
              {p.base_price != null && (
                <PlayerMeta
                  icon={<Coins className="h-3.5 w-3.5" />}
                  label={`Base ${formatMoney(Number(p.base_price), currency)}`}
                />
              )}
              {p.status === "sold" && p.final_price != null && (
                <PlayerMeta
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label={formatMoney(Number(p.final_price), currency)}
                  accent
                />
              )}
              <PlayerMeta
                icon={<Users className="h-3.5 w-3.5" />}
                label={team?.name || (p.status === "sold" ? "—" : "Available")}
              />
              {(p.batting_style || p.cricheroes_data?.batting_style) && (
                <PlayerMeta
                  icon={<Target className="h-3.5 w-3.5" />}
                  label={p.batting_style || p.cricheroes_data?.batting_style}
                />
              )}
              {(p.bowling_style || p.cricheroes_data?.bowling_style) && (
                <PlayerMeta
                  icon={<Activity className="h-3.5 w-3.5" />}
                  label={p.bowling_style || p.cricheroes_data?.bowling_style}
                />
              )}
            </ul>
          </div>
        </div>

        <div className="mt-auto pt-1">
          <Button asChild className="w-full" variant="default">
            <Link
              to="/tournament/$slug/player/$playerId"
              params={{ slug: tournament.slug, playerId: p.id }}
            >
              View Profile <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerMeta({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <li className="flex items-center gap-2 min-w-0">
      <span className="text-active shrink-0">{icon}</span>
      <span className={cn("truncate", accent ? "font-bold text-active" : "text-muted-foreground")}>
        {label}
      </span>
    </li>
  );
}


function StatusBadge({ status, animated }: { status: string; animated?: boolean }) {
  const map: Record<string, string> = {
    sold: "bg-active text-active-foreground border-transparent shadow-[0_0_18px_-4px_var(--active)]",
    unsold: "bg-destructive text-destructive-foreground border-transparent shadow-[0_0_18px_-6px_var(--destructive)]",
    available: "bg-secondary text-secondary-foreground border-border",
  };
  return (
    <motion.span
      initial={animated ? { scale: 0.7, opacity: 0 } : false}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: "spring", stiffness: 340, damping: 18 }}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        animated && status === "available" && "lights-pulse",
        map[status] ?? map.available,
      )}
    >
      {status}
    </motion.span>
  );
}

function ResultsSection({ events, teams, tournament }: any) {
  const c = tournament.currency;
  const teamMap = new Map(teams.map((t: any) => [t.id, t]));
  const clean = events.filter((e: any) => !e.is_undone && !e.event_type.startsWith("undo"));
  if (clean.length === 0) {
    return (
      <EmptyState
        icon={<Gavel className="h-7 w-7" />}
        title="No auction results yet"
        hint="Every recorded purchase will show up here live."
      />
    );
  }
  return (
    <Card className="glass-card">
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
        <StatMini
          label="Total Spent"
          value={<CountUp value={Number(totalSpent)} format={(n) => formatMoney(n, currency)} />}
          icon={<Wallet className="h-3.5 w-3.5" />}
        />
        <StatMini
          label="Avg Price"
          value={<CountUp value={Number(avgPrice)} format={(n) => formatMoney(n, currency)} />}
        />
        <StatMini
          label="Top Sale"
          value={<CountUp value={Number(topSale)} format={(n) => formatMoney(n, currency)} />}
          accent
        />
        <StatMini label="Sold / Total" value={`${sold.length}/${sold.length + unsold.length + available.length}`} />
      </div>

      <div>
        <SectionHeader title="Top Purchases" />
        <Card className="glass-card">
          <CardContent className="p-0">
            {priciest.length === 0 ? (
              <EmptyState
                className="border-0"
                icon={<Trophy className="h-7 w-7" />}
                title="No sales recorded yet"
                hint="Top purchases will rank here."
              />
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
