import { load, type CheerioAPI } from "cheerio";
import type {
  CollectionSampleRaw,
  PdpSampleRaw,
  RawStorefrontData,
  ShopifyCollection,
  ShopifyProduct
} from "../fetchers/shopify";

const THIN_DESCRIPTION_CHARS = 250;
const BUYER_INTENT_COLLECTIONS = {
  sale: /\b(sale|clearance|deal|discount|outlet)\b/i,
  bestsellers: /\b(best\s?seller|popular|top\s?rated|favorites)\b/i,
  new: /\b(new|latest|arrival)\b/i
};

const REVIEW_APP_PATTERNS = [
  { label: "Judge.me", pattern: /judge\.me|judgeme/i },
  { label: "Loox", pattern: /\bloox\b/i },
  { label: "Yotpo", pattern: /\byotpo\b/i },
  { label: "Stamped", pattern: /stamped\.io|stamped-reviews/i },
  { label: "Okendo", pattern: /\bokendo\b/i },
  { label: "Reviews.io", pattern: /reviews\.io/i },
  { label: "Junip", pattern: /\bjunip\b/i },
  { label: "Fera", pattern: /\bfera\b/i }
];

const UPSELL_APP_PATTERNS = [
  { label: "Rebuy", pattern: /\brebuy\b/i },
  { label: "Zipify", pattern: /\bzipify\b/i },
  { label: "Bold Upsell", pattern: /bold.*upsell|boldapps/i },
  { label: "Frequently Bought Together", pattern: /frequently bought|also bought|complete the look/i },
  { label: "AfterSell", pattern: /\baftersell\b/i },
  { label: "Candy Rack", pattern: /candy rack/i }
];

export interface ProductEvidence {
  title: string;
  handle: string;
  bodyTextLength: number;
  imageCount: number;
  altTextCount: number;
  variantCount: number;
  availableVariantCount: number;
  outOfStock: boolean;
  priceMin: number | null;
  priceMax: number | null;
  compareAtVariantCount: number;
  optionNames: string[];
  tags: string[];
  productType: string;
  publishedAt: string | null;
}

export interface CollectionEvidence {
  title: string;
  handle: string;
  descriptionLength: number;
  productCount: number | null;
  filterOrSortDetected: boolean | null;
}

export interface PdpEvidence {
  title: string;
  handle: string;
  imageCount: number;
  altTextCount: number;
  descriptionLength: number;
  variantCount: number;
  optionNames: string[];
  hasProductJsonLd: boolean;
  hasAggregateRating: boolean;
  hasOfferJsonLd: boolean;
  detectedReviewApps: string[];
  addToCartDetected: boolean;
  trustCopyDetected: boolean;
  trustCopyTerms: string[];
  errors: string[];
}

export interface StoreEvidence {
  store: {
    domain: string;
    platformConfirmed: boolean;
    productsAnalyzed: number;
    pdpsSampled: number;
  };
  catalog: {
    totalProducts: number;
    analyzedProducts: number;
    singleImageProducts: number;
    noImageProducts: number;
    thinDescriptionProducts: number;
    outOfStockProducts: number;
    productsWithoutTags: number;
    productsWithCompareAtPricing: number;
    priceMin: number | null;
    priceMax: number | null;
    uniqueProductTypes: number;
    newestProductAgeDays: number | null;
    repeatedTitlePrefixes: Array<{ prefix: string; count: number }>;
    sampleProducts: ProductEvidence[];
  };
  collections: {
    totalCollections: number;
    sampledCollections: number;
    emptyCollections: number;
    sparseCollections: number;
    largeCollections: number;
    collectionsMissingDescriptions: number;
    buyerIntentCollections: Record<keyof typeof BUYER_INTENT_COLLECTIONS, boolean>;
    filterOrSortDetected: boolean | null;
    samples: CollectionEvidence[];
  };
  pdp: {
    sampledProducts: number;
    products: PdpEvidence[];
    aggregateRatingMarkupProducts: number;
    productJsonLdProducts: number;
    offerJsonLdProducts: number;
    addToCartDetectedProducts: number;
    trustCopyProducts: number;
    detectedReviewApps: string[];
  };
  cart: {
    htmlAvailable: boolean;
    cartJsonAvailable: boolean;
    freeShippingMessaging: boolean;
    freeShippingThreshold: string | null;
    upsellSignals: string[];
    trustSignals: string[];
    estimatedDeliveryDetected: boolean;
    guestCheckoutFrictionSignals: string[];
  };
  merchandising: {
    homepageAvailable: boolean;
    valuePropCandidate: string | null;
    hasSearch: boolean;
    navLabels: string[];
    navLinkCount: number;
    promoSignals: string[];
    bestsellerOrNewSignals: boolean;
    socialProofSignals: string[];
    trustSignals: string[];
    detectedApps: string[];
  };
  facts: string[];
  warnings: string[];
}

