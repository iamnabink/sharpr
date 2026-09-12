"use client";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/format";

/* ---------- Button ---------- */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";
const variantCls: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:opacity-90 dark:bg-fg dark:text-bg",
  secondary: "bg-muted text-fg hover:bg-hover",
  outline: "border border-border-strong bg-elev text-fg hover:bg-hover",
  ghost: "text-fg-muted hover:bg-hover hover:text-fg",
  danger: "bg-danger-soft text-danger hover:opacity-90",
};
const sizeCls: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
};
const base =
  "inline-flex items-center justify-center font-medium whitespace-nowrap transition-[background,opacity,transform] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40 select-none";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
}
export function Button({ variant = "secondary", size = "md", href, className, children, ...rest }: ButtonProps) {
  const cls = cn(base, variantCls[variant], sizeCls[size], className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

/* ---------- Accent button (single-use CTA) ---------- */
export function AccentButton({ className, size = "lg", ...rest }: ButtonProps) {
  return <Button {...rest} size={size} className={cn("bg-accent text-accent-fg hover:opacity-90", className)} variant="primary" />;
}

/* ---------- Card ---------- */
export function Card({ className, children, as: Tag = "div", ...rest }: React.HTMLAttributes<HTMLDivElement> & { as?: "div" | "section" | "article" }) {
  return (
    <Tag className={cn("rounded-2xl border bg-elev shadow-card", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn("block rounded-2xl border bg-elev shadow-card transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent/40", className)}
    >
      {children}
    </Link>
  );
}

/* ---------- Badge ---------- */
type Tone = "neutral" | "accent" | "success" | "warn" | "danger";
const toneCls: Record<Tone, string> = {
  neutral: "bg-muted text-fg-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};
export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 tracking-wide", toneCls[tone], className)}>{children}</span>;
}

export function difficultyTone(d: string): Tone {
  switch (d) {
    case "beginner":
      return "success";
    case "intermediate":
      return "neutral";
    case "advanced":
      return "warn";
    case "expert":
      return "danger";
    default:
      return "neutral";
  }
}

/* ---------- Inputs ---------- */
const fieldCls =
  "w-full rounded-xl border bg-elev px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-border-strong transition";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(fieldCls, "h-10", className)} {...rest} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(fieldCls, "min-h-[88px] resize-y leading-relaxed", className)} {...rest} />;
});

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldCls, "h-10 appearance-none pr-8 bg-no-repeat bg-[right_0.6rem_center] bg-[length:14px]", className)} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")" }} {...rest}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-fg-muted">{hint}</span>}
    </label>
  );
}

export function Checkbox({ label, checked, onChange, className }: { label: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-hover", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-border-strong accent-[var(--accent)]" />
      <span>{label}</span>
    </label>
  );
}

/* ---------- Chip (toggle) ---------- */
export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
        active ? "border-fg bg-fg text-bg" : "border-border bg-elev text-fg-muted hover:bg-hover hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-faint">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-fg-muted">{children}</h2>
      {action}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function Empty({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">{description}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* ---------- Stat ---------- */
export function Stat({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-elev p-4 shadow-card", className)}>
      <div className="text-xs font-medium text-fg-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-fg-faint">{sub}</div>}
    </div>
  );
}

/* ---------- Progress bar ---------- */
export function Progress({ value, className, tone = "accent" }: { value: number; className?: string; tone?: "accent" | "success" | "neutral" }) {
  const color = tone === "success" ? "bg-success" : tone === "neutral" ? "bg-fg-faint" : "bg-accent";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        className={cn("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-elev p-5 shadow-pop animate-fade-up sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[]; className?: string }) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto rounded-xl bg-muted p-1", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors",
            value === it.value ? "bg-elev text-fg shadow-card" : "text-fg-muted hover:text-fg",
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="text-[11px] text-fg-faint tabular-nums">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Kbd ---------- */
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">{children}</kbd>;
}

/* ---------- Toast (very small) ---------- */
type Toast = { id: number; text: string; tone?: Tone };
const ToastCtx = React.createContext<{ push: (text: string, tone?: Tone) => void }>({ push: () => {} });
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((text: string, tone: Tone = "neutral") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className={cn("animate-fade-up rounded-xl border bg-elev px-4 py-2 text-sm shadow-pop", t.tone === "success" && "border-success/30", t.tone === "danger" && "border-danger/30")}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => React.useContext(ToastCtx);
