import { z } from "zod";

export const surfaceSchema = z.enum([
  "catalog",
  "collections",
  "pdp",
  "cart",
  "merchandising"
]);

export const scoreSchema = z.number().int().min(1).max(5);

export const storeMetaSchema = z.object({
  domain: z.string().min(1),
  platformConfirmed: z.boolean(),
  productsAnalyzed: z.number().int().min(0),
  pdpsSampled: z.number().int().min(0)
});

export const summarySchema = z.object({
  headline: z.string().min(1),
  overallReadiness: z.number().int().min(0).max(100),
  topThemes: z.array(z.string().min(1)).min(1).max(5)
});

export const llmFindingSchema = z
  .object({
    id: z.string().min(1).max(80),
    surface: surfaceSchema,
    title: z.string().min(8).max(160),
    rationale: z.string().min(20).max(700),
    evidence: z.string().min(8).max(500),
    recommendation: z.string().min(20).max(700),
    impact: scoreSchema,
    confidence: scoreSchema,
    effort: scoreSchema
  })
  .strict();

export const findingSchema = llmFindingSchema.extend({
  priorityScore: z.number().min(0)
});

export const experimentBriefSchema = z
  .object({
    linkedFindingId: z.string().min(1),
    hypothesis: z.string().min(20).max(700),
    primaryMetric: z.string().min(3).max(120),
    control: z.string().min(3).max(240),
    variant: z.string().min(3).max(240),
    targetSurface: z.string().min(3).max(80),
    expectedDirection: z.enum(["increase", "decrease"]),
    estimatedEffort: z.enum(["S", "M", "L"]),
    risks: z.string().min(3).max(300)
  })
  .strict();

export const competitorGapSchema = z
  .object({
    title: z.string().min(8).max(160),
    surface: surfaceSchema,
    evidencePrimary: z.string().min(8).max(500),
    evidenceCompetitor: z.string().min(8).max(500),
    recommendation: z.string().min(20).max(700)
  })
  .strict();

export const competitorAnalysisSchema = z
  .object({
    domain: z.string().min(1),
    summary: z.string().min(8).max(500),
    gaps: z.array(competitorGapSchema).max(8)
  })
  .strict();

export const llmAuditSchema = z
  .object({
    summary: summarySchema,
    findings: z.array(llmFindingSchema).min(0).max(30),
    experimentBriefs: z.array(experimentBriefSchema).max(5),
    competitor: competitorAnalysisSchema.optional()
  })
  .strict();

export const auditResultSchema = z
  .object({
    store: storeMetaSchema,
    summary: summarySchema,
    findings: z.array(findingSchema),
    experimentBriefs: z.array(experimentBriefSchema),
    competitor: competitorAnalysisSchema.optional()
  })
  .strict();

export const auditRequestSchema = z
  .object({
    storeUrl: z.string().min(3).max(300),
    competitorUrl: z.string().max(300).optional()
  })
  .strict();

export type Surface = z.infer<typeof surfaceSchema>;
export type StoreMeta = z.infer<typeof storeMetaSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type LlmFinding = z.infer<typeof llmFindingSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type ExperimentBrief = z.infer<typeof experimentBriefSchema>;
export type CompetitorAnalysis = z.infer<typeof competitorAnalysisSchema>;
export type LlmAudit = z.infer<typeof llmAuditSchema>;
export type AuditResult = z.infer<typeof auditResultSchema>;
export type AuditRequest = z.infer<typeof auditRequestSchema>;
