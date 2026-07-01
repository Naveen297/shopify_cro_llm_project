import { AppError } from "./errors";

export interface NormalizedStoreUrl {
  input: string;
  origin: string;
  domain: string;
}

export function normalizeStoreUrl(input: string): NormalizedStoreUrl {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new AppError(400, "INVALID_URL", "Store URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) {
      throw new Error("Missing public hostname");
    }

    url.pathname = "";
    url.search = "";
    url.hash = "";

    return {
      input: trimmed,
      origin: url.origin,
      domain: url.hostname.replace(/^www\./, "").toLowerCase()
    };
  } catch {
    throw new AppError(400, "INVALID_URL", "Enter a valid public Shopify storefront URL.");
  }
}

export function endpoint(origin: string, path: string): string {
  return new URL(path, origin).toString();
}
