import type { StoreEvidence } from "../analyzers/storeEvidence";

export interface AuditPromptInput {
  primary: StoreEvidence;
  competitor?: StoreEvidence;
}

export function buildAuditSystemPrompt(): string {
  return [
    "You are a senior conversion-rate-optimization strategist for Shopify storefronts.",
    "Your job is to turn deterministic evidence into prioritized opportunities.",
    "Use only the evidence provided by the user message. Do not invent counts, metrics, apps, URLs, or observations.",
    "Every finding must cite a literal fact from the provided facts list in its evidence field.",
    "If evidence is sampled, mention the sample size and lower confidence when the sample is thin or ambiguous.",
    "Avoid generic best practices. A finding is valid only when a concrete store-specific datapoint triggered it.",
    "Return JSON only. Do not wrap it in Markdown."
  ].join(" ");
}

export function buildAuditUserPrompt(input: AuditPromptInput): string {
  const payload = {
    task: "Produce a Shopify CRO opportunity audit grounded only in the deterministic evidence.",
    outputContract: {
      summary: {
        headline: "specific sentence about the store's conversion readiness",
        overallReadiness: "integer 0-100",
        topThemes: "1-5 short themes"
      },
      findings: [
        {
          id: "stable lowercase id",
          surface: "catalog | collections | pdp | cart | merchandising",
          title: "specific title with a concrete datapoint when possible",
          rationale: "why this likely hurts conversion",
          evidence: "copy one literal fact from primary.factList",
          recommendation: "specific action",
          impact: "integer 1-5",
          confidence: "integer 1-5",
          effort: "integer 1-5"
        }
      ],
      experimentBriefs: [
        {
          linkedFindingId: "id from findings",
          hypothesis: "If we <change>, then <metric> will <improve> because <evidence-backed reason>.",
          primaryMetric: "specific conversion metric",
          control: "current state",
          variant: "test variant",
          targetSurface: "surface",
          expectedDirection: "increase | decrease",
          estimatedEffort: "S | M | L",
          risks: "specific risk"
        }
      ],
      competitor:
        "omit unless competitor evidence is provided; when provided include domain, summary, and comparative gaps"
    },
    scoringInstructions:
      "Assign impact, confidence, and effort. Do not calculate priorityScore; the server computes (impact * confidence) / effort.",
    findingRules: [
      "Return 6-12 findings when evidence supports them.",
      "Cover only surfaces where evidence supports a real opportunity.",
      "Use lower confidence for HTML-only, sampled, missing, or ambiguous evidence.",
      "Do not recommend reviews, upsells, shipping, search, filters, badges, urgency, or copy changes unless the provided facts support that exact gap.",
      "Experiment briefs must link to evidence-backed findings only."
    ],
    primary: compactEvidence(input.primary),
    competitor: input.competitor ? compactEvidence(input.competitor) : undefined
  };

  return JSON.stringify(payload, null, 2);
}

function compactEvidence(evidence: StoreEvidence) {
  return {
    store: evidence.store,
    factList: evidence.facts,
    catalog: {
      ...evidence.catalog,
      sampleProducts: evidence.catalog.sampleProducts.slice(0, 20)
    },
    collections: {
      ...evidence.collections,
      samples: evidence.collections.samples.slice(0, 10)
    },
    pdp: {
      ...evidence.pdp,
      products: evidence.pdp.products.slice(0, 8)
    },
    cart: evidence.cart,
    merchandising: evidence.merchandising,
    warnings: evidence.warnings
  };
}
