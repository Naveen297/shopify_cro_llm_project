import { useMemo, useState, type FormEvent } from "react";
import type { AuditResult, Surface } from "./shared/schemas";
import { Header } from "./components/Header";
import { AuditForm } from "./components/AuditForm";
import { LoadingPanel } from "./components/LoadingPanel";
import { ErrorPanel } from "./components/ErrorPanel";
import { EmptyState } from "./components/EmptyState";
import { SummaryHeader } from "./components/SummaryHeader";
import { SurfaceFilter } from "./components/SurfaceFilter";
import { FindingCard } from "./components/FindingCard";
import { ExperimentBriefs } from "./components/ExperimentBriefs";
import { CompetitorPanel } from "./components/CompetitorPanel";

const surfaces: Array<Surface | "all"> = ["all", "catalog", "collections", "pdp", "cart", "merchandising"];

const loadingStages = [
  "Validating storefront",
  "Fetching catalog",
  "Sampling PDPs",
  "Checking cart and homepage",
  "Reasoning over evidence",
  "Scoring opportunities"
];

interface ApiError {
  code: string;
  message: string;
}

export default function App() {
  const [storeUrl, setStoreUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [activeSurface, setActiveSurface] = useState<Surface | "all">("all");

  const filteredFindings = useMemo(() => {
    if (!result) {
      return [];
    }

    return activeSurface === "all"
      ? result.findings
      : result.findings.filter((finding) => finding.surface === activeSurface);
  }, [activeSurface, result]);

  const countFor = (surface: Surface | "all") => {
    if (!result) {
      return 0;
    }

    return surface === "all"
      ? result.findings.length
      : result.findings.filter((finding) => finding.surface === surface).length;
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStageIndex(0);
    setActiveSurface("all");

    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, loadingStages.length - 1));
    }, 1700);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storeUrl,
          competitorUrl: competitorUrl.trim() || undefined
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw {
          code: payload?.error?.code ?? "REQUEST_FAILED",
          message: payload?.error?.message ?? "Audit failed."
        } satisfies ApiError;
      }

      setResult(payload as AuditResult);
      setStageIndex(loadingStages.length - 1);
    } catch (caught) {
      const apiError = caught as Partial<ApiError>;
      setError({
        code: apiError.code ?? "REQUEST_FAILED",
        message: apiError.message ?? "The audit could not be completed."
      });
    } finally {
      window.clearInterval(timer);
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <Header />
      <AuditForm
        storeUrl={storeUrl}
        competitorUrl={competitorUrl}
        isLoading={isLoading}
        onStoreUrlChange={setStoreUrl}
        onCompetitorUrlChange={setCompetitorUrl}
        onSubmit={handleSubmit}
      />

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        {isLoading && <LoadingPanel stages={loadingStages} stageIndex={stageIndex} />}
        {error && <ErrorPanel code={error.code} message={error.message} />}
        {!isLoading && !error && !result && <EmptyState />}

        {result && (
          <div className="grid gap-6">
            <SummaryHeader result={result} />
            <SurfaceFilter
              surfaces={surfaces}
              active={activeSurface}
              onChange={setActiveSurface}
              countFor={countFor}
            />

            {filteredFindings.length > 0 ? (
              <div className="grid gap-4">
                {filteredFindings.map((finding, index) => (
                  <FindingCard key={finding.id} finding={finding} rank={index + 1} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
                No findings for this surface.
              </div>
            )}

            {result.experimentBriefs.length > 0 && <ExperimentBriefs result={result} />}
            {result.competitor && <CompetitorPanel result={result} />}
          </div>
        )}
      </section>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400">
        Findings are generated by an LLM grounded in deterministic storefront evidence — always verify before shipping
        changes.
      </footer>
    </main>
  );
}
