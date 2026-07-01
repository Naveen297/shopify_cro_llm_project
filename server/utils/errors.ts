export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NonShopifyError extends AppError {
  constructor(domain: string) {
    super(
      422,
      "NON_SHOPIFY",
      `${domain} does not look like a Shopify storefront. products.json was unavailable and Shopify markers were not detected.`
    );
  }
}
