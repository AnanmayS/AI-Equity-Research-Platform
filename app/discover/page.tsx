import { DiscoverySearch } from "@/components/discovery/discovery-search";

export default function DiscoverPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-accent">Idea discovery</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal">Browse stock idea baskets</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Pick a theme first, then analyze individual companies with real financial data and peer context.
        </p>
      </section>
      <DiscoverySearch />
    </main>
  );
}
