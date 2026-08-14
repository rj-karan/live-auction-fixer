import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
  errorComponent: AdminError,
});

function AdminError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-bold uppercase tracking-[0.12em]">
        Admin didn&apos;t load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error?.message || "Something interrupted the admin panel."}
      </p>
      <Button onClick={() => router.invalidate()}>Retry</Button>
    </div>
  );
}


function AuthGate() {
  const { session, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!session || !isAdmin) {
      navigate({ to: "/auth" });
      return;
    }
    const md = (session.user.user_metadata ?? {}) as Record<string, unknown>;
    const mustChange =
      md.must_change_password === true ||
      (md.password_changed_at == null && md.must_change_password !== false);
    if (mustChange) navigate({ to: "/change-password" });
  }, [loading, session, isAdmin, navigate]);
  if (loading || !session || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Checking access…
      </div>
    );
  }
  return <Outlet />;
}
