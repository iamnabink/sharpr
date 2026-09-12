"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { api, onUnauthorized, type User } from "./client";
import { useMe } from "./hooks";

interface AuthCtx {
  user: User | null | undefined;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: undefined, login: async () => {}, register: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(Ctx);

const PUBLIC = ["/login", "/register"];

function AuthInner({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const user = me.isError ? null : me.data;

  useEffect(() => {
    onUnauthorized.handler = () => {
      qc.setQueryData(["me"], null);
      if (!PUBLIC.includes(window.location.pathname)) router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    };
    return () => {
      onUnauthorized.handler = null;
    };
  }, [qc, router]);

  useEffect(() => {
    if (me.isError && !PUBLIC.includes(pathname)) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (user && PUBLIC.includes(pathname)) router.replace("/");
  }, [me.isError, user, pathname, router]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      login: async (email, password) => {
        const r = await api.auth.login(email, password);
        qc.setQueryData(["me"], r.user);
        await qc.invalidateQueries();
      },
      register: async (email, password, name) => {
        const r = await api.auth.register(email, password, name);
        qc.setQueryData(["me"], r.user);
        await qc.invalidateQueries();
      },
      logout: async () => {
        await api.auth.logout();
        qc.clear();
        router.replace("/login");
      },
    }),
    [user, qc, router],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={client}>
      <AuthInner>{children}</AuthInner>
    </QueryClientProvider>
  );
}
