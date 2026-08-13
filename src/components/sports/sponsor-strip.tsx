import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExternalLink, Handshake } from "lucide-react";

type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
};

/** Public sponsor block: static for 1 sponsor, auto-rotating carousel for 2+. */
export function SponsorStrip({ tournamentId }: { tournamentId: string }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

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
      .channel(`sponsors-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sponsors" },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [tournamentId]);

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
      className="space-y-3"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="heading-chaingpt">
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Sponsors
        </h2>
      </div>
      <Card className="corner-frame glass-card overflow-hidden">
        <CardContent className="p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={current?.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SponsorCard sponsor={current} />
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
                "h-1.5 w-1.5 rounded-full transition-colors",
                i === index % count ? "bg-active" : "bg-border",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SponsorCard({ sponsor }: { sponsor?: Sponsor }) {
  if (!sponsor) return null;
  const body = (
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
  );

  return sponsor.website_url ? (
    <a
      href={sponsor.website_url}
      target="_blank"
      rel="noreferrer noopener"
      className="block cursor-pointer transition-colors hover:bg-muted/40"
    >
      {body}
    </a>
  ) : (
    body
  );
}
