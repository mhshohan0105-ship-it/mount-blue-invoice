"use client";

// Reads orders saved by the earlier browser-only version of the app
// (IndexedDB "mount-blue-memo") so they can be moved into the database.

const DB_NAME = "mount-blue-memo";
const STORES = ["customers", "products", "orders", "meta"] as const;

async function openIfExists(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined" || !indexedDB.databases) return null;
  const dbs = await indexedDB.databases();
  if (!dbs.some((d) => d.name === DB_NAME)) return null;
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => {
      const db = req.result;
      resolve(STORES.every((s) => db.objectStoreNames.contains(s)) ? db : (db.close(), null));
    };
    req.onerror = () => resolve(null);
  });
}

function read<T>(db: IDBDatabase, store: string, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(store, "readonly").objectStore(store));
    r.onsuccess = () => resolve(r.result as T);
    r.onerror = () => reject(r.error);
  });
}

/** Backup JSON of the old browser data, or null if there is nothing to move. */
export async function readLegacyBrowserData(): Promise<{ json: string; orders: number; customers: number } | null> {
  const db = await openIfExists();
  if (!db) return null;
  try {
    const [customers, products, orders, settings, next] = await Promise.all([
      read<unknown[]>(db, "customers", (s) => s.getAll()),
      read<unknown[]>(db, "products", (s) => s.getAll()),
      read<unknown[]>(db, "orders", (s) => s.getAll()),
      read<object | undefined>(db, "meta", (s) => s.get("settings")),
      read<number | undefined>(db, "meta", (s) => s.get("next_memo_no")),
    ]);
    if (!orders.length && !customers.length) return null;
    return {
      orders: orders.length,
      customers: customers.length,
      json: JSON.stringify({
        app: "mount-blue-memo",
        version: 1,
        exported_at: new Date().toISOString(),
        settings: settings ?? {},
        next_memo_no: next ?? 3849,
        customers,
        products,
        orders,
      }),
    };
  } finally {
    db.close();
  }
}

/** Remove the old browser copy once it has been moved. */
export function deleteLegacyBrowserData(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
