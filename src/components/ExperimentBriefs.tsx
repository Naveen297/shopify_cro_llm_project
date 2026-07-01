import { BarChart3 } from "lucide-react";
import type { AuditResult } from "../shared/schemas";

const EFFORT_STYLES: Record<string, string> = {
  S: "border-teal-200 bg-teal-50 text-teal-800",
  M: "border-amber-200 bg-amber-50 text-amber-800",
  L: "border-rose-200 bg-rose-50 text-rose-800"
};

export function ExperimentBriefs({ result }: { result: AuditResult }) {
  return (
    <section className="animate-fade-in rounded-2xl border border-zinc-200 bg-white p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
          <BarChart3 className="h-4 w-4 text-teal-700" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-950">Experiment briefs</h2>
        <span className="text-sm text-zinc-400">top {result.experimentBriefs.length} findings</span>
      </div>
      <div className="grid gap-3">
        {result.experimentBriefs.map((brief) => (
          <article key={brief.linkedFindingId} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 md:p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <h3 className="font-semibold leading-snug text-zinc-950">{brief.hypothesis}</h3>
              <span
                className={`w-fit flex-none rounded-full border px-2.5 py-1 text-xs font-bold ${
                  EFFORT_STYLES[brief.estimatedEffort] ?? "border-zinc-200 bg-white text-zinc-600"
                }`}
              >
                Effort {brief.estimatedEffort}
              </span>
            </div>
            <div className="mt-3 grid gap-3 text-sm text-zinc-700 md:grid-cols-3">
              <p>
                <span className="font-semibold text-zinc-950">Metric — </span>
                {brief.primaryMetric}
              </p>
              <p>
                <span className="font-semibold text-zinc-950">Control — </span>
                {brief.control}
              </p>
              <p>
                <span className="font-semibold text-zinc-950">Variant — </span>
                {brief.variant}
              </p>
            </div>
            <p className="mt-3 border-t border-zinc-200 pt-3 text-sm text-zinc-600">
              <span className="font-semibold text-zinc-950">Risk — </span>
              {brief.risks}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
