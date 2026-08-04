import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CricheroesPanel } from "@/components/cricheroes-panel";
import { ArrowLeft, User, Trophy, Crown, ExternalLink } from "lucide-react";
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


  return (
    <div className="min-h-screen bg-background">
      <div className="border-b sticky top-0 z-20 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
          <Link
            to="/tournament/$slug"
            params={{ slug: tournament.slug }}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-active transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to</span> {tournament.name}
          </Link>
          {team?.slug && (
            <Link
              to="/tournament/$slug/team/$teamSlug"
              params={{ slug: tournament.slug, teamSlug: team.slug }}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-active transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {team.name}
            </Link>
          )}
        </div>
      </div>

      <div className="relative border-b text-primary-foreground overflow-hidden">
        <HeroBackdrop variant="auction" className="absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-5"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt=""
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover ring-4 ring-active shrink-0 shine shadow-[0_0_40px_-8px_var(--active)]"
              />
            ) : (
              <div className="grid h-24 w-24 sm:h-28 sm:w-28 shrink-0 place-items-center rounded-full bg-active text-active-foreground">
                <User className="h-10 w-10" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <StatusPill status={player.status} />
              <h1 className="mt-2 text-3xl sm:text-4xl font-black truncate">{player.name}</h1>
              <div className="mt-1 text-sm opacity-85 flex flex-wrap gap-x-4 gap-y-1">
                {player.role && <span>{player.role}</span>}
                {player.player_number && <span>#{player.player_number}</span>}
                {player.age && <span>Age {player.age}</span>}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {isSold && team ? (
          <Card className="glass-card glow-border border-active/60 bg-active-soft/30">
            <CardContent className="pt-5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Auction Result</div>
              <div className="mt-2 flex items-center gap-4">
                <Link
                  to="/tournament/$slug/team/$teamSlug"
                  params={{ slug: tournament.slug, teamSlug: team.slug }}
                  className="group flex items-center gap-3 min-w-0 flex-1"
                >
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                      <Trophy className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">SOLD TO</div>
                    <div className="text-xl font-bold truncate group-hover:text-active">{team.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Crown className="h-3 w-3" /> {team.captain_name}
                    </div>
                  </div>
                </Link>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Final Price</div>
                  <div className="text-2xl sm:text-3xl font-black text-active">
                    <CountUp value={Number(player.final_price)} format={(n) => formatMoney(n, c)} />
                  </div>
                  {event && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
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
              <p className="mt-2 text-sm text-muted-foreground">
                Waiting for auction result.
              </p>
            </CardContent>
          </Card>
        )}

        <Reveal className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {player.base_price != null && (
            <Info label="Base Price" value={formatMoney(Number(player.base_price), c)} />
          )}
          <Info label="Role" value={player.role || ch?.role || "—"} />
          <Info label="Batting Style" value={ch?.batting_style || "—"} />
          <Info label="Bowling Style" value={ch?.bowling_style || "—"} />
          <Info
            label="Auction Price"
            value={isSold && player.final_price != null ? formatMoney(Number(player.final_price), c) : "—"}
          />
          <Info label="Current Team" value={team?.name || (isSold ? "—" : "Not sold")} />
          <Info label="Status" value={String(player.status).toUpperCase()} />
          <Info label="Auction Round" value={`Round ${player.auction_round ?? 1}`} />
          {ch?.city && <Info label="City" value={ch.city} />}
          {player.player_number && <Info label="Number" value={`#${player.player_number}`} />}
          {player.age && <Info label="Age" value={String(player.age)} />}
        </Reveal>

        {cricheroesLink && (
          <Card className="glass-card">
            <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  CricHeroes Profile
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Verified profile link shared by the player.
                </p>
              </div>
              <a
                href={cricheroesLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:text-active transition-colors"
              >
                View on CricHeroes <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        )}

        {player.details && (
          <Card className="glass-card">
            <CardContent className="pt-5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Details</div>
              <p className="text-sm whitespace-pre-wrap">{player.details}</p>
            </CardContent>
          </Card>
        )}

        <CricheroesPanel
          playerRowId={player.id}
          linked={!!(player.cricheroes_player_id || player.cricheroes_url)}
        />

      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    sold: { cls: "bg-active text-active-foreground", label: "SOLD" },
    unsold: { cls: "bg-destructive text-destructive-foreground", label: "UNSOLD" },
    available: { cls: "bg-white/20 text-white", label: "AVAILABLE" },
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <LiftCard>
    <Card className="glass-card h-full">
      <CardContent className="pt-4 pb-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-base font-semibold mt-0.5">{value}</div>
      </CardContent>
    </Card>
    </LiftCard>
  );
}
