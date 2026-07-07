import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Tournament = {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  default_purse: number;
};

// Returns the most recently created tournament as the "active" one for the admin.
export function useActiveTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id,name,slug,status,currency,default_purse")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setTournament((data as Tournament) ?? null);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("active-tournament")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
  return { tournament, loading };
}
