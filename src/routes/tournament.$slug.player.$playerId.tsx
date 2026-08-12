import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { useBrandAsset, useBrandLayout } from "@/lib/branding";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  User,
  Users,
  Trophy,
  Crown,
  ExternalLink,
  Gavel,
  Shirt,
  Target,
  Activity,
  Coins,
  Wallet,
  MapPin,
} from "lucide-react";
import { cricheroesProfileUrl } from "@/lib/cricheroes";
import { motion } from "framer-motion";
import { Reveal, LiftCard, CountUp } from "@/components/sports/motion-bits";
import { HeroBackdrop } from "@/components/sports/hero-backdrop";


export const Route = createFileRoute("/tournament/$slug/player/$playerId")({
  loader: async ({ params }) => {
    const { data: tour } = await supabase
      .from("tournaments")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!tour) throw notFound();
    const { data: player } = await supabase
      .from("players")
      .select("*")
      .eq("id", params.playerId)
      .eq("tournament_id", tour.id)
      .maybeSingle();
    if (!player) throw notFound();
    return { tournament: tour, player };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.player.name} — ${loaderData.tournament.name}` },
          {
            name: "description",
            content: `Auction result for ${loaderData.player.name} in ${loaderData.tournament.name}.`,
          },
        ]
      : [{ title: "Player" }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Player not found</h1>
      </div>
    </div>
  ),
  component: PlayerPage,
});

function PlayerPage() {
  const { tournament, player: initial } = Route.useLoaderData();
  const [player, setPlayer] = useState<any>(initial);
  const [team, setTeam] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const c = tournament.currency;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: p } = await supabase
        .from("players")
        .select("*")
        .eq("id", initial.id)
        .maybeSingle();
      if (cancelled || !p) return;
      setPlayer(p);
      if (p.team_id) {
        const { data: t } = await supabase.from("teams").select("*").eq("id", p.team_id).maybeSingle();
        if (!cancelled) setTeam(t);
      } else {
        setTeam(null);
      }
      const { data: e } = await supabase
        .from("auction_events")
        .select("*")
        .eq("player_id", initial.id)
        .eq("is_undone", false)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled) setEvent(e?.[0] ?? null);
    };
    load();
    const ch = supabase
      .channel(`player-${initial.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `id=eq.${initial.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_events", filter: `player_id=eq.${initial.id}` }, load)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [initial.id]);

  const isSold = player.status === "sold";
  const isUnsold = player.status === "unsold";
  const cricheroesLink =
    player.cricheroes_url ||
    (player.cricheroes_player_id ? cricheroesProfileUrl(player.cricheroes_player_id) : null);
  const ch = (player.cricheroes_data ?? null) as {
    role?: string | null;
    batting_style?: string | null;
    bowling_style?: string | null;
    city?: string | null;
  } | null;


  const defaultPhoto = useBrandAsset("playerPhoto");
  const placeholderPhoto = useBrandAsset("playerPlaceholder");
  const defaultTeamLogo = useBrandAsset("teamLogo");
  const pageBg = useBrandAsset("playerProfileBg");
  const pageBgLayout = useBrandLayout("playerProfileBg");

  const photo = player.photo_url || defaultPhoto || placeholderPhoto;
  const teamLogo = team?.logo_url || defaultTeamLogo;

  const notAvail = (v?: string | null) => (v && String(v).trim() ? String(v) : null);

  return (
    <div className="relative min-h-screen bg-background">
      {pageBg && (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 bg-no-repeat"
            style={{
              backgroundImage: `url(${pageBg})`,
              backgroundSize: pageBgLayout.fit ?? "cover",
              backgroundPosition: pageBgLayout.position ?? "center",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 bg-background"
            style={{ opacity: (pageBgLayout.overlay ?? 40) / 100 }}
          />
        </>
      )}

      <div className="relative border-b sticky top-0 z-20 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            to="/tournament/$slug"
            params={{ slug: tournament.slug }}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-active"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to</span> {tournament.name}
          </Link>
          {team?.slug && (
            <Link
              to="/tournament/$slug/team/$teamSlug"
              params={{ slug: tournament.slug, teamSlug: team.slug }}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-active"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {team.name}
            </Link>
          )}
        </div>
      </div>

      {/* Compact hero */}
      <div className="relative h-[110px] sm:h-[140px]">
        <HeroBackdrop variant="stadium" assetKey="playerHeroBanner" className="absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_top,var(--background),transparent)]" />
      </div>

      <main className="relative mx-auto -mt-10 max-w-6xl px-4 pb-14 sm:px-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-active">
          Player Profile
        </p>

        <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {/* LEFT — photo + identity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3 lg:sticky lg:top-20"
          >
            <div className="relative aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-2xl border border-active/50 bg-card shadow-[0_16px_40px_-26px_rgba(0,0,0,0.9)]">
              {photo ? (
                <img
                  src={photo}
                  alt={player.name}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <User className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            <h1 className="text-center text-3xl font-black uppercase leading-tight tracking-tight sm:text-4xl">
              {player.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {notAvail(player.role || ch?.role) && <span>{player.role || ch?.role}</span>}
              {player.player_number && (
                <>
                  <span className="text-active">•</span>
                  <span>#{player.player_number}</span>
                </>
              )}
              {player.age && (
                <>
                  <span className="text-active">•</span>
                  <span>Age {player.age}</span>
                </>
              )}
            </div>
            <StatusPill status={player.status} />
          </motion.div>

          {/* RIGHT — result + info grid */}
          <div className="space-y-4">
            {isSold && team ? (
              <Card className="glass-card border-active/60 bg-active-soft/25">
                <CardContent className="pt-5">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Auction Result
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <Link
                      to="/tournament/$slug/team/$teamSlug"
                      params={{ slug: tournament.slug, teamSlug: team.slug }}
                      className="group flex min-w-0 flex-1 items-center gap-3"
                    >
                      {teamLogo ? (
                        <img
                          src={teamLogo}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-active/50"
                        />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                          <Trophy className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">SOLD TO</div>
                        <div className="truncate text-xl font-bold group-hover:text-active">
                          {team.name}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Crown className="h-3 w-3" /> {team.captain_name}
                        </div>
                      </div>
                    </Link>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Final Price
                      </div>
                      <div className="text-2xl font-black text-active sm:text-3xl">
                        <CountUp value={Number(player.final_price)} format={(n) => formatMoney(n, c)} />
                      </div>
                      {event && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : isUnsold ? (
              <Card className="glass-card border-destructive/40 bg-destructive/5">
                <CardContent className="pt-5 text-center">
                  <Badge variant="destructive" className="text-sm">UNSOLD</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This player did not receive a bid in the physical auction.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card">
                <CardContent className="pt-5 text-center">
                  <Badge variant="secondary" className="text-sm">Available</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">Waiting for auction result.</p>
                </CardContent>
              </Card>
            )}

            {/* Aligned information grid */}
            <Reveal className="grid auto-rows-fr gap-3 sm:grid-cols-2">
              <Info label="Role" value={notAvail(player.role || ch?.role)} icon={<Gavel className="h-4 w-4" />} />
              <Info
                label="Batting Style"
                value={notAvail(player.batting_style || ch?.batting_style)}
                icon={<Target className="h-4 w-4" />}
              />
              <Info
                label="Bowling Style"
                value={notAvail(player.bowling_style || ch?.bowling_style)}
                icon={<Activity className="h-4 w-4" />}
              />
              <Info
                label="Base Price"
                value={player.base_price != null ? formatMoney(Number(player.base_price), c) : null}
                icon={<Coins className="h-4 w-4" />}
              />
              <Info
                label="Auction Price"
                value={
                  isSold && player.final_price != null
                    ? formatMoney(Number(player.final_price), c)
                    : "Awaiting Auction"
                }
                icon={<Wallet className="h-4 w-4" />}
                accent={isSold}
              />
              <Info
                label="Current Team"
                value={team?.name || "Not Sold"}
                icon={<Users className="h-4 w-4" />}
              />
              <Info
                label="Auction Round"
                value={`Round ${player.auction_round ?? 1}`}
                icon={<Trophy className="h-4 w-4" />}
              />
              <Info
                label="Player Number"
                value={player.player_number ? `#${player.player_number}` : null}
                icon={<Shirt className="h-4 w-4" />}
              />
              <Info
                label="Status"
                value={String(player.status).replace(/^\w/, (m) => m.toUpperCase())}
                icon={<Activity className="h-4 w-4" />}
              />
              <Info
                label="City"
                value={notAvail(player.city || ch?.city)}
                icon={<MapPin className="h-4 w-4" />}
              />
            </Reveal>

            {cricheroesLink && (
              <Card className="glass-card border-active/30">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="text-sm font-semibold">Official CricHeroes Profile</div>
                  <a
                    href={cricheroesLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-active px-4 py-2 text-sm font-semibold text-active-foreground shadow-[0_8px_26px_-12px_var(--active)] transition-transform hover:scale-[1.03]"
                  >
                    View Official CricHeroes Profile <ExternalLink className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>
            )}

            {player.details && (
              <Card className="glass-card">
                <CardContent className="pt-5">
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Details
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{player.details}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}



function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    sold: { cls: "bg-active text-active-foreground", label: "SOLD" },
    unsold: { cls: "bg-destructive text-destructive-foreground", label: "UNSOLD" },
    available: { cls: "bg-secondary text-secondary-foreground border border-border", label: "AVAILABLE" },
  };
  const m = map[status] ?? map.available;
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.15 }}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        status === "sold" && "shadow-[0_0_22px_-4px_var(--active)]",
        m.cls,
      )}
    >
      {m.label}
    </motion.span>
  );
}

function Info({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  const empty = !value;
  return (
    <LiftCard className="h-full">
      <Card className="glass-card h-full rounded-xl border-active/20 shadow-[0_8px_28px_-20px_rgba(0,0,0,0.8)]">
        <CardContent className="flex h-full items-start gap-3 px-4 py-3">
          {icon && <span className="mt-0.5 shrink-0 text-active">{icon}</span>}
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
            <div
              className={cn(
                "mt-0.5 break-words text-base font-semibold",
                accent && "text-active",
                empty && "text-sm font-normal text-muted-foreground",
              )}
            >
              {value || "Not Available"}
            </div>
          </div>
        </CardContent>
      </Card>
    </LiftCard>
  );
}

