// Public base URL of the site, used for absolute links in emails and social
// previews. Set VITE_SITE_URL (e.g. https://hoonext.online) in your environment.
// Works in the browser (import.meta.env) and on the server (process.env).
const fromEnv =
  (typeof process !== "undefined" ? process.env?.VITE_SITE_URL || process.env?.SITE_URL : undefined) ||
  (import.meta.env?.VITE_SITE_URL as string | undefined);

export const SITE_URL = (fromEnv || "https://hoonext.online").replace(/\/+$/, "");
