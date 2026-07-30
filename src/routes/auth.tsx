import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Admin Login — AuctionHub" }] }),
  component: AuthPage,
});

const ADMIN_EMAIL = "admin@auction.local";

function mustChangePassword(user: { user_metadata?: Record<string, unknown> } | null | undefined) {
  const md = user?.user_metadata ?? {};
  if (md.must_change_password === true) return true;
  // Legacy accounts without a recorded change are treated as requiring one.
  if (md.password_changed_at == null && md.must_change_password !== false) return true;
  return false;
}

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Ensure the default admin exists.
    fetch("/api/public/bootstrap-admin", { method: "POST" }).catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: mustChangePassword(data.session.user) ? "/change-password" : "/admin" });
      }
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const u = username.trim().toLowerCase();
    const email = u.includes("@") ? u : `${u}@auction.local`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
    navigate({ to: mustChangePassword(data.user) ? "/change-password" : "/admin" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Admin Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="u">Username</Label>
              <Input
                id="u"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="p">Password</Label>
              <Input
                id="p"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
