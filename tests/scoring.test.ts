import { describe, expect, it } from "vitest";
import { computePriorityScore, scoreFindings } from "../server/scoring/priority";
import type { LlmFinding } from "../src/shared/schemas";

describe("priority scoring", () => {
  it("computes weighted ICE as impact * confidence / effort", () => {
    expect(computePriorityScore(5, 4, 2)).toBe(10);
    expect(computePriorityScore(3, 3, 4)).toBe(2.25);
  });

  it("sorts findings by priority descending", () => {
    const findings: LlmFinding[] = [
      makeFinding("slow", 5, 2, 5),
      makeFinding("fast", 4, 4, 1),
      makeFinding("mid", 3, 3, 2)
    ];

    expect(scoreFindings(findings).map((finding) => finding.id)).toEqual(["fast", "mid", "slow"]);
  });
});

function makeFinding(id: string, impact: number, confidence: number, effort: number): LlmFinding {
  return {
    id,
    surface: "catalog",
    title: `${id} finding with a concrete datapoint`,
    rationale: "This is a realistic rationale long enough for schema validation.",
    evidence: "Catalog: 1 of 3 analyzed products have exactly one image.",
    recommendation: "Create a specific remediation plan for this evidence-backed issue.",
    impact,
    confidence,
    effort
  };
}
