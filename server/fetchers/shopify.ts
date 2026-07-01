import { NonShopifyError } from "../utils/errors";
import { fetchJson, fetchText, type FetchResult } from "../utils/http";
import { endpoint, normalizeStoreUrl, type NormalizedStoreUrl } from "../utils/url";

const PRODUCT_PAGE_LIMIT = 250;
const MAX_PRODUCTS = 500;
const MAX_COLLECTIONS_TO_SAMPLE = 10;
const MAX_PDPS_TO_SAMPLE = 8;

export interface ShopifyImage {
  src?: string;
  alt?: string | null;
  alt_text?: string | null;
}

export interface ShopifyVariant {
  id?: number;
  title?: string;
  price?: string;
  compare_at_price?: string | null;
  available?: boolean;
  inventory_quantity?: number;
}

export interface ShopifyOption {
  name?: string;
  values?: string[];
}

export interface ShopifyProduct {
  id?: number;
  title?: string;
  handle?: string;
  body_html?: string | null;
  vendor?: string;
  product_type?: string;
  tags?: string[] | string;
  published_at?: string | null;
  updated_at?: string | null;
  images?: ShopifyImage[];
  options?: ShopifyOption[];
  variants?: ShopifyVariant[];
}

export interface ShopifyCollection {
  id?: number;
  title?: string;
  handle?: string;
  body_html?: string | null;
  updated_at?: string | null;
  products_count?: number;
}

interface ProductsResponse {
  products?: ShopifyProduct[];
}

interface ProductResponse {
  product?: ShopifyProduct;
}

interface CollectionsResponse {
  collections?: ShopifyCollection[];
}

export interface CollectionSampleRaw {
  collection: ShopifyCollection;
  products: ShopifyProduct[];
  html?: string;
  errors: string[];
}

export interface PdpSampleRaw {
  catalogProduct: ShopifyProduct;
  product?: ShopifyProduct;
  html?: string;
  errors: string[];
}

export interface RawStorefrontData {
  normalized: NormalizedStoreUrl;
  products: ShopifyProduct[];
  collections: ShopifyCollection[];
  collectionSamples: CollectionSampleRaw[];
  pdpSamples: PdpSampleRaw[];
  homepageHtml?: string;
  cartHtml?: string;
  cartJsonAvailable: boolean;
  platformConfirmed: boolean;
  warnings: string[];
}

export async function collectRawStorefront(input: string): Promise<RawStorefrontData> {
  const normalized = normalizeStoreUrl(input);
  const warnings: string[] = [];

  const [homeResult, firstProductPage] = await Promise.all([
    fetchText(endpoint(normalized.origin, "/")),
    fetchJson<ProductsResponse>(
      endpoint(normalized.origin, `/products.json?limit=${PRODUCT_PAGE_LIMIT}&page=1`)
    )
  ]);

  const homepageHtml = homeResult.ok ? homeResult.data : undefined;
  const platformConfirmed =
    firstProductPage.ok || hasShopifyMarkers(homepageHtml, firstProductPage);

  if (!platformConfirmed) {
    throw new NonShopifyError(normalized.domain);
  }

  if (!firstProductPage.ok) {
    warnings.push(
      `/products.json was unavailable (${firstProductPage.error}); continuing with limited HTML evidence.`
    );
  }

  const products = firstProductPage.ok
    ? await fetchProductPages(normalized.origin, firstProductPage.data.products ?? [], warnings)
    : [];

  const collections = await fetchCollections(normalized.origin, warnings);
  const [collectionSamples, pdpSamples, cartHtmlResult, cartJsonResult] = await Promise.all([
    fetchCollectionSamples(normalized.origin, collections),
    fetchPdpSamples(normalized.origin, products),
    fetchText(endpoint(normalized.origin, "/cart")),
    fetchJson<unknown>(endpoint(normalized.origin, "/cart.json"), 8_000)
  ]);

  if (!cartHtmlResult.ok) {
    warnings.push(`/cart HTML was unavailable (${cartHtmlResult.error}).`);
  }

  if (!cartJsonResult.ok) {
    warnings.push(`/cart.json was unavailable (${cartJsonResult.error}).`);
  }

  return {
    normalized,
    products,
    collections,
    collectionSamples,
    pdpSamples,
    homepageHtml,
    cartHtml: cartHtmlResult.ok ? cartHtmlResult.data : undefined,
    cartJsonAvailable: cartJsonResult.ok,
    platformConfirmed,
    warnings
  };
}

