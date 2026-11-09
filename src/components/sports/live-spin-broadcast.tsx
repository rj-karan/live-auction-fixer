import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Dices, Trophy, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/sports/hero-backdrop";
import { formatMoney } from "@/lib/format";
import { useBrandAsset } from "@/lib/branding";

type LiveSpinRow = {
  player_id: string | null;
  current_bid: number | null;
  status: string;
  round: number | null;
};

type SpinPlayer = {
  id: string;
  name: string;
  photo_url?: string | null;
  role?: string | null;
  player_number?: number | string | null;
  base_price?: number | null;
  auction_round?: number | null;
  status?: string | null;
};

type BroadcastPhase = "idle" | "spinning" | "winner";

/** Full-screen, read-only public broadcast of the admin's existing random draw. */
export function LiveSpinBroadcast({
  tournamentId,
  tournamentName,
  currency,
  currentRound,
  players,
}: {
  tournamentId: string;
  tournamentName: string;
  currency: string;
  currentRound: number;
  players: SpinPlayer[];
}) {
  const reduce = useReducedMotion();
  const placeholderPhoto = useBrandAsset("playerPlaceholder");
  const [live, setLive] = useState<LiveSpinRow | null>(null);
  const [phase, setPhase] = useState<BroadcastPhase>("idle");
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const candidates = useMemo(() => {
    const round = Number(live?.round ?? currentRound) || 1;
    return players.filter(
      (player) => player.status === "available" && (Number(player.auction_round) || 1) === round,
    );
  }, [players, live?.round, currentRound]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("live_auction")
        .select("player_id,current_bid,status,round")
        .eq("tournament_id", tournamentId)
        .maybeSingle();
      if (!cancelled) setLive((data as LiveSpinRow | null) ?? null);
    };

    void load();
    const channel = supabase
      .channel(`live-spin-broadcast-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        load,
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  useEffect(() => {
    if (live?.status === "spinning") {
      setPhase("spinning");
      setWinnerId(null);
      setDismissed(false);
      return;
    }

    if (live?.status === "live" && live.player_id) {
      setPhase((previous) => {
        if (previous === "spinning") {
          setWinnerId(live.player_id);
          setDismissed(false);
          return "winner";
        }
        return previous;
      });
      return;
    }

    if (live && live.status !== "live") {
      setPhase("idle");
      setWinnerId(null);
    }
  }, [live?.status, live?.player_id]);

  useEffect(() => {
    if (phase !== "spinning" || candidates.length < 2) return;
    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        const next = Math.floor(Math.random() * candidates.length);
        return next === current ? (next + 1) % candidates.length : next;
      });
    }, reduce ? 550 : 145);
    return () => window.clearInterval(timer);
  }, [phase, candidates.length, reduce]);

  useEffect(() => {
    if (phase !== "winner") return;
    const timer = window.setTimeout(() => setPhase("idle"), 7000);
    return () => window.clearTimeout(timer);
  }, [phase, winnerId]);

  const selected = winnerId ? players.find((player) => player.id === winnerId) ?? null : null;
  const rolling = candidates[frameIndex % Math.max(candidates.length, 1)] ?? null;
  const featured = phase === "winner" ? selected : rolling;
  const photo = featured?.photo_url || placeholderPhoto;
  const isWinner = phase === "winner" && !!selected;

  return (
    <AnimatePresence>
      {phase !== "idle" && !dismissed && (
        <motion.div
          key="live-spin-broadcast"
          role="dialog"
          aria-modal="true"
          aria-label={isWinner ? `Selected player: ${selected.name}` : "Random player draw in progress"}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="fixed inset-0 z-[100] overflow-y-auto bg-background text-foreground"
        >
          <HeroBackdrop variant="auction" priority className="opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-background/75" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,color-mix(in_oklab,var(--active)_18%,transparent),transparent_65%)]" />

          <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1600px] flex-col px-4 py-4 sm:px-8 sm:py-7 lg:px-12">
            <header className="flex items-center justify-between gap-4 border-b border-active/30 pb-4 sm:pb-6">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-active/50 bg-active-soft text-active sm:h-14 sm:w-14">
                  {isWinner ? <Trophy className="h-6 w-6 sm:h-7 sm:w-7" /> : <Dices className="h-6 w-6 sm:h-7 sm:w-7" />}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-destructive sm:text-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
                        <span className="relative h-2 w-2 rounded-full bg-destructive" />
                      </span>
                      Live draw
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground sm:text-sm">
                      Round {Number(live?.round ?? currentRound) || 1}
                    </span>
                  </div>
                  <h2 className="mt-1 max-w-[70vw] truncate text-sm font-black uppercase sm:text-lg">
                    {tournamentName}
                  </h2>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                aria-label="Close player draw broadcast"
                title="Close broadcast"
                onClick={() => setDismissed(true)}
                className="shrink-0 border-border/70 bg-background/60"
              >
                <X className="h-4 w-4" />
              </Button>
            </header>

            <main className="grid flex-1 content-center items-center gap-6 py-6 sm:gap-10 sm:py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
              <div className="relative mx-auto w-full max-w-[560px]">
                <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground sm:mb-4 sm:text-xs">
                  <span>{isWinner ? "On the block" : "Player selection"}</span>
                  <span>{candidates.length} eligible</span>
                </div>
                <div className="relative aspect-[5/4] overflow-hidden rounded-xl border border-active/50 bg-card/60 shadow-[0_24px_90px_-32px_var(--active)] sm:aspect-[4/3] lg:aspect-[5/4]">
                  <AnimatePresence mode="wait" initial={false}>
                    {featured ? (
                      <motion.div
                        key={featured.id}
                        initial={reduce ? false : { opacity: 0.2, scale: 1.04, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0.25, scale: 0.98, y: -10 }}
                        transition={{ duration: isWinner ? 0.65 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0"
                      >
                        {photo ? (
                          <img src={photo} alt={featured.name} className="h-full w-full object-cover object-center" />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-muted/50">
                            <User className="h-20 w-20 text-muted-foreground/70 sm:h-28 sm:w-28" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--background)_94%,transparent),transparent_76%)]" />
                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                          <span className="inline-flex rounded-sm bg-active px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-active-foreground sm:text-xs">
                            {isWinner ? "Selected player" : "In the draw"}
                          </span>
                          <p className="mt-2 break-words text-xl font-black uppercase leading-tight sm:text-3xl">
                            {featured.name}
                          </p>
                        </div>
                        {phase === "spinning" && !reduce && (
                          <motion.div
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 h-1 bg-active/90 shadow-[0_0_26px_6px_var(--active)]"
                            animate={{ top: ["8%", "92%", "8%"] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                      </motion.div>
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-muted/30 p-6 text-center">
                        <div>
                          <User className="mx-auto h-16 w-16 text-muted-foreground" />
                          <p className="mt-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Players loading into the draw
                          </p>
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-active/30" />
                </div>
              </div>

              <section className="mx-auto w-full max-w-2xl text-center lg:text-left">
                <motion.div
                  key={isWinner ? "winner" : "spinning"}
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center justify-center gap-3 lg:justify-start">
                    <span className="h-px w-10 bg-active sm:w-16" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-active sm:text-sm">
                      {isWinner ? "Player selected" : "Random selection"}
                    </span>
                    <span className="h-px w-10 bg-active sm:hidden" />
                  </div>
                  <h1 className="mt-4 break-words text-4xl font-black uppercase leading-[0.98] sm:mt-6 sm:text-6xl lg:text-7xl">
                    {isWinner ? selected.name : "Who’s next?"}
                  </h1>
                  <p className="mt-3 text-base font-semibold uppercase text-muted-foreground sm:mt-5 sm:text-xl">
                    {isWinner
                      ? [selected.role, selected.player_number ? `#${selected.player_number}` : null]
                          .filter(Boolean)
                          .join(" · ") || "Ready for bidding"
                      : "The next player is being revealed"}
                  </p>

                  <div className="mx-auto mt-6 grid max-w-md grid-cols-2 border-y border-border/70 py-4 text-left sm:mt-8 sm:py-5 lg:mx-0">
                    <div className="border-r border-border/70 pr-4 sm:pr-6">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                        Base price
                      </div>
                      <div className="mt-1 break-words text-xl font-black tabular-nums text-active sm:text-2xl">
                        {featured?.base_price != null
                          ? formatMoney(Number(featured.base_price), currency)
                          : "—"}
                      </div>
                    </div>
                    <div className="pl-4 sm:pl-6">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                        Auction status
                      </div>
                      <div className="mt-1 text-xl font-black uppercase sm:text-2xl">
                        {isWinner ? "On the block" : "Drawing"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:mt-7 lg:justify-start">
                    <Dices className="h-4 w-4 text-active" />
                    {isWinner ? "Bidding opens on the public board" : "Live from the auction floor"}
                  </div>
                </motion.div>
              </section>
            </main>

            <footer className="flex items-center justify-between gap-3 border-t border-active/30 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:pt-4 sm:text-xs">
              <span className="truncate">{tournamentName}</span>
              <span className="shrink-0 text-active">Live auction broadcast</span>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}