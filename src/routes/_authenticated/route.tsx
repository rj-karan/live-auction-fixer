import {
  createFileRoute,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

function AuthGate() {
  const { session, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!session || !isAdmin) {
      navigate({ to: "/auth" });
    }
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
