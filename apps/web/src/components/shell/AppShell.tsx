"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { NAV, MOBILE_NAV } from "./nav";
import { ThemeToggle } from "./ThemeToggle";
import { ToastProvider } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/api/auth";
import { cn } from "@/lib/utils/format";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const focusMode = pathname.startsWith("/practice/run") || pathname.startsWith("/sessions/run");
  const isPublic = pathname === "/login" || pathname === "/register";

  if (isPublic) return <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">{children}</main>;
  if (user === undefined) return <div className="flex h-screen items-center justify-center text-sm text-fg-faint">Loading Sharpr…</div>;
  if (user === null) return null;

  return (
    <div className="flex min-h-screen">
      {!focusMode && (
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-bg px-3 py-4 md:flex">
          <Link href="/" className="mb-6 flex items-center gap-2 px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fg text-bg">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Sharpr</span>
          </Link>
          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors",
                      active ? "bg-muted text-fg" : "text-fg-muted hover:bg-hover hover:text-fg",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                  {item.children && active && (
                    <div className="ml-4 mt-0.5 mb-1 space-y-0.5 border-l pl-3">
                      {item.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          className={cn("flex h-8 items-center rounded-md px-2 text-[13px] transition-colors", isActive(pathname, c.href) ? "text-fg font-medium" : "text-fg-muted hover:text-fg")}
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="mt-4 space-y-3 px-1">
            <ThemeToggle />
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium">{user.name || user.email}</div>
                <div className="truncate text-[11px] text-fg-faint">{user.role === "admin" ? "admin" : user.email}</div>
              </div>
              <button type="button" onClick={logout} title="Log out" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-faint hover:bg-hover hover:text-fg">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <main className={cn("mx-auto w-full flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-10 md:pt-8", focusMode ? "max-w-3xl" : "max-w-5xl")}>{children}</main>
      </div>

      {!focusMode && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-bg/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium", active ? "text-fg" : "text-fg-faint")}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </AuthProvider>
  );
}