export function analyzeRawStorefront(raw: RawStorefrontData): StoreEvidence {
  const productEvidence = raw.products.map(toProductEvidence);
  const collectionEvidence = raw.collectionSamples.map(toCollectionEvidence);
  const pdpEvidence = raw.pdpSamples.map(toPdpEvidence);
  const homepage = analyzeHomepage(raw.homepageHtml);
  const cart = analyzeCart(raw.cartHtml, raw.cartJsonAvailable);

  const allPrices = productEvidence.flatMap((product) =>
    [product.priceMin, product.priceMax].filter((price): price is number => price !== null)
  );
  const newestProductAgeDays = getNewestProductAgeDays(productEvidence);
  const repeatedTitlePrefixes = getRepeatedTitlePrefixes(productEvidence);
  const collectionCounts = collectionEvidence
    .map((collection) => collection.productCount)
    .filter((count): count is number => count !== null);
  const detectedReviewApps = unique(pdpEvidence.flatMap((product) => product.detectedReviewApps));

  const evidence: StoreEvidence = {
    store: {
      domain: raw.normalized.domain,
      platformConfirmed: raw.platformConfirmed,
      productsAnalyzed: productEvidence.length,
      pdpsSampled: pdpEvidence.length
    },
    catalog: {
      totalProducts: raw.products.length,
      analyzedProducts: productEvidence.length,
      singleImageProducts: productEvidence.filter((product) => product.imageCount === 1).length,
      noImageProducts: productEvidence.filter((product) => product.imageCount === 0).length,
      thinDescriptionProducts: productEvidence.filter(
        (product) => product.bodyTextLength < THIN_DESCRIPTION_CHARS
      ).length,
      outOfStockProducts: productEvidence.filter((product) => product.outOfStock).length,
      productsWithoutTags: productEvidence.filter((product) => product.tags.length === 0).length,
      productsWithCompareAtPricing: productEvidence.filter((product) => product.compareAtVariantCount > 0)
        .length,
      priceMin: allPrices.length ? Math.min(...allPrices) : null,
      priceMax: allPrices.length ? Math.max(...allPrices) : null,
      uniqueProductTypes: unique(productEvidence.map((product) => product.productType).filter(Boolean))
        .length,
      newestProductAgeDays,
      repeatedTitlePrefixes,
      sampleProducts: productEvidence.slice(0, 40)
    },
    collections: {
      totalCollections: raw.collections.length,
      sampledCollections: collectionEvidence.length,
      emptyCollections: collectionCounts.filter((count) => count === 0).length,
      sparseCollections: collectionCounts.filter((count) => count > 0 && count < 4).length,
      largeCollections: collectionCounts.filter((count) => count > 80).length,
      collectionsMissingDescriptions: collectionEvidence.filter(
        (collection) => collection.descriptionLength < 80
      ).length,
      buyerIntentCollections: detectBuyerIntentCollections(raw.collections),
      filterOrSortDetected:
        collectionEvidence.length > 0
          ? collectionEvidence.some((collection) => collection.filterOrSortDetected)
          : null,
      samples: collectionEvidence
    },
    pdp: {
      sampledProducts: pdpEvidence.length,
      products: pdpEvidence,
      aggregateRatingMarkupProducts: pdpEvidence.filter((product) => product.hasAggregateRating).length,
      productJsonLdProducts: pdpEvidence.filter((product) => product.hasProductJsonLd).length,
      offerJsonLdProducts: pdpEvidence.filter((product) => product.hasOfferJsonLd).length,
      addToCartDetectedProducts: pdpEvidence.filter((product) => product.addToCartDetected).length,
      trustCopyProducts: pdpEvidence.filter((product) => product.trustCopyDetected).length,
      detectedReviewApps
    },
    cart,
    merchandising: homepage,
    facts: [],
    warnings: raw.warnings
  };

  evidence.facts = buildFacts(evidence);
  return evidence;
}

