import { Swords } from "lucide-react";
import type { AuditResult } from "../shared/schemas";
import { formatSurface } from "../lib/format";

export function CompetitorPanel({ result }: { result: AuditResult }) {
  if (!result.competitor) {
    return null;
  }

  const competitor = result.competitor;

  return (
    <section className="animate-fade-in rounded-2xl border border-zinc-200 bg-white p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
          <Swords className="h-4 w-4 text-zinc-700" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-950">Competitor gap vs. {competitor.domain}</h2>
      </div>
      <p className="mb-5 text-sm leading-6 text-zinc-600">{competitor.summary}</p>
      <div className="grid gap-3">
        {competitor.gaps.map((gap) => (
          <article key={`${gap.surface}-${gap.title}`} className="rounded-xl border border-zinc-200 p-4 md:p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              {formatSurface(gap.surface)}
            </p>
            <h3 className="font-semibold text-zinc-950">{gap.title}</h3>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <p className="rounded-lg bg-rose-50 p-3 text-rose-950">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-rose-500">You</span>
                {gap.evidencePrimary}
              </p>
              <p className="rounded-lg bg-teal-50 p-3 text-teal-950">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-teal-600">
                  Competitor
                </span>
                {gap.evidenceCompetitor}
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-700">{gap.recommendation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
