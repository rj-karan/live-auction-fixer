import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import stadium from "@/assets/hero-stadium.jpg";
import auction from "@/assets/hero-auction.jpg";
import trophy from "@/assets/hero-trophy.jpg";

const IMAGES = { stadium, auction, trophy } as const;

export type HeroVariant = keyof typeof IMAGES;

/**
 * Broadcast-style hero backdrop: parallax sports photography, navy/gold
 * overlays, floodlight glow, drifting floodlight dust and a slow spotlight.
 * Purely decorative — never blocks interaction.
 */
export function HeroBackdrop({
  variant = "stadium",
  className,
  priority = false,
}: {
  variant?: HeroVariant;
  className?: string;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 90]);
  const scale = useTransform(scrollY, [0, 600], [1.08, reduce ? 1.08 : 1.16]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <motion.img
        src={IMAGES[variant]}
        alt=""
        width={1920}
        height={1080}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        style={{ y, scale }}
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      {/* navy wash + gold vignette keeps text legible */}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,var(--primary)_18%,color-mix(in_oklab,var(--primary)_82%,transparent)_55%,color-mix(in_oklab,var(--primary)_55%,transparent)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_-10%,color-mix(in_oklab,var(--active)_38%,transparent),transparent_60%)]" />
      {!reduce && <Spotlight />}
      {!reduce && <Dust />}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,var(--background),transparent)] opacity-30" />
    </div>
  );
}

function Spotlight() {
  return (
    <motion.div
      className="absolute -top-1/2 left-0 h-[200%] w-1/3 bg-[radial-gradient(closest-side,rgba(255,255,255,0.16),transparent)] blur-2xl"
      animate={{ x: ["-20%", "260%"] }}
      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
    />
  );
}

const DUST = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 2 + (i % 3),
  delay: (i % 7) * 0.8,
  duration: 9 + (i % 5) * 2,
}));

function Dust() {
  return (
    <div className="absolute inset-0">
      {DUST.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-active/50"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
          }}
          animate={{ y: [0, -40, 0], opacity: [0, 0.9, 0] }}
          transition={{
            duration: d.duration,
            delay: d.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/** Slowly rotating cricket ball, rendered as an inline SVG (no image weight). */
export function SpinningBall({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 64 64"
      className={cn("drop-shadow-lg", className)}
      animate={reduce ? undefined : { rotate: 360 }}
      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="32" cy="32" r="30" fill="oklch(0.42 0.18 25)" />
      <circle cx="32" cy="32" r="30" fill="url(#ballShine)" />
      <path
        d="M14 12c9 11 9 29 0 40M50 12c-9 11-9 29 0 40"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.6"
        strokeDasharray="3 4"
        fill="none"
      />
      <defs>
        <radialGradient id="ballShine" cx="30%" cy="25%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
    </motion.svg>
  );
}