function toProductEvidence(product: ShopifyProduct): ProductEvidence {
  const variants = product.variants ?? [];
  const prices = variants.map((variant) => toNumber(variant.price)).filter(isNumber);
  const availableVariantCount = variants.filter((variant) => variant.available !== false).length;
  const images = product.images ?? [];

  return {
    title: cleanText(product.title) || "(untitled product)",
    handle: product.handle ?? "",
    bodyTextLength: stripHtml(product.body_html ?? "").length,
    imageCount: images.length,
    altTextCount: images.filter((image) => cleanText(image.alt ?? image.alt_text).length > 0).length,
    variantCount: variants.length,
    availableVariantCount,
    outOfStock: variants.length > 0 && availableVariantCount === 0,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    compareAtVariantCount: variants.filter((variant) => {
      const compareAt = toNumber(variant.compare_at_price);
      const price = toNumber(variant.price);
      return isNumber(compareAt) && isNumber(price) && compareAt > price;
    }).length,
    optionNames: unique((product.options ?? []).map((option) => cleanText(option.name)).filter(Boolean)),
    tags: parseTags(product.tags),
    productType: cleanText(product.product_type),
    publishedAt: product.published_at ?? null
  };
}

function toCollectionEvidence(sample: CollectionSampleRaw): CollectionEvidence {
  const htmlAnalysis = sample.html ? analyzeCollectionHtml(sample.html) : null;
  const explicitCount = toNumber(sample.collection.products_count);

  return {
    title: cleanText(sample.collection.title) || "(untitled collection)",
    handle: sample.collection.handle ?? "",
    descriptionLength: stripHtml(sample.collection.body_html ?? "").length,
    productCount: isNumber(explicitCount) ? explicitCount : sample.products.length,
    filterOrSortDetected: htmlAnalysis?.filterOrSortDetected ?? null
  };
}

function toPdpEvidence(sample: PdpSampleRaw): PdpEvidence {
  const product = sample.product ?? sample.catalogProduct;
  const productFacts = toProductEvidence(product);
  const html = sample.html;
  const htmlFacts = html ? analyzeProductHtml(html) : null;

  return {
    title: productFacts.title,
    handle: productFacts.handle,
    imageCount: productFacts.imageCount,
    altTextCount: productFacts.altTextCount,
    descriptionLength: productFacts.bodyTextLength,
    variantCount: productFacts.variantCount,
    optionNames: productFacts.optionNames,
    hasProductJsonLd: htmlFacts?.hasProductJsonLd ?? false,
    hasAggregateRating: htmlFacts?.hasAggregateRating ?? false,
    hasOfferJsonLd: htmlFacts?.hasOfferJsonLd ?? false,
    detectedReviewApps: htmlFacts?.detectedReviewApps ?? [],
    addToCartDetected: htmlFacts?.addToCartDetected ?? false,
    trustCopyDetected: (htmlFacts?.trustCopyTerms.length ?? 0) > 0,
    trustCopyTerms: htmlFacts?.trustCopyTerms ?? [],
    errors: sample.errors
  };
}

function analyzeCollectionHtml(html: string): { filterOrSortDetected: boolean } {
  const $ = load(html);
  const text = visibleText($);

  return {
    filterOrSortDetected:
      $("select[name*='sort'], select[id*='sort'], [data-sort], [data-filter], form[action*='filter']").length >
        0 ||
      /\b(sort by|filter by|facets?|availability|price range)\b/i.test(text)
  };
}

function analyzeProductHtml(html: string) {
  const $ = load(html);
  const jsonLd = parseJsonLd($);
  const text = visibleText($);
  const productNodes = jsonLd.filter((node) => typeIncludes(node, "Product"));
  const detectedReviewApps = detectApps(html, REVIEW_APP_PATTERNS);

  return {
    hasProductJsonLd: productNodes.length > 0,
    hasAggregateRating: productNodes.some((node) => Boolean(node.aggregateRating || node.review)),
    hasOfferJsonLd: productNodes.some((node) => Boolean(node.offers)),
    detectedReviewApps,
    addToCartDetected: /\b(add to cart|add to bag|buy now)\b/i.test(text),
    trustCopyTerms: detectTerms(text, [
      "free shipping",
      "returns",
      "refund",
      "guarantee",
      "warranty",
      "secure checkout",
      "cash on delivery",
      "delivery"
    ])
  };
}

