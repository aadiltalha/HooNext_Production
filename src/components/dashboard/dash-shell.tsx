import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { LogOut, ShieldCheck, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { NotificationBell } from "@/components/shared/notification-bell";
import { RealtimeSync } from "@/components/shared/realtime-sync";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";

export interface NavItem {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/** Unread-count pill shown on a sidebar item. */
function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-violet))] px-1.5 text-[10px] font-semibold leading-none text-background">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}

function SidebarContent({
  nav,
  badges,
  brandHref,
  brandLabel,
  pathname,
  isAdmin,
  isAdminShell,
  onNavigate,
  onSignOut,
}: {
  nav: NavItem[];
  badges: Record<string, number>;
  brandHref: string;
  brandLabel: string;
  pathname: string;
  isAdmin: boolean;
  isAdminShell: boolean;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center" onClick={onNavigate}>
          <img src="/logo/hoonext-logo-desktop.png" alt="HooNext" className="h-9 w-auto" />
        </Link>
      </div>
      <div className="px-6 pt-5 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
        {brandLabel}
      </div>
      <nav className="px-3 space-y-0.5">
        {nav.map((n) => {
          const active = pathname === n.to || (n.to !== brandHref && pathname.startsWith(n.to));
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-r before:bg-gradient-to-b before:from-[var(--brand-cyan)] before:to-[var(--brand-violet)]"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              {n.icon && <n.icon className={cn("h-4 w-4", active && "text-primary")} />}
              {n.label}
              <NavBadge count={badges[n.to] ?? 0} />
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-3 space-y-1 border-t border-sidebar-border/60">
        {isAdmin && !isAdminShell && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ShieldCheck className="h-4 w-4" /> Admin
          </Link>
        )}
        {isAdmin && isAdminShell && (
          <Link
            to="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Customer view
          </Link>
        )}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );
}

export function DashShell({
  title,
  nav,
  children,
  brandHref = "/dashboard",
  brandLabel = "Customer",
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
  brandHref?: string;
  brandLabel?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, isAdmin, profile, clientCode } = useAuth();
  const navigate = useNavigate();
  const isAdminShell = brandHref === "/admin";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Unread notifications per sidebar item (see use-nav-badges).
  const navPaths = useMemo(() => nav.map((n) => n.to), [nav]);
  const { counts: badges, total: totalUnread } = useNavBadges({
    audience: isAdminShell ? "admin" : "user",
    navPaths,
    homePath: brandHref,
    notificationsPath: `${brandHref}/notifications`,
    pathname,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <RealtimeSync audience={isAdminShell ? "admin" : "user"} />
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarContent
          nav={nav}
          badges={badges}
          brandHref={brandHref}
          brandLabel={brandLabel}
          pathname={pathname}
          isAdmin={isAdmin}
          isAdminShell={isAdminShell}
          onSignOut={handleSignOut}
        />
      </aside>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border"
        >
          <SidebarContent
            nav={nav}
            badges={badges}
            brandHref={brandHref}
            brandLabel={brandLabel}
            pathname={pathname}
            isAdmin={isAdmin}
            isAdminShell={isAdminShell}
            onSignOut={handleSignOut}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border/60 flex items-center justify-between gap-4 px-4 sm:px-6 md:px-10 bg-background/70 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="relative md:hidden -ml-1.5 inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
              aria-label={
                totalUnread > 0 ? "Open navigation (you have unread notifications)" : "Open navigation"
              }
            >
              <Menu className="h-5 w-5" />
              {totalUnread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-violet))] ring-2 ring-background"
                />
              )}
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5 hidden sm:block">
                {isAdminShell ? "Admin workspace" : "Client workspace"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isAdminShell && clientCode && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 backdrop-blur-sm px-3 py-1.5 text-[11px]">
                <span className="text-muted-foreground">Client ID</span>
                <span className="font-mono font-semibold text-foreground">{clientCode}</span>
              </div>
            )}
            {profile?.full_name && (
              <div className="hidden md:block text-right leading-tight">
                <div className="text-[12.5px] font-medium truncate max-w-[180px]">
                  {profile.full_name}
                </div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                  {profile.email}
                </div>
              </div>
            )}
            <NotificationBell audience={isAdminShell ? "admin" : "user"} />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}