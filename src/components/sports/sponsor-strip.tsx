import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExternalLink, Handshake } from "lucide-react";

export type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
};

/** Shared loader for active sponsors of a tournament (live-updating). */
export function useSponsors(tournamentId: string) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  // Unique per hook instance so two consumers never share one channel topic.
  const channelId = useRef(Math.random().toString(36).slice(2));


  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("sponsors")
        .select("id,name,logo_url,website_url,display_order")
        .eq("tournament_id", tournamentId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (!cancelled) setSponsors((data ?? []) as Sponsor[]);
    };
    load();
    const ch = supabase
      .channel(`sponsors-${tournamentId}-${channelId.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsors" }, load)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [tournamentId]);

  return sponsors;
}

/** Public sponsor block: static for 1 sponsor, auto-rotating carousel for 2+. */
export function SponsorStrip({
  tournamentId,
  variant = "large",
  className,
}: {
  tournamentId: string;
  variant?: "large" | "compact";
  className?: string;
}) {
  const sponsors = useSponsors(tournamentId);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const count = sponsors.length;
  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, 5000);
    return () => clearInterval(t);
  }, [count]);

  const current = useMemo(() => sponsors[index % Math.max(count, 1)], [sponsors, index, count]);

  if (count === 0) return null;

  return (
    <div
      className={cn("flex h-full flex-col gap-3", className)}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="heading-chaingpt">
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Sponsors
        </h2>
      </div>
      <Card className="corner-frame glass-card sponsor-stage flex-1 overflow-hidden border-active/30">
        <CardContent className="relative z-10 flex h-full items-center p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={current?.id}
              className="w-full"
              initial={{ opacity: 0, x: 24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -24, scale: 0.97 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <SponsorCard sponsor={current} variant={variant} />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
      {count > 1 && (
        <div className="flex justify-center gap-1.5">
          {sponsors.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Show ${s.name}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index % count ? "w-5 bg-active" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SponsorCard({
  sponsor,
  variant,
}: {
  sponsor?: Sponsor;
  variant: "large" | "compact";
}) {
  if (!sponsor) return null;

  const body =
    variant === "compact" ? (
      <div className="flex items-center gap-4 p-5">
        <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded bg-muted/40">
          {sponsor.logo_url ? (
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              className="max-h-12 w-full object-contain"
              loading="lazy"
            />
          ) : (
            <Handshake className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide">
          {sponsor.name}
        </span>
        {sponsor.website_url && <ExternalLink className="h-4 w-4 shrink-0 text-active" />}
      </div>
    ) : (
      <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
          Powered by
        </span>
        <div className="light-sweep grid min-h-[7rem] w-full place-items-center rounded-xl border border-active/25 bg-background/40 p-4">
          {sponsor.logo_url ? (
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              className="max-h-28 w-auto max-w-full object-contain drop-shadow-[0_0_24px_color-mix(in_oklab,var(--active)_35%,transparent)]"
              loading="lazy"
            />
          ) : (
            <Handshake className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-black uppercase tracking-wide">{sponsor.name}</div>
          {sponsor.website_url && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-active">
              Visit site <ExternalLink className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    );

  return sponsor.website_url ? (
    <a
      href={sponsor.website_url}
      target="_blank"
      rel="noreferrer noopener"
      className="block cursor-pointer transition-colors hover:bg-muted/30"
    >
      {body}
    </a>
  ) : (
    body
  );
}

/** Broadcast-style sponsor advertisement used inside the SOLD sequence. */
export function SponsorAd({ sponsor }: { sponsor: Sponsor }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="pointer-events-none w-full max-w-xl"
      initial={reduce ? false : { opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, y: -8 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="light-sweep flex min-h-24 items-center justify-center gap-4 rounded-xl border border-active/35 bg-background/75 px-5 py-4 shadow-[0_18px_45px_-28px_var(--active)] sm:min-h-28 sm:px-8">
        <div className="min-w-0 text-center sm:text-left">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Broadcast partner
          </span>
          <span className="mt-1 block max-w-44 truncate text-sm font-black uppercase text-active sm:text-base">
            {sponsor.name}
          </span>
        </div>
        <div className="h-14 w-32 shrink-0 border-l border-active/20 pl-4 sm:h-20 sm:w-48 sm:pl-6">
          {sponsor.logo_url ? (
            <img src={sponsor.logo_url} alt={sponsor.name} className="h-full w-full object-contain" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <Handshake className="h-9 w-9 text-active" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
