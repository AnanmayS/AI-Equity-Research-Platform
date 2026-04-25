import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Bot, BriefcaseBusiness, Gauge, Settings } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polymarket Soccer Edge Agent",
  description: "Paper-only soccer market analysis for Polymarket."
};

const nav = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", icon: BriefcaseBusiness },
  { href: "/audit", label: "Audit", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(67,245,181,0.14),transparent_34%),linear-gradient(180deg,#07120f,#0a1413_46%,#07120f)]">
          <header className="sticky top-0 z-20 border-b border-line/80 bg-pitch/88 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-mint/40 bg-mint/10 text-mint">
                  <Gauge size={19} />
                </span>
                <span>
                  <span className="block text-base font-semibold tracking-wide">Soccer Edge Agent</span>
                  <span className="block text-xs uppercase text-mint">Paper only</span>
                </span>
              </Link>
              <nav className="flex flex-wrap gap-2">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-md border border-line bg-panel/80 px-3 py-2 text-sm text-slate-200 transition hover:border-mint/60 hover:text-white"
                  >
                    <item.icon size={15} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

