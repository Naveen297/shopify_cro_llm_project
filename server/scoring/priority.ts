import type { Finding, LlmFinding } from "../../src/shared/schemas";

export function computePriorityScore(impact: number, confidence: number, effort: number): number {
  if (effort <= 0) {
    return 0;
  }

  return Number(((impact * confidence) / effort).toFixed(2));
}

export function scoreFindings(findings: LlmFinding[]): Finding[] {
  return findings
    .map((finding) => ({
      ...finding,
      priorityScore: computePriorityScore(finding.impact, finding.confidence, finding.effort)
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function topFindingIds(findings: Finding[], limit = 5): Set<string> {
  return new Set(findings.slice(0, limit).map((finding) => finding.id));
}
