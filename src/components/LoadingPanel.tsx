import { CheckCircle2, Loader2 } from "lucide-react";

interface LoadingPanelProps {
  stages: string[];
  stageIndex: number;
}

export function LoadingPanel({ stages, stageIndex }: LoadingPanelProps) {
  const percent = Math.round(((stageIndex + 1) / stages.length) * 100);

  return (
    <section className="animate-fade-in rounded-2xl border border-zinc-200 bg-white p-6 shadow-soft md:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-zinc-950">{stages[stageIndex]}</h2>
        </div>
        <span className="text-sm font-semibold text-zinc-500">{percent}%</span>
      </div>

      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-700 transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="grid gap-2 md:grid-cols-3">
        {stages.map((stage, index) => {
          const isDone = index < stageIndex;
          const isActive = index === stageIndex;

          return (
            <li
              key={stage}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                isActive
                  ? "border-teal-300 bg-teal-50 text-teal-900"
                  : isDone
                    ? "border-zinc-200 bg-zinc-50 text-zinc-500"
                    : "border-zinc-100 bg-white text-zinc-400"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 flex-none text-teal-600" aria-hidden="true" />
              ) : (
                <span
                  className={`h-4 w-4 flex-none rounded-full border-2 ${
                    isActive ? "animate-pulse border-teal-600" : "border-zinc-300"
                  }`}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{stage}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
