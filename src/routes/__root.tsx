import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  type ErrorComponentProps,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { SITE_URL } from "@/lib/site-url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { RouteProgress } from "@/components/shared/route-progress";
import { NotFoundPage } from "@/components/shared/not-found-page";
import { Analytics } from "@vercel/analytics/react"

// Absolute URL is required for social previews (set VITE_SITE_URL).
const OG_IMAGE = `${SITE_URL}/logo/hoonext-logo-desktop.png`;

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HooNext — The marketplace for premium business websites" },
      {
        name: "description",
        content:
          "Buy professionally designed business websites. Roofing, cleaning, plumbing, and more. Own it once or subscribe monthly.",
      },
      { property: "og:title", content: "HooNext — The marketplace for premium business websites" },
      {
        property: "og:description",
        content:
          "Buy professionally designed business websites. Roofing, cleaning, plumbing, and more. Own it once or subscribe monthly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HooNext — The marketplace for premium business websites" },
      {
        name: "twitter:description",
        content:
          "Buy professionally designed business websites. Roofing, cleaning, plumbing, and more. Own it once or subscribe monthly.",
      },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },

      { rel: "stylesheet", href: appCss },

      // Razorpay: open connections early so the checkout form appears sooner.
      { rel: "preconnect", href: "https://checkout.razorpay.com", crossOrigin: "" },
      { rel: "preconnect", href: "https://api.razorpay.com", crossOrigin: "" },

      { rel: "preconnect", href: "https://fonts.googleapis.com" },

      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "",
      },

      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouteProgress />
        <Outlet />
        <Toaster />
        <Analytics />
      </AuthProvider>
    </QueryClientProvider>
  );
}