"use client";

import { LogIn, Mail, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInDialog() {
  const { configured, configError, signInWithEmail } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      await signInWithEmail(email);
      setMessage("Check your inbox for a sign-in link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={!configured}
        title={configError || undefined}
      >
        <LogIn className="h-4 w-4" />
        {configured ? "Sign in" : "Auth setup needed"}
      </Button>
      {!configured && configError ? (
        <span className="hidden max-w-[260px] text-xs leading-5 text-muted-foreground lg:inline">
          {configError}
        </span>
      ) : null}
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm">
              <div className="fixed left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface-elevated p-5 shadow-soft">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">Sign in</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use a magic link to save reports and manage your watchlist.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={onSubmit} className="space-y-3">
                  <Input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <Button className="w-full" disabled={busy}>
                    <Mail className="h-4 w-4" />
                    {busy ? "Sending..." : "Send magic link"}
                  </Button>
                </form>
                {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