function hasShopifyMarkers(homepageHtml: string | undefined, productsResult: FetchResult<unknown>): boolean {
  const html = homepageHtml ?? "";
  const headerSignals =
    productsResult.ok &&
    [...productsResult.headers.entries()].some(([key, value]) =>
      `${key}:${value}`.toLowerCase().includes("shopify")
    );

  return (
    headerSignals ||
    /cdn\.shopify\.com|shopify\.theme|myshopify\.com|Shopify\.routes|shopify-section/i.test(html)
  );
}

async function fetchProductPages(
  origin: string,
  firstPageProducts: ShopifyProduct[],
  warnings: string[]
): Promise<ShopifyProduct[]> {
  const products = [...firstPageProducts];
  const maxPages = Math.ceil(MAX_PRODUCTS / PRODUCT_PAGE_LIMIT);

  for (let page = 2; page <= maxPages; page += 1) {
    if (products.length >= MAX_PRODUCTS) {
      break;
    }

    const result = await fetchJson<ProductsResponse>(
      endpoint(origin, `/products.json?limit=${PRODUCT_PAGE_LIMIT}&page=${page}`)
    );

    if (!result.ok) {
      warnings.push(`Stopped catalog pagination at page ${page}: ${result.error}.`);
      break;
    }

    const pageProducts = result.data.products ?? [];
    if (pageProducts.length === 0) {
      break;
    }

    products.push(...pageProducts);
  }

  return products.slice(0, MAX_PRODUCTS);
}

async function fetchCollections(origin: string, warnings: string[]): Promise<ShopifyCollection[]> {
  const result = await fetchJson<CollectionsResponse>(
    endpoint(origin, `/collections.json?limit=${PRODUCT_PAGE_LIMIT}`)
  );

  if (!result.ok) {
    warnings.push(`/collections.json was unavailable (${result.error}).`);
    return [];
  }

  return result.data.collections ?? [];
}

async function fetchCollectionSamples(
  origin: string,
  collections: ShopifyCollection[]
): Promise<CollectionSampleRaw[]> {
  const sample = collections.filter((collection) => collection.handle).slice(0, MAX_COLLECTIONS_TO_SAMPLE);

  return limitedMap(sample, 3, async (collection) => {
    const errors: string[] = [];
    const handle = collection.handle as string;
    const [productsResult, htmlResult] = await Promise.all([
      fetchJson<ProductsResponse>(
        endpoint(origin, `/collections/${encodeURIComponent(handle)}/products.json?limit=250`)
      ),
      fetchText(endpoint(origin, `/collections/${encodeURIComponent(handle)}`), 8_000)
    ]);

    if (!productsResult.ok) {
      errors.push(`products unavailable: ${productsResult.error}`);
    }

    if (!htmlResult.ok) {
      errors.push(`HTML unavailable: ${htmlResult.error}`);
    }

    return {
      collection,
      products: productsResult.ok ? productsResult.data.products ?? [] : [],
      html: htmlResult.ok ? htmlResult.data : undefined,
      errors
    };
  });
}

async function fetchPdpSamples(origin: string, products: ShopifyProduct[]): Promise<PdpSampleRaw[]> {
  const sample = selectPdpSample(products);

  return limitedMap(sample, 4, async (catalogProduct) => {
    const errors: string[] = [];
    const handle = catalogProduct.handle;

    if (!handle) {
      return { catalogProduct, errors: ["missing product handle"] };
    }

    const [productResult, htmlResult] = await Promise.all([
      fetchJson<ProductResponse>(endpoint(origin, `/products/${encodeURIComponent(handle)}.json`), 8_000),
      fetchText(endpoint(origin, `/products/${encodeURIComponent(handle)}`), 8_000)
    ]);

    if (!productResult.ok) {
      errors.push(`product JSON unavailable: ${productResult.error}`);
    }

    if (!htmlResult.ok) {
      errors.push(`HTML unavailable: ${htmlResult.error}`);
    }

    return {
      catalogProduct,
      product: productResult.ok ? productResult.data.product : undefined,
      html: htmlResult.ok ? htmlResult.data : undefined,
      errors
    };
  });
}

function selectPdpSample(products: ShopifyProduct[]): ShopifyProduct[] {
  const withHandles = products.filter((product) => product.handle);
  const early = withHandles.slice(0, Math.ceil(MAX_PDPS_TO_SAMPLE / 2));
  const thinOrSparse = withHandles.filter((product) => {
    const description = product.body_html ?? "";
    return stripHtml(description).length < 250 || (product.images?.length ?? 0) <= 1;
  });

  const byHandle = new Map<string, ShopifyProduct>();
  for (const product of [...early, ...thinOrSparse, ...withHandles]) {
    if (product.handle && byHandle.size < MAX_PDPS_TO_SAMPLE) {
      byHandle.set(product.handle, product);
    }
  }

  return [...byHandle.values()];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function limitedMap<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