function analyzeCart(html: string | undefined, cartJsonAvailable: boolean): StoreEvidence["cart"] {
  if (!html) {
    return {
      htmlAvailable: false,
      cartJsonAvailable,
      freeShippingMessaging: false,
      freeShippingThreshold: null,
      upsellSignals: [],
      trustSignals: [],
      estimatedDeliveryDetected: false,
      guestCheckoutFrictionSignals: []
    };
  }

  const $ = load(html);
  const text = visibleText($);
  const freeShippingMessaging = /\bfree (shipping|delivery)\b/i.test(text);

  return {
    htmlAvailable: true,
    cartJsonAvailable,
    freeShippingMessaging,
    freeShippingThreshold: freeShippingMessaging ? detectCurrencyAmountNear(text, /free (shipping|delivery)/i) : null,
    upsellSignals: detectApps(html, UPSELL_APP_PATTERNS),
    trustSignals: detectTerms(text, [
      "secure checkout",
      "money back",
      "guarantee",
      "returns",
      "refund",
      "trust badge",
      "ssl"
    ]),
    estimatedDeliveryDetected: /\b(estimated delivery|delivery by|arrives by|ships in|dispatches in)\b/i.test(text),
    guestCheckoutFrictionSignals: detectTerms(text, ["create account", "login required", "sign in to checkout"])
  };
}

function analyzeHomepage(html: string | undefined): StoreEvidence["merchandising"] {
  if (!html) {
    return {
      homepageAvailable: false,
      valuePropCandidate: null,
      hasSearch: false,
      navLabels: [],
      navLinkCount: 0,
      promoSignals: [],
      bestsellerOrNewSignals: false,
      socialProofSignals: [],
      trustSignals: [],
      detectedApps: []
    };
  }

  const $ = load(html);
  const text = visibleText($);
  const navLabels = unique(
    $("nav a, header a")
      .toArray()
      .map((element) => cleanText($(element).text()))
      .filter((label) => label.length > 1)
  ).slice(0, 40);
  const valuePropCandidate =
    cleanText($("h1").first().text()) ||
    cleanText($("meta[property='og:title']").attr("content")) ||
    cleanText($("title").first().text()) ||
    null;

  return {
    homepageAvailable: true,
    valuePropCandidate,
    hasSearch:
      $("input[type='search'], form[action*='/search'], a[href*='/search'], button[aria-label*='search' i]")
        .length > 0 || /\bsearch\b/i.test(navLabels.join(" ")),
    navLabels,
    navLinkCount: navLabels.length,
    promoSignals: detectTerms(text, ["sale", "free shipping", "bundle", "limited", "discount", "offer"]),
    bestsellerOrNewSignals: /\b(best\s?seller|new arrivals?|latest|popular|trending)\b/i.test(text),
    socialProofSignals: detectTerms(text, ["reviews", "rated", "testimonials", "as seen in", "customers"]),
    trustSignals: detectTerms(text, ["returns", "guarantee", "warranty", "secure", "authentic", "free shipping"]),
    detectedApps: unique([...detectApps(html, REVIEW_APP_PATTERNS), ...detectApps(html, UPSELL_APP_PATTERNS)])
  };
}

