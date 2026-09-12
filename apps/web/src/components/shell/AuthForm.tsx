"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { AccentButton, Card, Field, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/api/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const config = useQuery({ queryKey: ["auth-config"], queryFn: api.auth.config });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name);
      router.replace(params.get("next") || "/");
    } catch (err) {
      setError((err as Error).message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const firstUser = config.data && !config.data.hasUsers;
  const registrationOpen = config.data?.allowRegistration ?? true;

  return (
    <div className="w-full py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fg text-bg">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Sharpr</span>
      </div>
      <Card className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">{mode === "login" ? "Sign in" : firstUser ? "Create the first account" : "Create an account"}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {mode === "login" ? "Your recordings and progress live on this server." : firstUser ? "The first account becomes the admin." : "Your library is seeded with starter content."}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "register" && (
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
          </Field>
          <Field label="Password" hint={mode === "register" ? "At least 8 characters" : undefined}>
            <Input type="password" required minLength={mode === "register" ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </Field>
          {error && <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
          <AccentButton type="submit" size="md" className="w-full" disabled={busy || (mode === "register" && !registrationOpen)}>
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </AccentButton>
        </form>
        <div className="mt-4 text-center text-sm text-fg-muted">
          {mode === "login" ? (
            registrationOpen ? (
              <>
                No account? <Link href="/register" className="font-medium text-fg underline-offset-2 hover:underline">Register</Link>
              </>
            ) : (
              "Registration is disabled on this server."
            )
          ) : (
            <>
              Already registered? <Link href="/login" className="font-medium text-fg underline-offset-2 hover:underline">Sign in</Link>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
