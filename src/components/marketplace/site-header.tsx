import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { LayoutDashboard, LogOut, ShieldCheck, Globe, MessageSquare, IdCard, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/shared/notification-bell";
import { useState } from "react";

function BrandMark() {
  return (
    <Link to="/" className="flex items-center">
      <img
        src="/logo/hoonext-logo-mobile.png"
        alt="HooNext"
        className="h-9 w-9 rounded-lg md:hidden"
      />
      <img
        src="/logo/hoonext-logo-desktop.png"
        alt="HooNext"
        className="hidden md:block h-10 w-auto"
      />
    </Link>
  );
}

function initialsOf(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "U";
}

function UserMenu() {
  const { user, isAdmin, signOut, profile, clientCode } = useAuth();
  const navigate = useNavigate();

  const { data: sitesCount = 0 } = useQuery({
    queryKey: ["sites-count", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("customer_sites").select("*", { count: "exact", head: true }).eq("user_id", user!.id)).count ?? 0,
  });

  if (!user) return null;
  const name = profile?.full_name || user.email?.split("@")[0] || "You";
  const email = profile?.email || user.email || "";

  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-full border border-border/70 bg-card/60 backdrop-blur-sm pl-1 pr-3 py-1 hover:border-primary/40 transition-colors">
          <div className="h-7 w-7 rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-violet))] flex items-center justify-center text-[11px] font-semibold text-background">
            {initialsOf(name)}
          </div>
          <div className="text-left hidden sm:block leading-tight">
            <div className="text-[12.5px] font-medium truncate max-w-[160px]">{name}</div>
            <div className="text-[10px] text-muted-foreground truncate max-w-[160px] flex items-center gap-1">
              {clientCode ? <span className="font-mono">{clientCode}</span> : `${sitesCount} website${sitesCount === 1 ? "" : "s"}`}
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="font-semibold">{name}</span>
          <span className="text-xs text-muted-foreground font-normal truncate">{email}</span>
          {clientCode && (
            <span className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-primary/10 text-primary text-[10px] font-mono px-2 py-0.5">
              <IdCard className="h-3 w-3" /> {clientCode}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground font-normal mt-1">{sitesCount} website{sitesCount === 1 ? "" : "s"} · Client account</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/dashboard"><LayoutDashboard className="h-4 w-4 mr-2" /> Client dashboard</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/dashboard/websites"><Globe className="h-4 w-4 mr-2" /> My websites</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/dashboard/support"><MessageSquare className="h-4 w-4 mr-2" /> Messages & support</Link></DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/admin"><ShieldCheck className="h-4 w-4 mr-2" /> Admin dashboard</Link></DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}><LogOut className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const NAV_LINKS = [
  { to: "/marketplace", label: "Marketplace" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

function MobileNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 flex flex-col gap-1 pt-12">
        {NAV_LINKS.map((link) => (
          <SheetClose asChild key={link.to}>
            <Link
              to={link.to}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              {link.label}
            </Link>
          </SheetClose>
        ))}
        {!user && (
          <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4">
            <SheetClose asChild>
              <Button asChild variant="ghost" className="justify-start"><Link to="/auth">Log in</Link></Button>
            </SheetClose>
            <SheetClose asChild>
              <Button asChild className="btn-gradient border-0"><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <BrandMark />
        <nav className="hidden items-center gap-8 md:flex text-sm text-muted-foreground">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-foreground transition-colors">{link.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell audience="user" />
              <UserMenu />
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild size="sm" variant="ghost" className="rounded-full text-muted-foreground hover:text-foreground"><Link to="/auth">Log in</Link></Button>
              <Button asChild size="sm" className="rounded-full btn-gradient border-0"><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
            </div>
          )}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}