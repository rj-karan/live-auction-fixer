import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useActiveTournament } from "@/hooks/use-active-tournament";
import { formatMoney } from "@/lib/format";
import { useBrandAsset } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Undo2, Gavel, User, Trophy, Flame, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/auction")({
  component: AuctionPage,
});

type BidEntry = { id: number; amount: number; teamId: string | null; teamName: string };

function AuctionPage() {
  const { tournament } = useActiveTournament();
  const reduce = useReducedMotion();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [increment, setIncrement] = useState("100");
  const [startingBid, setStartingBid] = useState("");
  const [history, setHistory] = useState<BidEntry[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const holdLive = useRef(false);
  const placeholderPhoto = useBrandAsset("playerPlaceholder");
  const defaultPhoto = useBrandAsset("playerPhoto");
  const defaultTeamLogo = useBrandAsset("teamLogo");

  const load = async () => {
    if (!tournament) return;
    const [p, t, e] = await Promise.all([
      supabase.from("players").select("*").eq("tournament_id", tournament.id).order("name"),
      supabase.from("teams").select("*").eq("tournament_id", tournament.id).order("name"),
      supabase
        .from("auction_events")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);
    setPlayers(p.data ?? []);
    setTeams(t.data ?? []);
    setEvents(e.data ?? []);
  };
  useEffect(() => {
    load();
    if (!tournament) return;
    const ch = supabase
      .channel(`auction-${tournament.id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournament?.id]);

  // Publish the live auction board for public spectators (display only).
  const publishLive = async (patch: Record<string, any>) => {
    if (!tournament) return;
    await supabase
      .from("live_auction")
      .upsert(
        { tournament_id: tournament.id, updated_at: new Date().toISOString(), ...patch },
        { onConflict: "tournament_id" },
      );
  };

  useEffect(() => {
    if (!tournament || holdLive.current) return;
    if (!selectedPlayer) {
      publishLive({ player_id: null, team_id: null, current_bid: null, status: "idle", round: null });
      return;
    }
    const p = players.find((x) => x.id === selectedPlayer);
    const t = setTimeout(() => {
      publishLive({
        player_id: selectedPlayer,
        team_id: selectedTeam,
        current_bid: price ? Number(price) : null,
        status: "live",
        round: p?.auction_round ?? 1,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [tournament?.id, selectedPlayer, selectedTeam, price]);

  const c = tournament?.currency ?? "₹";
  const available = players.filter((p) => p.status === "available");
  const filtered = available.filter((p) =>
    q ? p.name.toLowerCase().includes(q.toLowerCase()) : true,
  );
  const current = players.find((p) => p.id === selectedPlayer);
  const currentTeam = teams.find((t) => t.id === selectedTeam) ?? null;
  const incrementValue = Math.max(1, Number(increment) || 100);
  const bidValue = price ? Number(price) : null;

  // Reset the bid ladder whenever a new player comes on the block.
  useEffect(() => {
    if (!current) {
      setPrice("");
      setStartingBid("");
      setHistory([]);
      return;
    }
    const base = current.base_price != null ? String(Number(current.base_price)) : "";
    setStartingBid(base);
    setPrice(base);
    setSelectedTeam(null);
    setHistory([]);
  }, [selectedPlayer]);

  const pushBid = useCallback(
    (amount: number, teamId: string | null, teamName: string) => {
      setPrice(String(amount));
      setFlash(amount);
      setHistory((h) => [{ id: Date.now() + Math.random(), amount, teamId, teamName }, ...h].slice(0, 25));
    },
    [],
  );

  useEffect(() => {
    if (flash == null) return;
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }, [flash]);

  const raiseBid = useCallback(
    (step: number) => {
      if (!current) return;
      const start = startingBid ? Number(startingBid) : 0;
      const base = bidValue != null ? bidValue : start;
      const next = bidValue == null ? Math.max(start, step) : base + step;
      if (currentTeam && Number(currentTeam.remaining_purse) < next) {
        toast.error(`${currentTeam.name} does not have enough purse for ${formatMoney(next, c)}`);
        return;
      }
      pushBid(next, currentTeam?.id ?? null, currentTeam?.name ?? "—");
    },
    [current, bidValue, startingBid, currentTeam, c, pushBid],
  );

  const pickTeam = useCallback(
    (team: any) => {
      if (!team || !current) return;
      const amount = bidValue ?? (startingBid ? Number(startingBid) : 0);
      if (Number(team.remaining_purse) < amount) {
        toast.error(`${team.name} cannot cover ${formatMoney(amount, c)}`);
        return;
      }
      setSelectedTeam(team.id);
      setHistory((h) =>
        amount > 0
          ? [{ id: Date.now() + Math.random(), amount, teamId: team.id, teamName: team.name }, ...h].slice(0, 25)
          : h,
      );
    },
    [current, bidValue, startingBid, c],
  );

  const clearLiveSoon = () => {
    holdLive.current = true;
    setTimeout(() => {
      holdLive.current = false;
      publishLive({ player_id: null, team_id: null, current_bid: null, status: "idle", round: null });
    }, 7000);
  };

  const confirmSale = async () => {
    if (!selectedPlayer || !selectedTeam || !price) {
      toast.error("Select player, team, and enter price");
      return;
    }
    setBusy(true);
    const soldPlayer = selectedPlayer;
    const soldTeam = selectedTeam;
    const soldPrice = Number(price);
    const { error } = await supabase.rpc("confirm_player_sale", {
      p_player_id: selectedPlayer,
      p_team_id: selectedTeam,
      p_price: Number(price),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Sale confirmed");
    await publishLive({
      player_id: soldPlayer,
      team_id: soldTeam,
      current_bid: soldPrice,
      status: "sold",
      round: current?.auction_round ?? 1,
    });
    clearLiveSoon();
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setPrice("");
    setHistory([]);
  };

  const markUnsold = async () => {
    if (!selectedPlayer) return;
    setBusy(true);
    const unsoldPlayer = selectedPlayer;
    const { error } = await supabase.rpc("mark_player_unsold", {
      p_player_id: selectedPlayer,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Marked unsold");
    await publishLive({
      player_id: unsoldPlayer,
      team_id: null,
      current_bid: null,
      status: "unsold",
      round: current?.auction_round ?? 1,
    });
    clearLiveSoon();
    setSelectedPlayer(null);
    setHistory([]);
  };

  const undo = async () => {
    if (!tournament) return;
    if (!confirm("Undo the last transaction?")) return;
    setBusy(true);
    const { error } = await supabase.rpc("undo_last_event", {
      p_tournament_id: tournament.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Undone");
  };

  // ---- keyboard console ----------------------------------------------------
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      if (!n) return false;
      const tag = n.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        n.isContentEditable ||
        !!n.closest?.("[role='dialog']")
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        raiseBid(incrementValue);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        void confirmSale();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "u") {
        e.preventDefault();
        void undo();
        return;
      }
      if (k === "m") {
        e.preventDefault();
        void markUnsold();
        return;
      }
      if (e.key === "Escape") {
        setSelectedPlayer(null);
        setSelectedTeam(null);
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const team = teamsRef.current[Number(e.key) - 1];
        if (team) {
          e.preventDefault();
          pickTeam(team);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const quickSteps = useMemo(
    () => [incrementValue, incrementValue * 5, 1000, 2000].filter((v, i, a) => a.indexOf(v) === i),
    [incrementValue],
  );

  if (!tournament)
    return <p className="text-muted-foreground">Create a tournament first.</p>;

  const playerIndex = current ? players.findIndex((p) => p.id === current.id) + 1 : 0;
  const photo = current?.photo_url || defaultPhoto || placeholderPhoto;

  return (
    <div className="space-y-4">
      {/* STATUS BAR */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-active/40 bg-card/70 px-4 py-3 backdrop-blur sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
          <span className="inline-flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
            <motion.span
              className="h-2.5 w-2.5 rounded-full bg-destructive"
              animate={reduce ? undefined : { opacity: [1, 0.25, 1], scale: [1, 1.25, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            Live Auction
          </span>
          <Meta label="Round" value={`${current?.auction_round ?? 1}`} />
          <Meta label="Player" value={`${playerIndex || "—"} / ${players.length}`} />
          <Meta label="Current" value={current?.name ?? "—"} />
          <Meta label="Bid" value={bidValue != null ? formatMoney(bidValue, c) : "—"} accent />
          <Meta label="Leader" value={currentTeam?.name ?? "—"} />
        </div>
        <Button variant="outline" size="sm" onClick={undo} disabled={busy}>
          <Undo2 className="mr-2 h-4 w-4" /> Undo Last
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* LEFT: queue */}
        <Card className="order-4 flex max-h-[calc(100vh-190px)] flex-col overflow-hidden lg:order-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Player Queue ({available.length})</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search players…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 overflow-auto">
            {filtered.map((p) => {
              const active = selectedPlayer === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayer(p.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border px-2 py-1.5 text-left transition-all",
                    active
                      ? "border-active bg-active-soft shadow-[0_0_0_1px_var(--active)]"
                      : "border-transparent hover:border-border hover:bg-accent",
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                    {p.photo_url || defaultPhoto ? (
                      <img src={p.photo_url || defaultPhoto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.role || "—"}
                      {p.base_price ? ` · ${formatMoney(Number(p.base_price), c)}` : ""}
                    </span>
                  </span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    R{p.auction_round ?? 1}
                  </Badge>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground">No players.</p>}
          </CardContent>
        </Card>

        {/* CENTER: live bidding */}
        <div className="order-1 space-y-4 lg:order-none">
          <Card className="relative overflow-hidden border-active/40">
            <AnimatePresence>
              {flash != null && !reduce && (
                <motion.span
                  key={flash}
                  className="pointer-events-none absolute inset-0 z-0 rounded-xl ring-2 ring-active"
                  initial={{ opacity: 0.9, scale: 0.99 }}
                  animate={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
            <CardContent className="relative z-10 p-4 sm:p-5">
              {!current ? (
                <p className="py-10 text-center text-muted-foreground">
                  Select a player from the queue to open bidding.
                </p>
              ) : (
                <div className="flex flex-col gap-5 sm:flex-row">
                  <motion.div
                    key={current.id}
                    initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className="aspect-[4/5] w-full max-w-[200px] shrink-0 self-center overflow-hidden rounded-xl border border-active/50 bg-muted sm:self-start"
                  >
                    {photo ? (
                      <img src={photo} alt={current.name} className="h-full w-full object-cover object-center" />
                    ) : (
                      <div className="grid h-full w-full place-items-center">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-2xl font-black uppercase tracking-tight sm:text-3xl">
                        {current.name}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-active-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-active">
                        <Gavel className="h-3 w-3" /> Bidding Live
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm uppercase tracking-wide text-muted-foreground">
                      {current.role || "—"}
                      {current.player_number ? ` · #${current.player_number}` : ""} · Round{" "}
                      {current.auction_round ?? 1}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Stat label="Base Price" value={formatMoney(Number(current.base_price ?? 0), c)} />
                      <Stat label="Increment" value={formatMoney(incrementValue, c)} />
                      <Stat label="Bids" value={String(history.length)} />
                    </div>

                    <div className="mt-4">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Current Bid
                      </div>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                          key={bidValue ?? "none"}
                          initial={reduce ? false : { scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={reduce ? undefined : { opacity: 0, y: -8 }}
                          transition={{ type: "spring", stiffness: 320, damping: 18 }}
                          className="text-4xl font-black text-active sm:text-5xl"
                        >
                          {bidValue != null ? formatMoney(bidValue, c) : "—"}
                        </motion.div>
                      </AnimatePresence>
                      <div className="mt-1 text-sm">
                        <span className="text-muted-foreground">Highest bidder: </span>
                        <span className="font-bold">{currentTeam?.name ?? "No bids yet"}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {quickSteps.map((s) => (
                        <Button key={s} variant="secondary" size="sm" onClick={() => raiseBid(s)}>
                          +{formatMoney(s, c)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bid ladder controls */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bid Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Starting Bid</Label>
                  <Input
                    type="number"
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                    disabled={!current}
                  />
                </div>
                <div>
                  <Label>Bid Increment</Label>
                  <Input
                    type="number"
                    value={increment}
                    onChange={(e) => setIncrement(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Current Bid</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={!current}
                    className="text-lg font-bold"
                  />
                </div>
              </div>

              {current && (
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sale summary</div>
                  <div className="mt-1 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    <SummaryRow label="Player" value={current.name} />
                    <SummaryRow label="Final Bid" value={bidValue != null ? formatMoney(bidValue, c) : "—"} />
                    <SummaryRow label="Winning Team" value={currentTeam?.name ?? "—"} />
                    <SummaryRow label="Base Price" value={formatMoney(Number(current.base_price ?? 0), c)} />
                    <SummaryRow label="Round" value={`Round ${current.auction_round ?? 1}`} />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={confirmSale} disabled={busy || !current || !selectedTeam || !price}>
                  Confirm Sale
                </Button>
                <Button size="lg" variant="secondary" onClick={markUnsold} disabled={busy || !current}>
                  Mark Unsold
                </Button>
                <Button size="lg" variant="outline" onClick={undo} disabled={busy}>
                  <Undo2 className="mr-2 h-4 w-4" /> Undo Last
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <Key k="Space">Increase bid +{formatMoney(incrementValue, c)}</Key>
                <Key k="Enter">Confirm sale</Key>
                <Key k="M">Mark unsold</Key>
                <Key k="U">Undo last</Key>
                <Key k="Esc">Clear selection</Key>
                <Key k="1–9">Select team</Key>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: teams + history */}
        <div className="order-2 space-y-4 lg:order-none xl:max-h-[calc(100vh-190px)] xl:overflow-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team Bidding</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {teams.map((t, i) => {
                const leading = selectedTeam === t.id;
                const logo = t.logo_url || defaultTeamLogo;
                return (
                  <motion.button
                    key={t.id}
                    onClick={() => pickTeam(t)}
                    disabled={!current}
                    animate={
                      leading && !reduce
                        ? { boxShadow: ["0 0 0 0 var(--active)", "0 0 0 6px transparent"] }
                        : undefined
                    }
                    transition={{ duration: 1.2, repeat: leading ? Infinity : 0 }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all disabled:opacity-40",
                      leading ? "border-active bg-active-soft" : "hover:border-active/40",
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded bg-muted">
                      {logo ? (
                        <img src={logo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="rounded bg-muted px-1.5 text-[10px] font-black">{i + 1}</span>
                        <span className="truncate text-sm font-bold uppercase">{t.short_name || t.name}</span>
                        {leading && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-active px-1.5 py-0.5 text-[9px] font-black uppercase text-active-foreground">
                            <Flame className="h-2.5 w-2.5" /> Leading
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        Purse {formatMoney(Number(t.remaining_purse), c)} · {t.players_purchased_count} players
                      </span>
                    </span>
                    {leading && bidValue != null && (
                      <span className="shrink-0 text-sm font-black text-active">
                        {formatMoney(bidValue, c)}
                      </span>
                    )}
                  </motion.button>
                );
              })}
              {teams.length === 0 && <p className="text-sm text-muted-foreground">No teams yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Live Bid History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <AnimatePresence initial={false}>
                {history.map((h) => (
                  <motion.div
                    key={h.id}
                    initial={reduce ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-between border-b pb-1"
                  >
                    <span className="font-bold text-active">{formatMoney(h.amount, c)}</span>
                    <span className="truncate text-muted-foreground">{h.teamName}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {history.length === 0 && <p className="text-xs text-muted-foreground">No bids yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              {events.map((e) => (
                <div key={e.id} className="flex justify-between border-b pb-1">
                  <span className="truncate">
                    <Badge variant="outline" className="mr-1">
                      {e.event_type.replace("_", " ")}
                    </Badge>
                    {e.player_name_snapshot}
                  </span>
                  <span>{e.price ? formatMoney(Number(e.price), c) : ""}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="min-w-0 text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className={cn("font-bold", accent && "text-active")}>{value}</span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="truncate text-base font-bold">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-semibold">{value}</span>
    </div>
  );
}

function Key({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border px-2 py-1">
      <kbd className="rounded bg-muted px-1.5 font-mono text-[10px] font-bold">{k}</kbd>
      {children}
    </span>
  );
}
