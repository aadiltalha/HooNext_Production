// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_* to import.meta.env. Server functions read
  // process.env, so load the full .env into process.env for dev/preview.
  // Real environment variables (hosting dashboard) always win.
  //
  // IMPORTANT: when .env changes, Vite restarts the server inside the SAME Node
  // process. The old code only set a key if it was undefined, so after the first
  // load every later .env edit was silently ignored (old/placeholder API key
  // kept being sent -> "Authentication header ... incorrectly formatted").
  // We now remember which keys WE injected and refresh those on every reload.
  const g = globalThis as { __envInjectedByVite?: Set<string> };
  const injected = (g.__envInjectedByVite ??= new Set<string>());
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, raw] of Object.entries(env)) {
    // Trim spaces/CR and surrounding quotes: a stray space or quote in a key
    // makes the "Authorization: Bearer ..." header malformed.
    const value = raw.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
    if (process.env[key] === undefined || injected.has(key)) {
      process.env[key] = value;
      injected.add(key);
    }
  }

  return {
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart({
        server: { entry: "src/server.ts" },
      }),
      nitro({
        routeRules: {
          // Safe, widely-supported hardening headers for every response.
          // (No Content-Security-Policy on purpose: Razorpay's checkout, Supabase,
          // Google Fonts and inline styles need a carefully tuned policy, and a
          // wrong one would silently break payments.)
          "/**": {
            headers: {
              "X-Content-Type-Options": "nosniff",
              "Referrer-Policy": "strict-origin-when-cross-origin",
              "X-Frame-Options": "SAMEORIGIN",
              "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
              "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            },
          },
        },
      }),
      react(),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
      dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
    },
    server: { port: 3000, host: true },
  };
});