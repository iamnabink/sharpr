export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  if (r === 0) return `${m} min`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function formatMinutes(seconds: number): string {
  const m = seconds / 60;
  if (m < 1) return `${Math.round(seconds)}s`;
  if (m < 10) return `${m.toFixed(1).replace(/\.0$/, "")} min`;
  return `${Math.round(m)} min`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(ts).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startThat - startToday) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${-diff} days ago`;
  if (diff < 7) return `In ${diff} days`;
  return formatDate(ts);
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function startOfDay(ts = Date.now()): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function startOfWeek(ts = Date.now()): number {
  const d = new Date(startOfDay(ts));
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return d.getTime() - day * 86_400_000;
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function pluralize(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function cn(...parts: Array<string | number | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
