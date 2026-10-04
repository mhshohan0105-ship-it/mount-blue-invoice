// All app data lives in this browser's IndexedDB. Nothing is sent to a server.
// Data is per browser/device: use Settings -> Backup to move or safeguard it.
import { computeTotals, lineTotal } from "./calc";
import { monthStartDhaka, normalizePhone, todayDhaka } from "./format";
import { backupSchema, firstIssue, orderInputSchema, productInputSchema, settingsSchema } from "./validation";
import type { Customer, OrderInput, OrderStatus, OrderWithItems, Product, Settings } from "./types";
import { ORDER_STATUSES } from "./types";

export const PAGE_SIZE = 50;
export const FIRST_MEMO_NO = 3849;

export const DEFAULT_SETTINGS: Settings = {
  shop_name: "MOUNT BLUE",
  address: "Mukto Bangla Shopping Complex, 2nd Floor, Shop 273, 274, Mazar Road, Mirpur 1, Dhaka",
  phone: "01755990789",
  logo_data: null,
  footer_text: "Thank you for shopping with Mount Blue",
  facebook_url: "facebook.com/mountblue",
  delivery_zones: [
    { name: "Inside Dhaka", charge: 70 },
    { name: "Outside Dhaka", charge: 130 },
  ],
  couriers: ["Steadfast", "Pathao", "RedX"],
  add_delivery_to_cod: true,
  memo_color: "#0a0a0a",
  memo_color2: null,
};

// ---------- IndexedDB plumbing ----------

const DB_NAME = "mount-blue-memo";
const DB_VERSION = 1;
type StoreName = "customers" | "products" | "orders" | "meta";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("This browser cannot store data"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        const customers = db.createObjectStore("customers", { keyPath: "id", autoIncrement: true });
        customers.createIndex("phone", "phone", { unique: true });
        db.createObjectStore("products", { keyPath: "id", autoIncrement: true });
        const orders = db.createObjectStore("orders", { keyPath: "id", autoIncrement: true });
        orders.createIndex("memo_no", "memo_no", { unique: true });
        orders.createIndex("customer_id", "customer_id");
        db.createObjectStore("meta");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("Close other tabs of this app and reload"));
    });
    // Ask the browser not to evict our data when space runs low.
    navigator.storage?.persist?.().catch(() => {});
  }
  return dbPromise;
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** Run fn inside one transaction; it commits only if fn succeeds. Only await IDB requests inside fn. */
async function run<T>(stores: StoreName[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await openDb();
  const t = db.transaction(stores, mode);
  const finished = new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error("Save cancelled"));
  });
  try {
    const result = await fn(t);
    await finished;
    return result;
  } catch (e) {
    try {
      t.abort();
    } catch {
      /* already finished */
    }
    finished.catch(() => {});
    throw e;
  }
}

const all = <T>(t: IDBTransaction, store: StoreName) => req(t.objectStore(store).getAll()) as Promise<T[]>;

async function readSettings(t: IDBTransaction): Promise<Settings> {
  const s = (await req(t.objectStore("meta").get("settings"))) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...s };
}

async function readNextMemo(t: IDBTransaction): Promise<number> {
  return ((await req(t.objectStore("meta").get("next_memo_no"))) as number | undefined) ?? FIRST_MEMO_NO;
}

async function maxMemo(t: IDBTransaction): Promise<number> {
  const cursor = await req(t.objectStore("orders").index("memo_no").openCursor(null, "prev"));
  return cursor ? (cursor.value as OrderWithItems).memo_no : 0;
}

// ---------- settings ----------

export function getSettings(): Promise<Settings> {
  return run(["meta"], "readonly", readSettings);
}

export function getNextMemoNo(): Promise<number> {
  return run(["meta"], "readonly", readNextMemo);
}

