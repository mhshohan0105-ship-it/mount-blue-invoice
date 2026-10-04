"use client";

import { getLastCatalogSyncAt, syncProductsFromCatalog, type CatalogItem } from "./store";

/** Pull the product list from the shop website and merge it into this browser's products. */
export async function syncFromWebsite(): Promise<{ added: number; updated: number; total: number }> {
  let res: Response;
  try {
    res = await fetch("/api/catalog", { cache: "no-store" });
  } catch {
    throw new Error("No internet connection");
  }
  if (res.redirected || !res.headers.get("content-type")?.includes("json")) {
    throw new Error("Your login expired. Log in again and retry.");
  }
  const data = (await res.json()) as { items?: CatalogItem[]; error?: string };
  if (!res.ok || !data.items) throw new Error(data.error ?? "Could not load products from the website");
  const result = await syncProductsFromCatalog(data.items);
  return { ...result, total: data.items.length };
}

/** First run: fill an empty product list from the website once. Never throws. */
export async function autoSyncIfEmpty(productCount: number): Promise<boolean> {
  if (productCount > 0) return false;
  try {
    if (await getLastCatalogSyncAt()) return false;
    const { added } = await syncFromWebsite();
    return added > 0;
  } catch {
    return false;
  }
}
