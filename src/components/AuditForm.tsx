import { ArrowRight, Loader2, Search, Store, Users } from "lucide-react";
import type { FormEvent } from "react";

interface AuditFormProps {
  storeUrl: string;
  competitorUrl: string;
  isLoading: boolean;
  onStoreUrlChange: (value: string) => void;
  onCompetitorUrlChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AuditForm({
  storeUrl,
  competitorUrl,
  isLoading,
  onStoreUrlChange,
  onCompetitorUrlChange,
  onSubmit
}: AuditFormProps) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(650px circle at 10% -15%, rgba(20,184,166,0.12), transparent 60%), radial-gradient(500px circle at 92% -10%, rgba(244,63,94,0.08), transparent 55%)"
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:px-8 md:py-16">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
            Evidence-grounded CRO
          </p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-950 md:text-5xl">
            Turn real storefront evidence into ranked conversion wins
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
            Point it at any Shopify store. The engine samples the catalog, collections, PDPs, and cart, then asks an
            LLM to reason over the facts — never guess — and returns prioritized, evidence-backed opportunities.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-soft backdrop-blur md:grid-cols-[1fr_1fr_auto] md:p-5"
        >
          <label className="grid gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Store className="h-3.5 w-3.5" aria-hidden="true" />
              Store URL
            </span>
            <input
              value={storeUrl}
              onChange={(event) => onStoreUrlChange(event.target.value)}
              placeholder="https://brand.com"
              required
              className="h-12 rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <label className="grid gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Competitor URL <span className="normal-case text-zinc-400">(optional)</span>
            </span>
            <input
              value={competitorUrl}
              onChange={(event) => onCompetitorUrlChange(event.target.value)}
              placeholder="https://competitor.com"
              className="h-12 rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="group inline-flex h-12 items-center justify-center gap-2 self-end rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            Run audit
            {!isLoading && (
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
