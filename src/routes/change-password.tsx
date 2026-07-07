import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/change-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Change Password — AuctionHub" }] }),
  component: ChangePasswordPage,
});

const MIN_LENGTH = 8;

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [required, setRequired] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      const md = (data.session.user.user_metadata ?? {}) as Record<string, unknown>;
      const mustChange =
        md.must_change_password === true ||
        (md.password_changed_at == null && md.must_change_password !== false);
      setRequired(mustChange);
      setReady(true);
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (pw.length < MIN_LENGTH) {
      const m = `Password must be at least ${MIN_LENGTH} characters.`;
      setErrorMsg(m); toast.error(m);
      return;
    }
    if (pw !== confirm) {
      const m = "Passwords do not match.";
      setErrorMsg(m); toast.error(m);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: pw,
      data: {
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
      },
    });
    setBusy(false);
    if (error) {
      const msg = /weak|pwned|leaked/i.test(error.message)
        ? "This password appears in known data breaches. Please choose a stronger, unique password."
        : error.message;
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/admin" });
  };


  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Change Password
          </CardTitle>
          {required && (
            <p className="text-sm text-muted-foreground">
              For security, please choose a new password before continuing.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new">New password</Label>
              <Input
                id="new"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_LENGTH}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum {MIN_LENGTH} characters.
              </p>
            </div>
            <div>
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_LENGTH}
                required
              />
            </div>
            {errorMsg && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {errorMsg}
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full">

              {busy ? "Updating…" : "Update password"}
            </Button>
            {!required && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate({ to: "/admin" })}
              >
                Cancel
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
