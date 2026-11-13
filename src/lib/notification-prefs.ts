// Browser-side notification preferences and alert helpers. No React here so the
// logic stays small and easy to test.

const DESKTOP_KEY = "hoonext_notif_desktop";
const SOUND_KEY = "hoonext_notif_sound";

const read = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};
const write = (key: string, on: boolean) => {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
};

export const desktopSupported = () => typeof window !== "undefined" && "Notification" in window;

/** True only if the user opted in AND the browser permission is granted. */
export const desktopEnabled = () =>
  desktopSupported() && Notification.permission === "granted" && read(DESKTOP_KEY);

export const soundEnabled = () => read(SOUND_KEY);
export const setSoundEnabled = (on: boolean) => write(SOUND_KEY, on);

/**
 * Asks the browser for permission (must be called from a click) and remembers
 * the choice. Returns whether desktop alerts are now on.
 */
export async function enableDesktopAlerts(): Promise<"enabled" | "denied" | "unsupported"> {
  if (!desktopSupported()) return "unsupported";
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    write(DESKTOP_KEY, false);
    return "denied";
  }
  write(DESKTOP_KEY, true);
  return "enabled";
}
export const disableDesktopAlerts = () => write(DESKTOP_KEY, false);

/** Short two-tone chime generated with WebAudio (no audio file needed). */
export function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1175, t + 0.09);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
    osc.onended = () => ctx.close().catch(() => undefined);
  } catch {
    /* audio blocked until the user interacts — ignore */
  }
}

export interface DesktopNote {
  id: string;
  title: string;
  body?: string | null;
  url?: string | null;
}

/**
 * Shows an operating-system notification, but only when the user is NOT
 * looking at the page (a toast already covers the in-focus case).
 */
export function showDesktopNotification(n: DesktopNote, onOpen: (url: string | null) => void) {
  if (!desktopEnabled()) return false;
  if (typeof document !== "undefined" && !document.hidden && document.hasFocus()) return false;
  try {
    const note = new Notification(n.title, {
      body: n.body ?? "",
      icon: "/favicon.png",
      tag: n.id, // the same notification never shows twice
    });
    note.onclick = () => {
      window.focus();
      onOpen(n.url ?? null);
      note.close();
    };
    return true;
  } catch {
    return false;
  }
}
