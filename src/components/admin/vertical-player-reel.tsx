import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  useVelocity,
  type AnimationPlaybackControls,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { useBrandAsset } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Dices, User } from "lucide-react";

/* Visual constants — the viewport always shows exactly three reel rows. */
const ROW_H = 76;
const VISIBLE_ROWS = 3;
const VIEWPORT_H = ROW_H * VISIBLE_ROWS;
const STEPS = 44; // decorative rows rolled past before stopping
const OVERSHOOT_PX = 26; // final spring-like settle distance

export type ReelPlayer = {
  id: string;
  name: string;
  photo_url?: string | null;
  player_number?: number | string | null;
  role?: string | null;
  base_price?: number | null;
  auction_round?: number | null;
};

type Phase = "idle" | "spinning" | "result";

/**
 * Unbiased index in [0, count) using crypto.getRandomValues.
 * Rejects values that would cause modulo bias.
 */
function unbiasedIndex(count: number): number {
  if (count <= 1) return 0;
  const c = globalThis.crypto;
  if (!c?.getRandomValues) return Math.floor(Math.random() * count);
  const range = 0x100000000;
  const limit = range - (range % count);
  const buf = new Uint32Array(1);
  let v = 0;
  do {
    c.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % count;
}

/**
 * Decorative strip: rows[i] is drawn at top offset i * ROW_H.
 * The reel starts centered on row STEPS+1 and travels DOWNWARD, stopping
 * centered on row 1 — which is always the actual winner. Rows 0 and
 * STEPS+2 are padding so the three-row viewport is never empty.
 */
function buildStrip(pool: ReelPlayer[], winner: ReelPlayer): ReelPlayer[] {
  const total = STEPS + 3;
  const rows: ReelPlayer[] = [];
  const pick = (avoidId?: string) => {
    if (pool.length === 1) return pool[0];
    let p = pool[unbiasedIndex(pool.length)];
    let guard = 0;
    while (p.id === avoidId && guard++ < 8) p = pool[unbiasedIndex(pool.length)];
    return p;
  };
  for (let i = 0; i < total; i++) rows.push(i === 1 ? winner : pick(rows[i - 1]?.id));
  return rows;
}

/**
 * Premium vertical slot-machine player selector for the admin auction console.
 * Decorative only: the actual winner is chosen up-front with crypto randomness
 * and committed through `onResult`; the animation always lands on that player.
 */
export function VerticalPlayerReel({
  pool,
  currency,
  disabled,
  disabledReason,
  onSpinStart,
  onResult,
  tournamentId,
}: {
  pool: ReelPlayer[];
  currency: string;
  disabled?: boolean;
  disabledReason?: string;
  onSpinStart?: () => void;
  /** Revalidate + commit the winner in the parent. Resolve true when committed. */
  onResult: (player: ReelPlayer) => Promise<boolean>;
  tournamentId: string;
}) {
  const reduce = useReducedMotion();
  const defaultPhoto = useBrandAsset("playerPhoto");
  const placeholderPhoto = useBrandAsset("playerPlaceholder");

  const [phase, setPhase] = useState<Phase>("idle");
  const [strip, setStrip] = useState<ReelPlayer[] | null>(null);
  const [result, setResult] = useState<ReelPlayer | null>(null);

  const y = useMotionValue(0);
  const velocity = useVelocity(y);
  const blurAmount = useTransform(velocity, (v) => Math.min(5, Math.abs(v) / 1200));
  const filter = useMotionTemplate`blur(${blurAmount}px)`;

  const controlsRef = useRef<AnimationPlaybackControls | null>(null);
  const tokenRef = useRef(0);

  // Strip geometry: end position centers row 1 (the winner) exactly in the
  // middle slot; start position centers row STEPS+1.
  const endTy = 0;
  const startTy = -STEPS * ROW_H;
  const centerBandTop = ROW_H;
  const centerBandHeight = ROW_H;

  const stopAnimation = useCallback(() => {
    tokenRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  // Cancel any in-flight animation when the tournament changes or on unmount.
  useEffect(() => {
    stopAnimation();
    setPhase("idle");
    setStrip(null);
    setResult(null);
    return stopAnimation;
  }, [tournamentId, stopAnimation]);

  const commit = useCallback(
    async (winner: ReelPlayer) => {
      const ok = await onResult(winner);
      if (ok) {
        setResult(winner);
        setPhase("result");
      } else {
        setPhase("idle");
      }
    },
    [onResult],
  );

  const spin = useCallback(() => {
    if (phase === "spinning" || disabled || pool.length === 0) return;
    const winner = pool[unbiasedIndex(pool.length)];
    const rows = buildStrip(pool, winner);
    onSpinStart?.();
    setStrip(rows);
    setResult(null);
    setPhase("spinning");

    if (reduce) {
      // Accessibility: skip the roll, reveal immediately.
      y.set(endTy);
      void commit(winner);
      return;
    }

    stopAnimation();
    const token = ++tokenRef.current;
    y.set(startTy);
    controlsRef.current = animate(y, endTy + OVERSHOOT_PX, {
      duration: 3.9,
      ease: [0.1, 0.78, 0.2, 1],
      onComplete: () => {
        if (tokenRef.current !== token) return;
        // Spring-like settle back to the exact center.
        controlsRef.current = animate(y, endTy, {
          type: "spring",
          stiffness: 340,
          damping: 26,
          onComplete: () => {
            if (tokenRef.current !== token) return;
            void commit(winner);
          },
        });
      },
    });
  }, [phase, disabled, pool, reduce, y, startTy, endTy, commit, onSpinStart, stopAnimation]);

  const spinning = phase === "spinning";
  const spinDisabled = spinning || disabled || pool.length === 0;

  return (
    <div className="space-y-3">
      {/* Reel viewport */}
      <div
        className="relative overflow-hidden rounded-xl border border-active/40 bg-card/60 shadow-[inset_0_10px_30px_-18px_rgba(0,0,0,0.55)]"
        style={{ height: VIEWPORT_H }}
      >
        {/* Center selection band — the only winning position */}
        <div
          className="pointer-events-none absolute inset-x-1.5 z-10 rounded-lg border border-active/60 bg-active-soft/15 shadow-[0_0_28px_-6px_var(--active)]"
          style={{ top: centerBandTop, height: centerBandHeight }}
        />

        {strip ? (
          <motion.div
            className="absolute inset-x-0 top-0"
            style={{ y, filter, willChange: "transform" }}
          >
            {strip.map((p, i) => {
              const photo = p.photo_url || defaultPhoto || placeholderPhoto;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2.5 px-3",
                    i === 1 && "relative z-20",
                  )}
                  style={{ height: ROW_H }}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border/60 bg-muted">
                    {photo ? (
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold uppercase tracking-tight">
                      {p.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {p.role || "—"}
                      {p.player_number ? ` · #${p.player_number}` : ""}
                    </span>
                  </span>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <div className="absolute inset-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 px-3",
                  i === 1 && "rounded-lg border border-dashed border-active/30 bg-active-soft/5",
                )}
                style={{ height: ROW_H }}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-dashed border-border bg-muted/40">
                  <User className="h-5 w-5 text-muted-foreground/60" />
                </span>
                <span className="text-xs text-muted-foreground/70">
                  {i === 1 ? "Ready to roll" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Top / bottom fade overlays — passing players fall away softly */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-9 bg-gradient-to-b from-card via-card/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-9 bg-gradient-to-t from-card via-card/70 to-transparent" />
      </div>

      {/* Reveal details */}
      {result && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-active/50 bg-active-soft/30 p-3"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            On the block
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-active/40 bg-muted">
              {result.photo_url || defaultPhoto || placeholderPhoto ? (
                <img
                  src={result.photo_url || defaultPhoto || placeholderPhoto}
                  alt={result.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black uppercase tracking-tight">
                {result.name}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {result.role || "—"}
                {result.player_number ? ` · #${result.player_number}` : ""} · Base{" "}
                {result.base_price != null ? formatMoney(Number(result.base_price), currency) : "—"} ·
                Round {Number(result.auction_round) || 1}
              </span>
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Bidding panel is ready — sell, mark unsold, or press Esc to clear.
          </p>
        </motion.div>
      )}

      {/* Spin control */}
      <Button
        size="lg"
        className="w-full font-black uppercase tracking-wider"
        onClick={spin}
        disabled={spinDisabled}
      >
        <Dices className="mr-2 h-4 w-4" />
        {spinning ? "Rolling…" : "Spin to Select Player"}
      </Button>

      {/* Status line */}
      {pool.length === 0 ? (
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          All players in this round have been auctioned.
        </p>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground">
          {disabled
            ? disabledReason
            : `${pool.length} eligible player${pool.length === 1 ? "" : "s"} in this round · every player has an equal chance`}
        </p>
      )}
    </div>
  );
}
