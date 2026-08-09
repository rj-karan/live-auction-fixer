import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Shield, MapPin, CalendarDays, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { HeroBackdrop, SpinningBall } from "@/components/sports/hero-backdrop";
import { useBrandAsset } from "@/lib/branding";
import { Reveal, LiftCard, EmptyState, Shimmer } from "@/components/sports/motion-bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AuctionHub — Live Cricket Auction Platform" },
      {
        name: "description",
        content:
          "Follow live cricket auctions: tournaments, team purses, squads and every final purchase in real time.",
      },
      { property: "og:title", content: "AuctionHub — Live Cricket Auction Platform" },
      {
        property: "og:description",
        content:
          "Follow live cricket auctions: tournaments, team purses, squads and every final purchase in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

type Tournament = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  status: string;
  tournament_date: string | null;
};

function Landing() {
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);
  useEffect(() => {
    supabase
      .from("tournaments")
      .select("id,name,slug,location,status,tournament_date")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTournaments((data ?? []) as Tournament[]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 font-black text-lg tracking-tight">
            <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-active text-active-foreground">
              {siteLogo ? (
                <img src={siteLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-4.5 w-4.5" />
              )}
            </span>
            AuctionHub
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm">
              <Shield className="mr-2 h-4 w-4" />
              Admin Login
            </Button>
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b text-primary-foreground">
        <HeroBackdrop variant="stadium" assetKey="headerBg" className="absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-active/50 bg-active/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-active">
              <Radio className="h-3 w-3" />
              Live auction coverage
            </span>
            <h1 className="mt-5 text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]">
              The auction happens on the floor.
              <br />
              <span className="text-active">We broadcast every hammer.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base opacity-85">
              Purses, squads and final purchase prices update the second the admin
              records them — no refresh, no login.
            </p>
            <div className="mt-8 flex justify-center">
              <SpinningBall className="h-12 w-12" />
            </div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <Reveal>
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-active opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-active" />
            </span>
            Live Tournaments
          </h2>
        </Reveal>

        {tournaments === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} className="h-36" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-7 w-7" />}
            title="No tournaments yet"
            hint="Admins can create one from the dashboard."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t, i) => (
              <Link key={t.id} to="/tournament/$slug" params={{ slug: t.slug }} className="group">
                <LiftCard delay={i * 0.06}>
                  <Card className="glass-card h-full transition-colors group-hover:border-active">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 group-hover:text-active">
                        <Trophy className="h-5 w-5 text-active" />
                        {t.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {t.location ?? "—"}
                      </div>
                      {t.tournament_date && (
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(t.tournament_date).toLocaleDateString()}
                        </div>
                      )}
                      <span className="inline-flex items-center rounded-full bg-active-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-active-foreground">
                        {t.status}
                      </span>
                    </CardContent>
                  </Card>
                </LiftCard>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
