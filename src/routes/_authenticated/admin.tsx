import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useBrandAsset } from "@/lib/branding";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCircle,
  Gavel,
  History,
  ExternalLink,
  LogOut,
  KeyRound,
  Settings,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Tournaments", url: "/admin/tournaments", icon: Trophy },
  { title: "Teams", url: "/admin/teams", icon: Users },
  { title: "Players", url: "/admin/players", icon: UserCircle },
  { title: "Live Auction Entry", url: "/admin/auction", icon: Gavel },
  { title: "Transactions", url: "/admin/transactions", icon: History },
  { title: "Sponsors", url: "/admin/sponsors", icon: Handshake },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function AdminLayout() {
  const brandedAdminLogo = useBrandAsset("adminLogo");
  const siteLogo = useBrandAsset("siteLogo");
  const adminLogo = brandedAdminLogo || siteLogo;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-2 font-semibold">
              {adminLogo ? (
                <img src={adminLogo} alt="" className="h-5 w-5 rounded object-cover" />
              ) : (
                <Trophy className="h-5 w-5" />
              )}{" "}
              AuctionHub
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((it) => {
                    const active = it.exact
                      ? pathname === it.url
                      : pathname.startsWith(it.url);
                    return (
                      <SidebarMenuItem key={it.url}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link to={it.url as never}>
                            <it.icon className="h-4 w-4" />
                            <span>{it.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              asChild
            >
              <Link to="/change-password">
                <KeyRound className="mr-2 h-4 w-4" /> Change password
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
            <Link to="/" className="text-xs text-muted-foreground px-2 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Public site
            </Link>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-2 border-b px-2">
            <SidebarTrigger />
            <div className="ml-auto pr-2">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
