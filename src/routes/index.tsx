import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Auction Platform — Physical Auction Manager" },
      {
        name: "description",
        content:
          "Manage tournaments, teams, players and record physical auction results in real time.",
      },
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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  useEffect(() => {
    supabase
      .from("tournaments")
      .select("id,name,slug,location,status,tournament_date")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTournaments((data ?? []) as Tournament[]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Trophy className="h-6 w-6" />
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

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Physical Auction Management
          </h1>
          <p className="mt-3 text-muted-foreground">
            The auction happens in person — this platform records results and
            keeps viewers updated live.
          </p>
        </div>

        <h2 className="mb-4 text-xl font-semibold">Live Tournaments</h2>
        {tournaments.length === 0 ? (
          <p className="text-muted-foreground">
            No tournaments yet. Admins can create one from the dashboard.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                to="/tournament/$slug"
                params={{ slug: t.slug }}
              >
                <Card className="transition hover:border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {t.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {t.location ?? "—"} · {t.status}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
