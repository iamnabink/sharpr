"use client";
import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/format";

type Theme = "light" | "dark" | "system";
const KEY = "sharpr:theme";
const EVENT = "sharpr:theme-change";

export function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function read(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme) || "system";
  } catch {
    return "system";
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  const set = (t: Theme) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    applyTheme(t);
    window.dispatchEvent(new Event(EVENT));
  };
  const items: { v: Theme; icon: typeof Sun; label: string }[] = [
    { v: "light", icon: Sun, label: "Light" },
    { v: "system", icon: Monitor, label: "System" },
    { v: "dark", icon: Moon, label: "Dark" },
  ];
  return (
    <div className={cn("flex rounded-lg bg-muted p-0.5", compact ? "" : "w-full")}>
      {items.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          title={label}
          onClick={() => set(v)}
          className={cn("flex h-7 flex-1 items-center justify-center rounded-md transition-colors", theme === v ? "bg-elev text-fg shadow-card" : "text-fg-faint hover:text-fg")}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
