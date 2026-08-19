import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { useBrandAsset } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Gavel, User, Trophy } from "lucide-react";

type LiveRow = {
  tournament_id: string;
  player_id: string | null;
  team_id: string | null;
  current_bid: number | null;
  status: string;
  round: number | null;
};

/**
 * Read-only spectator view of the auction state the admin is driving.
 * It only listens to the existing tables — it never writes.
 */
export function LiveAuctionPanel({
  tournamentId,
  currency,
  players,
  teams,
}: {
  tournamentId: string;
  currency: string;
  players: any[];
  teams: any[];
}) {
  const reduce = useReducedMotion();
  const [live, setLive] = useState<LiveRow | null>(null);
  const [flash, setFlash] = useState<{ id: number; amount: number } | null>(null);
  const lastBid = useRef<number | null>(null);
  const placeholderPhoto = useBrandAsset("playerPlaceholder");
  const defaultPhoto = useBrandAsset("playerPhoto");
  const defaultTeamLogo = useBrandAsset("teamLogo");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("live_auction")
        .select("*")
        .eq("tournament_id", tournamentId)
        .maybeSingle();
      if (!cancelled) setLive((data as LiveRow) ?? null);
    };
    load();
    const ch = supabase
      .channel(`live-auction-${tournamentId}`)
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
      supabase.removeChannel(ch);
    };
  }, [tournamentId]);

  // "New bid" micro-animation whenever the amount changes upward.
  useEffect(() => {
    const bid = live?.current_bid != null ? Number(live.current_bid) : null;
    if (bid != null && lastBid.current != null && bid !== lastBid.current) {
      setFlash({ id: Date.now(), amount: bid });
      const t = setTimeout(() => setFlash(null), 900);
      lastBid.current = bid;
      return () => clearTimeout(t);
    }
    lastBid.current = bid;
  }, [live?.current_bid]);

  const player = live?.player_id ? players.find((p) => p.id === live.player_id) : null;
  const team = live?.team_id ? teams.find((t) => t.id === live.team_id) : null;
  const status = live?.status ?? "idle";

  if (!player || status === "idle") {
    return (
      <Card className="glass-card overflow-hidden border-active/30">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <LiveDot label="LIVE AUCTION" muted />
          <p className="text-sm text-muted-foreground">
            Waiting for the admin to bring the next player on the block.
          </p>
        </CardContent>
      </Card>
    );
  }

  const photo = player.photo_url || defaultPhoto || placeholderPhoto;
  const teamLogo = team?.logo_url || defaultTeamLogo;
  const bid = live?.current_bid != null ? Number(live.current_bid) : null;
  const sold = status === "sold";
  const unsold = status === "unsold";

  return (
    <Card
      className={cn(
        "glass-card relative overflow-hidden border-active/50",
        "bg-[linear-gradient(150deg,color-mix(in_oklab,var(--card)_92%,transparent),color-mix(in_oklab,var(--active)_10%,transparent))]",
      )}
    >
      {/* Bid pulse: golden ring sweeps the panel each time the bid changes */}
      <AnimatePresence>
        {flash && !reduce && (
          <motion.span
            key={`ring-${flash.id}`}
            className="pointer-events-none absolute inset-0 z-0 rounded-xl ring-2 ring-active"
            initial={{ opacity: 0.9, scale: 0.985 }}
            animate={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      <CardContent className="relative z-10 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <LiveDot label={sold ? "SOLD" : unsold ? "UNSOLD" : "LIVE AUCTION"} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Round {live?.round ?? player.auction_round ?? 1}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.25em] text-active">Now on Auction</p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <motion.div
            key={player.id}
            initial={reduce ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[4/5] w-full max-w-[180px] shrink-0 self-center overflow-hidden rounded-xl border border-active/50 bg-muted shadow-[0_14px_40px_-24px_var(--active)] sm:self-start"
          >
            {photo ? (
              <img src={photo} alt={player.name} className="h-full w-full object-cover object-center" />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </motion.div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-2xl font-black uppercase tracking-tight sm:text-3xl">
              {player.name}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              <span>{player.role || "Not Available"}</span>
              {player.player_number && (
                <>
                  <span className="text-active">•</span>
                  <span>#{player.player_number}</span>
                </>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Base Price:{" "}
              <span className="font-semibold text-foreground">
                {player.base_price != null
                  ? formatMoney(Number(player.base_price), currency)
                  : "Not Available"}
              </span>
            </div>

            {/* Bid / result */}
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {sold ? "Sold For" : unsold ? "Result" : "Current Bid"}
              </div>
              <AnimatePresence mode="popLayout" initial={false}>
                {unsold ? (
                  <motion.div
                    key="unsold"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-black uppercase text-destructive"
                  >
                    Player went unsold
                  </motion.div>
                ) : bid != null ? (
                  <motion.div
                    key={bid}
                    initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                    className="text-4xl font-black text-active drop-shadow-[0_0_20px_color-mix(in_oklab,var(--active)_60%,transparent)] sm:text-5xl"
                  >
                    {formatMoney(bid, currency)}
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xl font-semibold text-muted-foreground"
                  >
                    Waiting for first bid
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!sold && !unsold && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-active-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-active">
                <motion.span
                  animate={reduce ? undefined : { rotate: [0, -22, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: "80% 80%" }}
                >
                  <Gavel className="h-3.5 w-3.5" />
                </motion.span>
                Bidding Live
              </div>
            )}

            {/* Highest bidder */}
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {sold ? "Sold To" : "Highest Bid By"}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={team?.id ?? "none"}
                  initial={reduce ? false : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -12 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "mt-1 inline-flex items-center gap-2 rounded-xl border px-3 py-2",
                    team ? "border-active/50 bg-active-soft/40" : "border-dashed",
                  )}
                >
                  {team ? (
                    <>
                      {teamLogo ? (
                        <img src={teamLogo} alt="" className="h-8 w-8 rounded object-cover ring-1 ring-active/50" />
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded bg-primary text-primary-foreground">
                          <Trophy className="h-4 w-4" />
                        </span>
                      )}
                      <span className="font-bold">{team.name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {unsold ? "No team" : "Waiting for first bid"}
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* transient "new bid" toast inside the panel */}
        <AnimatePresence>
          {flash && !sold && !unsold && (
            <motion.div
              key={flash.id}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute right-4 top-4 rounded-lg bg-active px-3 py-1.5 text-right text-active-foreground shadow-[0_10px_30px_-10px_var(--active)]"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider">New Bid</div>
              <div className="text-base font-black">{formatMoney(flash.amount, currency)}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function LiveDot({ label, muted }: { label: string; muted?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
      <motion.span
        className={cn("h-2.5 w-2.5 rounded-full", muted ? "bg-muted-foreground" : "bg-destructive")}
        animate={reduce || muted ? undefined : { opacity: [1, 0.25, 1], scale: [1, 1.25, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      {label}
    </span>
  );
}
