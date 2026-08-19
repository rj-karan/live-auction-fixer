import { useBrandAsset } from "@/lib/branding";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, User, Gavel } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { SpinningBall } from "./hero-backdrop";
import { SponsorAd, type Sponsor } from "./sponsor-strip";

export type SoldAnnouncementItem = {
  key: string;
  playerName: string;
  playerPhoto?: string | null;
  teamName: string;
  teamLogo?: string | null;
  price: number;
  currency: string;
};

const CONFETTI = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 17.3) % 100,
  delay: (i % 11) * 0.09,
  duration: 2.4 + (i % 5) * 0.45,
  size: 6 + (i % 4) * 3,
  rotate: (i * 47) % 360,
  hue: i % 3,
}));

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  angle: (i / 14) * Math.PI * 2,
  delay: 0.55 + (i % 5) * 0.04,
}));

/**
 * Fullscreen broadcast-style "SOLD" announcement.
 * Purely presentational — the queue is owned by the caller.
 */
export function SoldAnnouncement({
  item,
  onDismiss,
  duration = 7000,
  sponsors = [],
}: {
  item: SoldAnnouncementItem | null;
  onDismiss: () => void;
  duration?: number;
  /** Active sponsors — one is picked at random and shown mid-sequence. */
  sponsors?: Sponsor[];
}) {
  const soldBg = useBrandAsset("soldAnimationBg");
  const reduce = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSponsor, setShowSponsor] = useState(false);

  /** Random active sponsor, stable for the life of one announcement. */
  const sponsor = useMemo(() => {
    if (!item || sponsors.length === 0) return null;
    return sponsors[Math.floor(Math.random() * sponsors.length)] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.key, sponsors]);

  useEffect(() => {
    if (!item) return;
    timer.current = setTimeout(onDismiss, duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [item, duration, onDismiss]);

  // Mid-sequence sponsor slot: appears after the bid reveal, then fades out.
  useEffect(() => {
    if (!item || !sponsor) {
      setShowSponsor(false);
      return;
    }
    const inAt = Math.min(2200, duration * 0.35);
    const outAt = Math.min(duration - 600, inAt + 2600);
    const t1 = setTimeout(() => setShowSponsor(true), inAt);
    const t2 = setTimeout(() => setShowSponsor(false), outAt);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setShowSponsor(false);
    };
  }, [item, sponsor, duration]);


  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key={item.key}
          role="dialog"
          aria-live="polite"
          aria-label={`${item.playerName} sold to ${item.teamName}`}
          className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-background/80 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onClick={onDismiss}
        >
          {soldBg && (
            <img src={soldBg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
          )}
          {/* golden flash */}
          {!reduce && (
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_45%,var(--active),transparent_70%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0] }}
              transition={{ duration: 0.9, times: [0, 0.35, 1], delay: 0.35 }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_oklab,var(--active)_22%,transparent),transparent_65%)]" />
          {!reduce && <Confetti />}

          <motion.div
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-active/50 bg-card/85 p-5 shadow-[0_30px_90px_-30px_var(--active)] sm:p-8"
            initial={{ opacity: 0, scale: 0.86, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
          >
            {/* ball + hammer intro */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              {!reduce && (
                <>
                  <motion.div
                    initial={{ scale: 0.2, rotate: -180, opacity: 0 }}
                    animate={{ scale: [0.2, 1.5, 0], rotate: 180, opacity: [0, 1, 0] }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <SpinningBall className="h-24 w-24" />
                  </motion.div>
                  <motion.div
                    className="absolute text-active"
                    initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
                    animate={{ rotate: [-60, 12, -8, 0], opacity: [0, 1, 1, 0], scale: 1.6 }}
                    transition={{ duration: 0.9, delay: 0.35 }}
                    style={{ transformOrigin: "80% 80%" }}
                  >
                    <Gavel className="h-16 w-16" />
                  </motion.div>
                  {SPARKS.map((s, i) => (
                    <motion.span
                      key={i}
                      className="absolute h-1.5 w-1.5 rounded-full bg-active"
                      initial={{ opacity: 0, x: 0, y: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        x: Math.cos(s.angle) * 190,
                        y: Math.sin(s.angle) * 150,
                      }}
                      transition={{ duration: 0.8, delay: s.delay, ease: "easeOut" }}
                    />
                  ))}
                </>
              )}
            </div>

            <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              {/* player */}
              <motion.div
                className="flex min-w-0 flex-col items-center gap-3 text-center"
                initial={reduce ? false : { opacity: 0, x: -60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.85, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-active/70 bg-muted shadow-[0_0_40px_-10px_var(--active)] sm:h-36 sm:w-36">
                  {item.playerPhoto ? (
                    <img src={item.playerPhoto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="max-w-full truncate text-xl font-black uppercase tracking-tight sm:text-3xl">
                  {item.playerName}
                </p>
              </motion.div>

              {/* SOLD stamp */}
              <motion.div
                className="flex flex-col items-center gap-1"
                initial={reduce ? false : { scale: 2.4, opacity: 0, rotate: -18 }}
                animate={{ scale: 1, opacity: 1, rotate: -8 }}
                transition={{ delay: 1.15, type: "spring", stiffness: 260, damping: 14 }}
              >
                <span className="rounded-xl border-4 border-active px-4 py-1 text-2xl font-black uppercase tracking-[0.2em] text-active shadow-[0_0_38px_-6px_var(--active)] sm:text-4xl">
                  Sold
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Sold to
                </span>
              </motion.div>

              {/* team */}
              <motion.div
                className="flex min-w-0 flex-col items-center gap-3 text-center"
                initial={reduce ? false : { opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-active/60 bg-muted shadow-[0_0_40px_-12px_var(--active)] sm:h-32 sm:w-32">
                  {item.teamLogo ? (
                    <img src={item.teamLogo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-primary text-primary-foreground">
                      <Trophy className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <p className="max-w-full truncate text-lg font-bold uppercase sm:text-2xl">
                  {item.teamName}
                </p>
              </motion.div>
            </div>

            <motion.div
              className="relative mt-5 text-center"
              initial={reduce ? false : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.35, type: "spring", stiffness: 240, damping: 18 }}
            >
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Winning Bid
              </div>
              <div className="shine text-4xl font-black text-active drop-shadow-[0_0_24px_color-mix(in_oklab,var(--active)_60%,transparent)] sm:text-6xl">
                {formatMoney(item.price, item.currency)}
              </div>
            </motion.div>

            {/* Mid-sequence sponsor slot */}
            <AnimatePresence>
              {sponsor && showSponsor && (
                <motion.div
                  key={`sponsor-${sponsor.id}`}
                  className="mt-5 flex justify-center border-t border-active/25 pt-5"
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SponsorAd sponsor={sponsor} />
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Tap anywhere to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI.map((c, i) => (
        <motion.span
          key={i}
          className="absolute top-[-8%] rounded-[2px]"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size * 1.6,
            background:
              c.hue === 0
                ? "var(--active)"
                : c.hue === 1
                  ? "color-mix(in oklab, var(--active) 45%, white)"
                  : "var(--primary)",
          }}
          initial={{ y: "-10vh", opacity: 0, rotate: c.rotate }}
          animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: c.rotate + 540 }}
          transition={{ duration: c.duration, delay: 0.5 + c.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
