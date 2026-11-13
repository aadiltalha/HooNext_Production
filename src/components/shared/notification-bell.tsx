import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellRing, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { useNotifications, type Audience } from "@/hooks/use-notifications";
import {
  desktopEnabled,
  desktopSupported,
  disableDesktopAlerts,
  enableDesktopAlerts,
  playChime,
  setSoundEnabled,
  soundEnabled,
} from "@/lib/notification-prefs";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationBell({ audience = "user" }: { audience?: Audience }) {
  const { items, unread, markAll, markOne } = useNotifications(audience);

  // Preferences live in localStorage; read them after mount (SSR-safe).
  const [desktop, setDesktop] = useState(false);
  const [sound, setSound] = useState(false);
  useEffect(() => {
    setDesktop(desktopEnabled());
    setSound(soundEnabled());
  }, []);

  const toggleDesktop = async () => {
    if (desktop) {
      disableDesktopAlerts();
      setDesktop(false);
      return;
    }
    const result = await enableDesktopAlerts();
    if (result === "enabled") {
      setDesktop(true);
      toast.success(
        "Desktop alerts on — you'll be notified even when this tab is in the background.",
      );
    } else if (result === "denied") {
      toast.error(
        "Your browser blocked notifications. Allow them in the site settings (lock icon) and try again.",
      );
    } else {
      toast.error("This browser doesn't support desktop notifications.");
    }
  };

  const toggleSound = () => {
    const next = !sound;
    setSoundEnabled(next);
    setSound(next);
    if (next) playChime(); // preview
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-violet))] text-[10px] font-semibold text-background flex items-center justify-center px-1 animate-pulse">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
          <div className="text-sm font-semibold">Notifications</div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSound}
              aria-label={sound ? "Mute notification sound" : "Play a sound for new notifications"}
              title={sound ? "Sound on" : "Sound off"}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              {sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            {desktopSupported() && (
              <button
                onClick={toggleDesktop}
                aria-label={desktop ? "Turn off desktop alerts" : "Turn on desktop alerts"}
                title={desktop ? "Desktop alerts on" : "Desktop alerts off"}
                className={cn(
                  "rounded p-1 hover:text-foreground",
                  desktop ? "text-primary" : "text-muted-foreground",
                )}
              >
                <BellRing className="h-3.5 w-3.5" />
              </button>
            )}
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="ml-1 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            items.map((n) => {
              const content = (
                <div
                  className={cn(
                    "px-3 py-2.5 border-b border-border/40 last:border-b-0 hover:bg-accent/40 transition-colors",
                    !n.read_at && "bg-primary/5",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                        n.read_at ? "bg-transparent" : "bg-primary",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-tight">{n.title}</div>
                      {n.body && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {formatDate(n.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
              return n.url ? (
                <Link
                  key={n.id}
                  to={n.url as any}
                  onClick={() => markOne.mutate(n.id)}
                  className="block"
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={n.id}
                  onClick={() => markOne.mutate(n.id)}
                  className="block w-full text-left"
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
