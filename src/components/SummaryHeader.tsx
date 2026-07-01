import { Layers, ScanSearch, Sparkle } from "lucide-react";
import type { ComponentType } from "react";
import type { AuditResult } from "../shared/schemas";
import { ReadinessGauge } from "./ReadinessGauge";

export function SummaryHeader({ result }: { result: AuditResult }) {
  return (
    <section className="animate-fade-in grid gap-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{result.store.domain}</p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight text-zinc-950 md:text-3xl">
            {result.summary.headline}
          </h2>
        </div>
        <div className="flex items-center gap-4 self-start rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-3 md:self-auto">
          <ReadinessGauge value={result.summary.overallReadiness} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Readiness</p>
            <p className="text-xs text-zinc-500">score out of 100</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Layers} label="Products analyzed" value={result.store.productsAnalyzed} />
        <Stat icon={ScanSearch} label="PDPs sampled" value={result.store.pdpsSampled} />
        <Stat icon={Sparkle} label="Findings ranked" value={result.findings.length} />
      </div>

      {result.summary.topThemes.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
          {result.summary.topThemes.map((theme) => (
            <span
              key={theme}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900"
            >
              {theme}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white shadow-sm">
        <Icon className="h-4 w-4 text-teal-700" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-xl font-semibold text-zinc-950">{value}</p>
      </div>
    </div>
  );
}