function buildFacts(evidence: StoreEvidence): string[] {
  const total = evidence.catalog.analyzedProducts;
  const sampledPdps = evidence.pdp.sampledProducts;
  const collectionSample = evidence.collections.sampledCollections;
  const facts = [
    `Store: ${evidence.store.domain} was confirmed as Shopify: ${String(evidence.store.platformConfirmed)}.`,
    `Catalog: ${total} products were analyzed from Shopify product JSON.`,
    `Catalog: ${evidence.catalog.singleImageProducts} of ${total} analyzed products have exactly one image (${percent(evidence.catalog.singleImageProducts, total)}).`,
    `Catalog: ${evidence.catalog.noImageProducts} of ${total} analyzed products have no images (${percent(evidence.catalog.noImageProducts, total)}).`,
    `Catalog: ${evidence.catalog.thinDescriptionProducts} of ${total} analyzed products have descriptions under ${THIN_DESCRIPTION_CHARS} characters (${percent(evidence.catalog.thinDescriptionProducts, total)}).`,
    `Catalog: ${evidence.catalog.outOfStockProducts} of ${total} analyzed products are fully out of stock (${percent(evidence.catalog.outOfStockProducts, total)}).`,
    `Catalog: ${evidence.catalog.productsWithoutTags} of ${total} analyzed products have no tags (${percent(evidence.catalog.productsWithoutTags, total)}).`,
    `Catalog: ${evidence.catalog.productsWithCompareAtPricing} of ${total} analyzed products use compare-at sale pricing (${percent(evidence.catalog.productsWithCompareAtPricing, total)}).`,
    `Catalog: price range across analyzed variants is ${formatMoney(evidence.catalog.priceMin)} to ${formatMoney(evidence.catalog.priceMax)}.`,
    `Catalog: newest analyzed product age is ${evidence.catalog.newestProductAgeDays ?? "unknown"} days.`,
    `Collections: ${evidence.collections.totalCollections} collections were found; ${collectionSample} collection pages were sampled.`,
    `Collections: ${evidence.collections.emptyCollections} of ${collectionSample} sampled collections are empty.`,
    `Collections: ${evidence.collections.sparseCollections} of ${collectionSample} sampled collections contain 1-3 products.`,
    `Collections: ${evidence.collections.largeCollections} of ${collectionSample} sampled collections contain more than 80 products.`,
    `Collections: ${evidence.collections.collectionsMissingDescriptions} of ${collectionSample} sampled collections have merchandising copy under 80 characters.`,
    `Collections: buyer-intent collection handles/titles detected - sale=${evidence.collections.buyerIntentCollections.sale}, bestsellers=${evidence.collections.buyerIntentCollections.bestsellers}, new=${evidence.collections.buyerIntentCollections.new}.`,
    `Collections: filter or sort UI was detected on sampled collection HTML: ${String(evidence.collections.filterOrSortDetected)}.`,
    `PDP sample: ${sampledPdps} product detail pages were sampled.`,
    `PDP sample: aggregateRating or review JSON-LD was detected on ${evidence.pdp.aggregateRatingMarkupProducts} of ${sampledPdps} sampled PDPs.`,
    `PDP sample: Product JSON-LD was detected on ${evidence.pdp.productJsonLdProducts} of ${sampledPdps} sampled PDPs.`,
    `PDP sample: Offer JSON-LD was detected on ${evidence.pdp.offerJsonLdProducts} of ${sampledPdps} sampled PDPs.`,
    `PDP sample: Add-to-cart copy was detected on ${evidence.pdp.addToCartDetectedProducts} of ${sampledPdps} sampled PDPs.`,
    `PDP sample: shipping, returns, guarantee, or delivery trust copy appeared on ${evidence.pdp.trustCopyProducts} of ${sampledPdps} sampled PDPs.`,
    `PDP sample: detected review apps were ${evidence.pdp.detectedReviewApps.join(", ") || "none"}.`,
    `Cart: cart HTML was available: ${String(evidence.cart.htmlAvailable)}; cart JSON was available: ${String(evidence.cart.cartJsonAvailable)}.`,
    `Cart: free-shipping or free-delivery messaging detected: ${String(evidence.cart.freeShippingMessaging)}${evidence.cart.freeShippingThreshold ? ` with visible threshold ${evidence.cart.freeShippingThreshold}` : ""}.`,
    `Cart: upsell or cross-sell signals detected were ${evidence.cart.upsellSignals.join(", ") || "none"}.`,
    `Cart: trust signals detected were ${evidence.cart.trustSignals.join(", ") || "none"}.`,
    `Cart: estimated delivery messaging detected: ${String(evidence.cart.estimatedDeliveryDetected)}.`,
    `Merchandising: homepage value proposition candidate was "${evidence.merchandising.valuePropCandidate ?? "none detected"}".`,
    `Merchandising: homepage search affordance detected: ${String(evidence.merchandising.hasSearch)}.`,
    `Merchandising: ${evidence.merchandising.navLinkCount} unique header/nav labels were detected.`,
    `Merchandising: bestsellers, new arrivals, popular, or trending language detected: ${String(evidence.merchandising.bestsellerOrNewSignals)}.`,
    `Merchandising: homepage social-proof terms detected were ${evidence.merchandising.socialProofSignals.join(", ") || "none"}.`,
    `Merchandising: homepage trust terms detected were ${evidence.merchandising.trustSignals.join(", ") || "none"}.`
  ];

  if (evidence.catalog.repeatedTitlePrefixes.length > 0) {
    facts.push(
      `Catalog: repeated title prefixes include ${evidence.catalog.repeatedTitlePrefixes
        .slice(0, 3)
        .map((item) => `"${item.prefix}" on ${item.count} products`)
        .join("; ")}.`
    );
  }

  for (const product of evidence.pdp.products.slice(0, 5)) {
    facts.push(
      `PDP sample product "${product.title}": ${product.imageCount} images, ${product.altTextCount} image alt texts, ${product.descriptionLength} description characters, ${product.variantCount} variants, aggregateRating=${product.hasAggregateRating}.`
    );
  }

  return facts;
}

