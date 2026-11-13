import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PageLoader } from "@/components/shared/page-loader";

export const getRouter = () => {
  // Cache query results briefly so navigating between pages doesn't refetch
  // everything every time; pages that need live data set their own
  // refetchInterval.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Start loading a page's code as soon as the user hovers/touches its link.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    // While a page's code or data is loading: show nothing for the first 150ms
    // (fast navigations stay clean), then a skeleton that stays at least 250ms
    // so it never flashes.
    defaultPendingMs: 150,
    defaultPendingMinMs: 250,
    defaultPendingComponent: () => <PageLoader message="Loading" />,
  });

  return router;
};
