import "dotenv/config";
import express from "express";
import { ZodError } from "zod";
import { analyzeRawStorefront } from "./analyzers/storeEvidence";
import { collectRawStorefront } from "./fetchers/shopify";
import { generateAuditWithLlm } from "./llm/anthropic";
import { scoreFindings, topFindingIds } from "./scoring/priority";
import {
  auditRequestSchema,
  auditResultSchema,
  type AuditResult
} from "../src/shared/schemas";
import { AppError } from "./utils/errors";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/audit", async (request, response, next) => {
  try {
    const body = auditRequestSchema.parse(request.body);
    const competitorUrl = body.competitorUrl?.trim();

    const primaryRaw = await collectRawStorefront(body.storeUrl);
    const primaryEvidence = analyzeRawStorefront(primaryRaw);

    const competitorEvidence = competitorUrl
      ? analyzeRawStorefront(await collectRawStorefront(competitorUrl))
      : undefined;

    const llmAudit = await generateAuditWithLlm({
      primary: primaryEvidence,
      competitor: competitorEvidence
    });

    const scoredFindings = scoreFindings(llmAudit.findings);
    const topIds = topFindingIds(scoredFindings, 5);
    const experimentBriefs = llmAudit.experimentBriefs
      .filter((brief) => topIds.has(brief.linkedFindingId))
      .slice(0, 5);

    const result: AuditResult = {
      store: primaryEvidence.store,
      summary: llmAudit.summary,
      findings: scoredFindings,
      experimentBriefs,
      competitor: llmAudit.competitor
    };

    response.json(auditResultSchema.parse(result));
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof AppError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request or response shape failed validation.",
        details: error.flatten()
      }
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected audit failure."
    }
  });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`CRO audit API listening on http://127.0.0.1:${port}`);
});
