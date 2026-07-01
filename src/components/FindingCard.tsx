import { ArrowUpRight } from "lucide-react";
import type { Finding } from "../shared/schemas";
import { formatSurface } from "../lib/format";
import { ScoreMeter } from "./ScoreMeter";

export function FindingCard({ finding, rank }: { finding: Finding; rank: number }) {
  return (
    <article className="animate-fade-in rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">
              {rank}
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              {formatSurface(finding.surface)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">
              Priority {finding.priorityScore.toFixed(2)}
            </span>
          </div>
          <h3 className="text-xl font-semibold leading-snug text-zinc-950">{finding.title}</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-600">{finding.rationale}</p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 md:w-auto md:min-w-[220px]">
          <ScoreMeter label="Impact" value={finding.impact} tone="rose" />
          <ScoreMeter label="Conf." value={finding.confidence} tone="teal" />
          <ScoreMeter label="Effort" value={finding.effort} tone="amber" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-teal-800">Evidence</p>
          <p className="text-sm leading-6 text-teal-950">{finding.evidence}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            Recommendation
          </p>
          <p className="text-sm leading-6 text-zinc-800">{finding.recommendation}</p>
        </div>
      </div>
    </article>
  );
}
