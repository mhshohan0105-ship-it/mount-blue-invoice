// Reads the public product feed of the MOUNT BLUE Shopify store so the app
// can sync product names and prices. Protected by the login proxy.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STORE_URL = process.env.SHOP_WEBSITE_URL || "https://www.mountblue4u.com";
const MAX_PAGES = 20; // 250 products per page

type ShopifyProduct = {
  title: string;
  product_type: string;
  options: { name: string; values: string[] }[];
  variants: { price: string; available: boolean }[];
};

export type CatalogItem = {
  name: string;
  price: number;
  sizes: string[];
  available: boolean;
  category: string;
};

export async function GET() {
  try {
    const items: CatalogItem[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${STORE_URL}/products.json?limit=250&page=${page}`, {
        headers: { "User-Agent": "MountBlueMemo/1.0" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Website returned ${res.status}`);
      const { products } = (await res.json()) as { products: ShopifyProduct[] };
      if (!products?.length) break;

      for (const p of products) {
        const prices = p.variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n));
        items.push({
          name: p.title.trim().replace(/\s+/g, " "),
          price: prices.length ? Math.min(...prices) : 0,
          sizes: p.options.flatMap((o) => o.values).filter((v) => v && v !== "Default Title"),
          available: p.variants.some((v) => v.available),
          category: p.product_type ?? "",
        });
      }
      if (products.length < 250) break;
    }
    return NextResponse.json({ source: STORE_URL, items });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not read products from ${STORE_URL}: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }
}
