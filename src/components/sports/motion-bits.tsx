import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Fade + rise on mount, staggered by index. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Hover lift + press feedback wrapper for cards. */
export function LiftCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn("h-full", className)}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -6, scale: 1.03 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      style={{ willChange: "transform" }}
    >
      {children}
    </motion.div>
  );
}

/** Count-up number animation, honouring reduced motion. */
export function CountUp({
  value,
  duration = 1.1,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce || !inView) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, inView, reduce]);

  return (
    <span ref={ref} className={className}>
      {format ? format(display) : Math.round(display).toLocaleString()}
    </span>
  );
}

/** Progress bar that fills from 0 with a spring. */
export function AnimatedBar({
  pct,
  className,
  barClassName,
}: {
  pct: number;
  className?: string;
  barClassName?: string;
}) {
  const reduce = useReducedMotion();
  const width = `${Math.max(0, Math.min(100, pct))}%`;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <motion.div
        className={cn(
          "h-full rounded-full bg-[linear-gradient(90deg,var(--active),color-mix(in_oklab,var(--active)_55%,white))]",
          barClassName,
        )}
        initial={reduce ? false : { width: 0 }}
        animate={{ width }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/** Illustrated, animated empty state. */
export function EmptyState({
  icon,
  title,
  hint,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center",
        className,
      )}
    >
      <motion.div
        className="grid h-16 w-16 place-items-center rounded-full bg-active-soft text-active"
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {icon}
      </motion.div>
      <div>
        <p className="font-semibold">{title}</p>
        {hint && <p className="text-sm text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

/** Shimmering skeleton block. */
export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg bg-muted", className)} />;
}

export function CardSkeletonGrid({ count = 6, height = "h-40" }: { count?: number; height?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className={height} />
      ))}
    </div>
  );
}
