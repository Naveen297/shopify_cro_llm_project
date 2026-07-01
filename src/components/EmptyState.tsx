import { Search } from "lucide-react";

export function EmptyState() {
  return (
    <section className="animate-fade-in rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
        <Search className="h-6 w-6 text-zinc-500" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-zinc-950">No audit loaded yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
        Enter a Shopify storefront URL above and run an audit. Ranked, evidence-backed findings will appear here.
      </p>
    </section>
  );
}