function detectBuyerIntentCollections(collections: ShopifyCollection[]) {
  const titles = collections
    .map((collection) => `${collection.title ?? ""} ${collection.handle ?? ""}`)
    .join("\n");

  return {
    sale: BUYER_INTENT_COLLECTIONS.sale.test(titles),
    bestsellers: BUYER_INTENT_COLLECTIONS.bestsellers.test(titles),
    new: BUYER_INTENT_COLLECTIONS.new.test(titles)
  };
}

function parseJsonLd($: CheerioAPI): Array<Record<string, unknown>> {
  const nodes: Array<Record<string, unknown>> = [];

  $("script").each((_, element) => {
    const type = $(element).attr("type") ?? "";
    if (!/ld\+json/i.test(type)) {
      return;
    }

    const raw = $(element).html() ?? $(element).text();
    try {
      collectJsonLdNode(JSON.parse(raw), nodes);
    } catch {
      return;
    }
  });

  return nodes;
}

function collectJsonLdNode(value: unknown, nodes: Array<Record<string, unknown>>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdNode(item, nodes));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  nodes.push(record);

  if (Array.isArray(record["@graph"])) {
    record["@graph"].forEach((item) => collectJsonLdNode(item, nodes));
  }
}

function typeIncludes(node: Record<string, unknown>, expectedType: string): boolean {
  const type = node["@type"];
  if (Array.isArray(type)) {
    return type.some((item) => String(item).toLowerCase() === expectedType.toLowerCase());
  }

  return String(type ?? "").toLowerCase() === expectedType.toLowerCase();
}

function visibleText($: CheerioAPI): string {
  $("script, style, noscript, svg").remove();
  return cleanText($("body").text());
}

function stripHtml(html: string): string {
  return cleanText(html.replace(/<[^>]+>/g, " "));
}

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseTags(tags: ShopifyProduct["tags"]): string[] {
  if (Array.isArray(tags)) {
    return unique(tags.map(cleanText).filter(Boolean));
  }

  return unique(
    String(tags ?? "")
      .split(",")
      .map(cleanText)
      .filter(Boolean)
  );
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function detectApps(html: string, apps: Array<{ label: string; pattern: RegExp }>): string[] {
  return apps.filter((app) => app.pattern.test(html)).map((app) => app.label);
}

function detectTerms(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase()));
}

function detectCurrencyAmountNear(text: string, anchor: RegExp): string | null {
  const match = anchor.exec(text);
  if (!match) {
    return null;
  }

  const start = Math.max(0, match.index - 120);
  const end = Math.min(text.length, match.index + 180);
  const nearby = text.slice(start, end);
  const amount = nearby.match(/(?:₹|rs\.?|inr|\$|usd|£|€)\s?[\d,.]+|[\d,.]+\s?(?:rs|inr|usd|dollars)/i);
  return amount?.[0].replace(/[.,]+$/, "") ?? null;
}

function percent(count: number, total: number): string {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((count / total) * 100)}%`;
}

function formatMoney(value: number | null): string {
  return value === null ? "unknown" : String(value);
}

function getNewestProductAgeDays(products: ProductEvidence[]): number | null {
  const timestamps = products
    .map((product) => (product.publishedAt ? Date.parse(product.publishedAt) : Number.NaN))
    .filter(Number.isFinite);

  if (timestamps.length === 0) {
    return null;
  }

  const newest = Math.max(...timestamps);
  return Math.max(0, Math.floor((Date.now() - newest) / 86_400_000));
}

function getRepeatedTitlePrefixes(products: ProductEvidence[]): Array<{ prefix: string; count: number }> {
  const counts = new Map<string, number>();

  for (const product of products) {
    const prefix = product.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");

    if (prefix.length > 3) {
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([prefix, count]) => ({ prefix, count }))
    .sort((a, b) => b.count - a.count);
}
