"use client";

import { Bookmark, Compass, FileText, LineChart, LogOut } from "lucide-react";
import Link from "next/link";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut, loading, configured } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LineChart className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-normal">Stock Memo</span>
        </Link>
        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
          <Button asChild variant="ghost" size="sm">
            <Link href="/discover">
              <Compass className="h-4 w-4" />
              <span>Discover</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports">
              <FileText className="h-4 w-4" />
              <span>Reports</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/watchlist">
              <Bookmark className="h-4 w-4" />
              <span>Watchlist</span>
            </Link>
          </Button>
        </nav>
        <div className="flex items-center gap-2">
          {!configured ? (
            <span className="hidden text-sm text-muted-foreground md:inline">
              Supabase env needed for auth
            </span>
          ) : null}
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          ) : loading ? (
            <Button variant="outline" size="sm" disabled>
              Loading
            </Button>
          ) : (
            <SignInDialog />
          )}
        </div>
      </div>
    </header>
  );
}