export async function saveSettings(input: Settings, nextMemoNo: number): Promise<void> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  if (!Number.isInteger(nextMemoNo) || nextMemoNo < 1) throw new Error("Next memo number must be a positive number");

  await run(["meta", "orders"], "readwrite", async (t) => {
    const max = await maxMemo(t);
    if (nextMemoNo <= max) throw new Error(`Next memo number must be greater than ${max}`);
    const meta = t.objectStore("meta");
    await req(meta.put(parsed.data, "settings"));
    await req(meta.put(nextMemoNo, "next_memo_no"));
  });
}

// ---------- products ----------

export async function listProducts(activeOnly = false): Promise<Product[]> {
  const products = await run(["products"], "readonly", (t) => all<Product>(t, "products"));
  return products
    .filter((p) => !activeOnly || p.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveProduct(
  id: number | null,
  input: Pick<Product, "name" | "default_price" | "active">,
): Promise<void> {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  await run(["products"], "readwrite", async (t) => {
    const store = t.objectStore("products");
    if (id) {
      const prev = (await req(store.get(id))) as Product | undefined;
      await req(store.put({ ...prev, ...parsed.data, id }));
    } else await req(store.add(parsed.data));
  });
}

export type CatalogItem = { name: string; price: number; sizes: string[]; available: boolean; category: string };

/**
 * Merge the website catalogue into local products, matching by name
 * (case-insensitive). New products are added; existing ones get the website
 * price, sizes and stock status (sold out -> inactive).
 */
export async function syncProductsFromCatalog(items: CatalogItem[]): Promise<{ added: number; updated: number }> {
  return run(["products", "meta"], "readwrite", async (t) => {
    const store = t.objectStore("products");
    const existing = new Map(
      ((await req(store.getAll())) as Product[]).map((p) => [p.name.trim().toLowerCase(), p]),
    );
    let added = 0;
    let updated = 0;
    for (const item of items) {
      const fields = {
        name: item.name,
        default_price: item.price,
        active: item.available,
        sizes: item.sizes,
        category: item.category,
        from_website: true,
      };
      const prev = existing.get(item.name.trim().toLowerCase());
      if (prev) {
        const changed =
          prev.default_price !== fields.default_price ||
          prev.active !== fields.active ||
          (prev.sizes ?? []).join("|") !== fields.sizes.join("|");
        if (changed) {
          await req(store.put({ ...prev, ...fields, name: prev.name }));
          updated++;
        }
      } else {
        await req(store.add(fields));
        existing.set(item.name.trim().toLowerCase(), { ...fields, id: 0 });
        added++;
      }
    }
    await req(t.objectStore("meta").put(new Date().toISOString(), "last_catalog_sync_at"));
    return { added, updated };
  });
}

export async function getLastCatalogSyncAt(): Promise<string | null> {
  return run(["meta"], "readonly", async (t) => ((await req(t.objectStore("meta").get("last_catalog_sync_at"))) as string) ?? null);
}

// ---------- orders ----------

export async function saveOrder(input: OrderInput): Promise<{ id: number; memo_no: number }> {
  const parsed = orderInputSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  const o = parsed.data;

  return run(["orders", "customers", "meta"], "readwrite", async (t) => {
    const settings = await readSettings(t);
    const totals = computeTotals({
      items: o.items,
      deliveryCharge: o.delivery_charge,
      paymentType: o.payment_type,
      addDeliveryToCod: settings.add_delivery_to_cod,
    });

    // upsert the customer by phone
    const customers = t.objectStore("customers");
    const existing = (await req(customers.index("phone").get(o.customer_phone))) as Customer | undefined;
    let customer_id: number;
    if (existing) {
      await req(customers.put({ ...existing, name: o.customer_name, address: o.customer_address }));
      customer_id = existing.id;
    } else {
      customer_id = Number(
        await req(
          customers.add({
            name: o.customer_name,
            phone: o.customer_phone,
            address: o.customer_address,
            created_at: new Date().toISOString(),
          }),
        ),
      );
    }

    const orders = t.objectStore("orders");
    const fields = {
      date: o.date,
      customer_id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      courier: o.courier,
      delivery_zone: o.delivery_zone,
      delivery_charge: totals.deliveryCharge,
      subtotal: totals.subtotal,
      cod_amount: totals.codAmount,
      payment_type: o.payment_type,
      note: o.note,
    };

    if (o.id) {
      const prev = (await req(orders.get(o.id))) as OrderWithItems | undefined;
      if (!prev) throw new Error("Order not found");
      const order: OrderWithItems = { ...prev, ...fields, order_items: [] };
      order.order_items = o.items.map((i, idx) => ({
        ...i,
        id: idx + 1,
        order_id: prev.id,
        line_total: lineTotal(i.qty, i.unit_price),
      }));
      await req(orders.put(order));
      return { id: prev.id, memo_no: prev.memo_no };
    }

    let memo_no = await readNextMemo(t);
    while (await req(orders.index("memo_no").getKey(memo_no))) memo_no++;
    const draft = {
      ...fields,
      memo_no,
      status: "pending" as OrderStatus,
      consignment_id: null,
      tracking_code: null,
      created_at: new Date().toISOString(),
      order_items: [] as OrderWithItems["order_items"],
    };
    const id = Number(await req(orders.add(draft)));
    draft.order_items = o.items.map((i, idx) => ({
      ...i,
      id: idx + 1,
      order_id: id,
      line_total: lineTotal(i.qty, i.unit_price),
    }));
    await req(orders.put({ ...draft, id }));
    await req(t.objectStore("meta").put(memo_no + 1, "next_memo_no"));
    return { id, memo_no };
  });
}

export function getOrder(id: number): Promise<OrderWithItems | null> {
  return run(["orders"], "readonly", async (t) => ((await req(t.objectStore("orders").get(id))) as OrderWithItems) ?? null);
}

export async function getOrdersByIds(ids: number[]): Promise<OrderWithItems[]> {
  const found = await run(["orders"], "readonly", (t) =>
    Promise.all(ids.map((id) => req(t.objectStore("orders").get(id)) as Promise<OrderWithItems | undefined>)),
  );
  return found.filter((o): o is OrderWithItems => !!o);
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<void> {
  if (!ORDER_STATUSES.includes(status)) throw new Error("Invalid status");
  await run(["orders"], "readwrite", async (t) => {
    const store = t.objectStore("orders");
    const order = (await req(store.get(id))) as OrderWithItems | undefined;
    if (!order) throw new Error("Order not found");
    await req(store.put({ ...order, status }));
  });
}

export async function deleteOrder(id: number): Promise<void> {
  await run(["orders"], "readwrite", async (t) => {
    await req(t.objectStore("orders").delete(id));
  });
}

export type OrderFilters = { q?: string; from?: string; to?: string; status?: OrderStatus | ""; page?: number };

export async function listOrders(f: OrderFilters): Promise<{ rows: OrderWithItems[]; total: number }> {
  const orders = await run(["orders"], "readonly", (t) => all<OrderWithItems>(t, "orders"));
  const term = (f.q ?? "").trim().toLowerCase();
  const memo = term.replace(/^#/, "");
  const phoneTerm = normalizePhone(term);

  const rows = orders
    .filter((o) => {
      if (f.status && o.status !== f.status) return false;
      if (f.from && o.date < f.from) return false;
      if (f.to && o.date > f.to) return false;
      if (!term) return true;
      return (
        String(o.memo_no) === memo ||
        o.customer_name.toLowerCase().includes(term) ||
        (phoneTerm.length >= 3 && o.customer_phone.includes(phoneTerm))
      );
    })
    .sort((a, b) => b.memo_no - a.memo_no);

  const page = Math.max(1, f.page ?? 1);
  return { rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: rows.length };
}

export async function getOrderStats() {
  const orders = await run(["orders"], "readonly", (t) => all<OrderWithItems>(t, "orders"));
  const today = todayDhaka();
  const monthStart = monthStartDhaka();
  const stats = { todayCount: 0, todayCod: 0, monthCount: 0, monthCod: 0 };
  for (const o of orders) {
    if (o.date < monthStart || o.date > today) continue;
    const cod = o.status === "returned" ? 0 : o.cod_amount;
    stats.monthCount++;
    stats.monthCod += cod;
    if (o.date === today) {
      stats.todayCount++;
      stats.todayCod += cod;
    }
  }
  return stats;
}

// ---------- customers ----------

export type CustomerRow = Customer & { order_count: number };

export async function listCustomers(search: string, page = 1): Promise<{ rows: CustomerRow[]; total: number }> {
  const [customers, orders] = await run(["customers", "orders"], "readonly", (t) =>
    Promise.all([all<Customer>(t, "customers"), all<OrderWithItems>(t, "orders")]),
  );
  const counts = new Map<number, number>();
  for (const o of orders) if (o.customer_id) counts.set(o.customer_id, (counts.get(o.customer_id) ?? 0) + 1);

  const term = search.trim().toLowerCase();
  const rows = customers
    .filter(
      (c) =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.address.toLowerCase().includes(term),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((c) => ({ ...c, order_count: counts.get(c.id) ?? 0 }));

  return { rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: rows.length };
}

export async function getCustomerWithOrders(id: number) {
  return run(["customers", "orders"], "readonly", async (t) => {
    const customer = (await req(t.objectStore("customers").get(id))) as Customer | undefined;
    if (!customer) return null;
    const orders = (await req(t.objectStore("orders").index("customer_id").getAll(id))) as OrderWithItems[];
    return { customer, orders: orders.sort((a, b) => b.memo_no - a.memo_no) };
  });
}

export async function findCustomerByPhone(phone: string): Promise<CustomerRow | null> {
  const p = normalizePhone(phone);
  if (p.length < 10) return null;
  return run(["customers", "orders"], "readonly", async (t) => {
    const c = (await req(t.objectStore("customers").index("phone").get(p))) as Customer | undefined;
    if (!c) return null;
    const order_count = await req(t.objectStore("orders").index("customer_id").count(c.id));
    return { ...c, order_count };
  });
}

// ---------- backup ----------

export async function exportBackup(): Promise<string> {
  const data = await run(["customers", "products", "orders", "meta"], "readwrite", async (t) => {
    const [settings, next_memo_no, customers, products, orders] = await Promise.all([
      readSettings(t),
      readNextMemo(t),
      all<Customer>(t, "customers"),
      all<Product>(t, "products"),
      all<OrderWithItems>(t, "orders"),
    ]);
    const exported_at = new Date().toISOString();
    await req(t.objectStore("meta").put(exported_at, "last_backup_at"));
    return { app: "mount-blue-memo", version: 1, exported_at, settings, next_memo_no, customers, products, orders };
  });
  return JSON.stringify(data);
}

export async function importBackup(json: string): Promise<{ orders: number; customers: number; products: number }> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("That file is not a valid backup");
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Not a MOUNT BLUE backup (${firstIssue(parsed.error)})`);
  const b = parsed.data;

  await run(["customers", "products", "orders", "meta"], "readwrite", async (t) => {
    for (const s of ["customers", "products", "orders", "meta"] as const) await req(t.objectStore(s).clear());
    for (const c of b.customers) await req(t.objectStore("customers").put(c));
    for (const p of b.products) await req(t.objectStore("products").put(p));
    for (const o of b.orders) await req(t.objectStore("orders").put(o));
    const meta = t.objectStore("meta");
    await req(meta.put(b.settings, "settings"));
    await req(meta.put(b.next_memo_no, "next_memo_no"));
    await req(meta.put(b.exported_at, "last_backup_at"));
  });
  return { orders: b.orders.length, customers: b.customers.length, products: b.products.length };
}

export async function getLastBackupAt(): Promise<string | null> {
  return run(["meta"], "readonly", async (t) => ((await req(t.objectStore("meta").get("last_backup_at"))) as string) ?? null);
}
