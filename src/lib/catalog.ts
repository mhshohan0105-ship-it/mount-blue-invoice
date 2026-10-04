// Reads the public product feed of the MOUNT BLUE Shopify store. Server-only.
import type { CatalogItem } from "./types";

const STORE_URL = process.env.SHOP_WEBSITE_URL || "https://www.mountblue4u.com";
const MAX_PAGES = 20; // 250 products per page

type ShopifyProduct = {
  title: string;
  product_type: string;
  options: { name: string; values: string[] }[];
  variants: { price: string; available: boolean }[];
};

export async function fetchCatalog(): Promise<CatalogItem[]> {
  const items = new Map<string, CatalogItem>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    let res: Response;
    try {
      res = await fetch(`${STORE_URL}/products.json?limit=250&page=${page}`, {
        headers: { "User-Agent": "MountBlueMemo/1.0" },
        cache: "no-store",
      });
    } catch {
      throw new Error(`Could not reach ${STORE_URL}`);
    }
    if (!res.ok) throw new Error(`${STORE_URL} returned ${res.status}`);
    const { products } = (await res.json()) as { products: ShopifyProduct[] };
    if (!products?.length) break;

    for (const p of products) {
      const name = p.title.trim().replace(/\s+/g, " ");
      const prices = p.variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n));
      items.set(name.toLowerCase(), {
        name,
        price: prices.length ? Math.min(...prices) : 0,
        sizes: p.options.flatMap((o) => o.values).filter((v) => v && v !== "Default Title"),
        available: p.variants.some((v) => v.available),
        category: p.product_type ?? "",
      });
    }
    if (products.length < 250) break;
  }
  return [...items.values()];
}
