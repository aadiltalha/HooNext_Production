import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { Home, Search } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center">
        <div className="container-page py-24 text-center max-w-lg">
          <div className="text-6xl font-black text-primary/30">404</div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Page not found</h1>
          <p className="mt-3 text-muted-foreground">
            The page you're looking for may have been moved, renamed, or doesn't exist.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Home className="h-4 w-4" /> Back to home
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-semibold hover:border-primary/40 transition-colors"
            >
              <Search className="h-4 w-4" /> Browse templates
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
