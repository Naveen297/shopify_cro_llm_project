import Anthropic from "@anthropic-ai/sdk";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { llmAuditSchema, type LlmAudit } from "../../src/shared/schemas";
import type { StoreEvidence } from "../analyzers/storeEvidence";
import { AppError } from "../utils/errors";
import { buildAuditSystemPrompt, buildAuditUserPrompt } from "./prompts";

interface GenerateAuditOptions {
  primary: StoreEvidence;
  competitor?: StoreEvidence;
}

export async function generateAuditWithLlm(options: GenerateAuditOptions): Promise<LlmAudit> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AppError(
      500,
      "MISSING_API_KEY",
      "ANTHROPIC_API_KEY is not configured. Add it to .env before running an audit."
    );
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
  const system = buildAuditSystemPrompt();
  const prompt = buildAuditUserPrompt(options);
  const raw = await callAnthropic(client, model, system, prompt);
  await logLlmExchange("audit", prompt, raw);

  const parsed = parseAndValidateJson(raw, llmAuditSchema);
  if (parsed.ok) {
    return parsed.data;
  }

  const repairPrompt = buildRepairPrompt(prompt, raw, parsed.error);
  const repairedRaw = await callAnthropic(client, model, system, repairPrompt);
  await logLlmExchange("audit-repair", repairPrompt, repairedRaw);

  const repaired = parseAndValidateJson(repairedRaw, llmAuditSchema);
  if (repaired.ok) {
    return repaired.data;
  }

  throw new AppError(502, "LLM_SCHEMA_INVALID", "The model returned JSON that failed validation.", {
    validationError: repaired.error
  });
}

async function callAnthropic(
  client: Anthropic,
  model: string,
  system: string,
  prompt: string
): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: 5000,
    temperature: 0.2,
    system,
    messages: [{ role: "user", content: prompt }]
  });

  return response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();
}

function parseAndValidateJson<T>(
  raw: string,
  schema: z.ZodType<T>
): { ok: true; data: T } | { ok: false; error: string } {
  const jsonCandidate = extractJsonCandidate(raw);

  try {
    const parsed = JSON.parse(jsonCandidate) as unknown;
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: result.error.message };
    }

    return { ok: true, data: result.data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON" };
  }
}

function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function buildRepairPrompt(originalPrompt: string, raw: string, validationError: string): string {
  return JSON.stringify(
    {
      task: "Repair the previous response into valid JSON matching the requested schema.",
      constraints: [
        "Use only the original evidence.",
        "Do not add new observations.",
        "Return JSON only."
      ],
      validationError,
      originalPrompt,
      previousResponse: raw
    },
    null,
    2
  );
}

async function logLlmExchange(kind: string, prompt: string, response: string): Promise<void> {
  const dir = path.resolve(process.cwd(), ".audit-logs");
  await mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `${timestamp}-${kind}.json`);
  await writeFile(
    file,
    JSON.stringify(
      {
        kind,
        createdAt: new Date().toISOString(),
        prompt,
        response
      },
      null,
      2
    )
  );
}
