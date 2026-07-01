import { describe, expect, it } from "vitest";
import { analyzeRawStorefront } from "../server/analyzers/storeEvidence";
import type { RawStorefrontData } from "../server/fetchers/shopify";

describe("store evidence analyzer", () => {
  it("extracts catalog, PDP, cart, and merchandising facts", () => {
    const raw: RawStorefrontData = {
      normalized: {
        input: "https://example.com",
        origin: "https://example.com",
        domain: "example.com"
      },
      platformConfirmed: true,
      products: [
        {
          title: "Minimal Tee",
          handle: "minimal-tee",
          body_html: "<p>Short.</p>",
          tags: "",
          product_type: "Apparel",
          published_at: "2026-01-01T00:00:00Z",
          images: [{ src: "one.jpg", alt: "" }],
          variants: [{ price: "40.00", compare_at_price: "50.00", available: true }],
          options: [{ name: "Size", values: ["S", "M"] }]
        },
        {
          title: "Sold Out Jacket",
          handle: "sold-out-jacket",
          body_html: `<p>${"Detailed jacket copy. ".repeat(30)}</p>`,
          tags: ["outerwear"],
          product_type: "Apparel",
          images: [],
          variants: [{ price: "120.00", available: false }],
          options: [{ name: "Color", values: ["Black"] }]
        }
      ],
      collections: [
        {
          title: "New Arrivals",
          handle: "new-arrivals",
          body_html: "<p>Fresh drops.</p>"
        }
      ],
      collectionSamples: [
        {
          collection: {
            title: "New Arrivals",
            handle: "new-arrivals",
            body_html: "<p>Fresh drops.</p>"
          },
          products: [],
          html: "<html><body><select name='sort_by'><option>Sort by</option></select></body></html>",
          errors: []
        }
      ],
      pdpSamples: [
        {
          catalogProduct: {
            title: "Minimal Tee",
            handle: "minimal-tee",
            body_html: "<p>Short.</p>",
            images: [{ src: "one.jpg", alt: "" }],
            variants: [{ price: "40.00", available: true }],
            options: [{ name: "Size" }]
          },
          html: `
            <html>
              <body>Add to cart. Free shipping and returns.</body>
              <script type="application/ld+json">
                {"@type":"Product","name":"Minimal Tee","aggregateRating":{"ratingValue":"4.8"},"offers":{"@type":"Offer"}}
              </script>
            </html>
          `,
          errors: []
        }
      ],
      homepageHtml:
        "<html><body><header><a href='/search'>Search</a><a>New Arrivals</a></header><h1>Modern basics for work</h1><p>Rated by customers. Free shipping.</p></body></html>",
      cartHtml:
        "<html><body>Free shipping over $75. Secure checkout. Estimated delivery in 3 days.</body></html>",
      cartJsonAvailable: true,
      warnings: []
    };

    const evidence = analyzeRawStorefront(raw);

    expect(evidence.catalog.analyzedProducts).toBe(2);
    expect(evidence.catalog.singleImageProducts).toBe(1);
    expect(evidence.catalog.noImageProducts).toBe(1);
    expect(evidence.catalog.outOfStockProducts).toBe(1);
    expect(evidence.collections.buyerIntentCollections.new).toBe(true);
    expect(evidence.collections.filterOrSortDetected).toBe(true);
    expect(evidence.pdp.aggregateRatingMarkupProducts).toBe(1);
    expect(evidence.cart.freeShippingMessaging).toBe(true);
    expect(evidence.cart.freeShippingThreshold).toBe("$75");
    expect(evidence.merchandising.hasSearch).toBe(true);
    expect(evidence.facts.some((fact) => fact.includes("PDP sample: aggregateRating"))).toBe(true);
  });
});
