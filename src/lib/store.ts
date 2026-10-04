"use server";

// All app data lives in Postgres (Neon). Every export here is a server action
// callable from client components, so each one checks the login first.
import { computeTotals, lineTotal } from "./calc";
import { fetchCatalog } from "./catalog";
import { DEFAULT_SETTINGS, PAGE_SIZE } from "./constants";
import { getMeta, q, setMeta, type Row } from "./db";
import { monthStartDhaka, normalizePhone, todayDhaka } from "./format";
import { requireAuth } from "./session";
import { backupSchema, firstIssue, orderInputSchema, productInputSchema, settingsSchema } from "./validation";
import {
  ORDER_STATUSES,
  type Customer,
  type CustomerRow,
  type Order,
  type OrderFilters,
  type OrderInput,
  type OrderStatus,
  type OrderWithItems,
  type Product,
  type Settings,
} from "./types";

// ---------- helpers ----------

const ORDER_COLS = `o.id, o.memo_no, o.date::text as date, o.customer_id, o.customer_name, o.customer_phone,
  o.customer_address, o.courier, o.delivery_zone, o.delivery_charge::float8 as delivery_charge,
  o.subtotal::float8 as subtotal, o.cod_amount::float8 as cod_amount, o.payment_type, o.note, o.status,
  o.consignment_id, o.tracking_code, o.created_at::text as created_at`;

const ITEMS_JSON = `coalesce((
  select json_agg(json_build_object('id', i.id, 'order_id', i.order_id, 'product_name', i.product_name,
    'size', i.size, 'qty', i.qty, 'unit_price', i.unit_price::float8, 'line_total', i.line_total::float8)
    order by i.position, i.id)
  from order_items i where i.order_id = o.id), '[]'::json) as order_items`;

const PRODUCT_COLS = `id, name, default_price::float8 as default_price, active, sizes, category, from_website`;

/** Escape a user search term for ILIKE. */
const likeTerm = (s: string) => `%${s.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

const toOrder = (r: Row) => r as Order;
const toOrderWithItems = (r: Row) => r as OrderWithItems;

// ---------- settings ----------

export async function getSettings(): Promise<Settings> {
  await requireAuth();
  const rows = await q(`select data from settings where id = 1`);
  return { ...DEFAULT_SETTINGS, ...(rows[0]?.data ?? {}) };
}

export async function getNextMemoNo(): Promise<number> {
  await requireAuth();
  const rows = await q(`select get_next_memo_no() as n`);
  return Number(rows[0].n);
}

export async function saveSettings(input: Settings, nextMemoNo: number): Promise<void> {
  await requireAuth();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  if (!Number.isInteger(nextMemoNo) || nextMemoNo < 1) throw new Error("Next memo number must be a positive number");

  const [{ n }] = await q(`select get_next_memo_no() as n`);
  if (Number(n) !== nextMemoNo) {
    try {
      await q(`select set_next_memo_no($1)`, [nextMemoNo]);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message.replace(/^.*?(Next memo)/, "$1") : String(e));
    }
  }
  await q(
    `insert into settings (id, data) values (1, $1::jsonb) on conflict (id) do update set data = excluded.data`,
    [JSON.stringify(parsed.data)],
  );
}

// ---------- products ----------

export async function listProducts(activeOnly = false): Promise<Product[]> {
  await requireAuth();
  return (await q(
    `select ${PRODUCT_COLS} from products ${activeOnly ? "where active" : ""} order by lower(name)`,
  )) as Product[];
}

export async function countProducts(): Promise<number> {
  await requireAuth();
  const [{ n }] = await q(`select count(*)::int as n from products`);
  return n;
}

export async function saveProduct(
  id: number | null,
  input: Pick<Product, "name" | "default_price" | "active">,
): Promise<void> {
  await requireAuth();
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  const { name, default_price, active } = parsed.data;
  try {
    if (id) {
      await q(`update products set name = $1, default_price = $2, active = $3 where id = $4`, [
        name,
        default_price,
        active,
        id,
      ]);
    } else {
      await q(`insert into products (name, default_price, active) values ($1, $2, $3)`, [name, default_price, active]);
    }
  } catch (e) {
    if (String(e).includes("products_name_key")) throw new Error("A product with this name already exists");
    throw e;
  }
}

/**
 * Pull every product from the shop website and merge it in, matching by name
 * (case-insensitive). New products are added; existing ones get the website
 * price, sizes and stock status (sold out -> inactive).
 */
export async function syncFromWebsite(): Promise<{ added: number; updated: number; total: number }> {
  await requireAuth();
  const items = await fetchCatalog();
  const rows = await q(
    `insert into products (name, default_price, active, sizes, category, from_website)
     select x.name, x.price, x.available, x.sizes, x.category, true
     from jsonb_to_recordset($1::jsonb) as x(name text, price numeric, available boolean, sizes text[], category text)
     on conflict (lower(name)) do update set
       default_price = excluded.default_price, active = excluded.active, sizes = excluded.sizes,
       category = excluded.category, from_website = true
     where (products.default_price, products.active, products.sizes, products.category)
       is distinct from (excluded.default_price, excluded.active, excluded.sizes, excluded.category)
     returning (xmax = 0) as inserted`,
    [JSON.stringify(items)],
  );
  await setMeta("last_catalog_sync_at", new Date().toISOString());
  const added = rows.filter((r) => r.inserted).length;
  return { added, updated: rows.length - added, total: items.length };
}

export async function getLastCatalogSyncAt(): Promise<string | null> {
  await requireAuth();
  return getMeta<string>("last_catalog_sync_at");
}

/** First run: fill an empty product list from the website once. Never throws. */
export async function autoSyncIfEmpty(): Promise<boolean> {
  try {
    await requireAuth();
    const [{ n }] = await q(`select count(*)::int as n from products`);
    if (n > 0 || (await getMeta("last_catalog_sync_at"))) return false;
    const { added } = await syncFromWebsite();
    return added > 0;
  } catch {
    return false;
  }
}

// ---------- orders ----------

export async function saveOrder(input: OrderInput): Promise<{ id: number; memo_no: number }> {
  await requireAuth();
  const parsed = orderInputSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  const o = parsed.data;

  const settings = await getSettings();
  const totals = computeTotals({
    items: o.items,
    deliveryCharge: o.delivery_charge,
    paymentType: o.payment_type,
    addDeliveryToCod: settings.add_delivery_to_cod,
  });

  const payload = {
    ...o,
    delivery_charge: totals.deliveryCharge,
    subtotal: totals.subtotal,
    cod_amount: totals.codAmount,
    items: o.items.map((i) => ({ ...i, line_total: lineTotal(i.qty, i.unit_price) })),
  };
  try {
    const [row] = await q(`select * from save_order($1::jsonb)`, [JSON.stringify(payload)]);
    return { id: Number(row.id), memo_no: Number(row.memo_no) };
  } catch (e) {
    if (String(e).includes("Order not found")) throw new Error("Order not found");
    throw e;
  }
}

export async function getOrder(id: number): Promise<OrderWithItems | null> {
  await requireAuth();
  const rows = await q(`select ${ORDER_COLS}, ${ITEMS_JSON} from orders o where o.id = $1`, [id]);
  return rows[0] ? toOrderWithItems(rows[0]) : null;
}

export async function getOrdersByIds(ids: number[]): Promise<OrderWithItems[]> {
  await requireAuth();
  const clean = ids.filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  if (!clean.length) return [];
  const rows = await q(`select ${ORDER_COLS}, ${ITEMS_JSON} from orders o where o.id = any($1::int[])`, [clean]);
  const byId = new Map(rows.map((r) => [r.id as number, toOrderWithItems(r)]));
  return clean.map((id) => byId.get(id)).filter((o): o is OrderWithItems => !!o);
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<void> {
  await requireAuth();
  if (!ORDER_STATUSES.includes(status)) throw new Error("Invalid status");
  const rows = await q(`update orders set status = $1 where id = $2 returning id`, [status, id]);
  if (!rows.length) throw new Error("Order not found");
}

export async function deleteOrder(id: number): Promise<void> {
  await requireAuth();
  await q(`delete from orders where id = $1`, [id]);
}

export async function listOrders(f: OrderFilters): Promise<{ rows: Order[]; total: number }> {
  await requireAuth();
  const term = (f.q ?? "").trim();
  const memo = term.replace(/^#/, "");
  const phone = normalizePhone(term);
  const page = Math.max(1, f.page ?? 1);

  const rows = await q(
    `select ${ORDER_COLS}, count(*) over () as total
     from orders o
     where ($1 = '' or o.customer_name ilike $2 or ($3 <> '' and o.customer_phone like $4) or o.memo_no::text = $5)
       and ($6 = '' or o.date >= $6::date)
       and ($7 = '' or o.date <= $7::date)
       and ($8 = '' or o.status = $8)
     order by o.memo_no desc
     limit $9 offset $10`,
    [
      term,
      likeTerm(term),
      phone.length >= 3 ? phone : "",
      likeTerm(phone),
      memo,
      f.from ?? "",
      f.to ?? "",
      f.status ?? "",
      PAGE_SIZE,
      (page - 1) * PAGE_SIZE,
    ],
  );
  return { rows: rows.map(toOrder), total: rows[0] ? Number(rows[0].total) : 0 };
}

export async function getOrderStats() {
  await requireAuth();
  const [r] = await q(
    `select
       count(*) filter (where date = $1::date)::int as today_count,
       coalesce(sum(cod_amount) filter (where date = $1::date and status <> 'returned'), 0)::float8 as today_cod,
       count(*)::int as month_count,
       coalesce(sum(cod_amount) filter (where status <> 'returned'), 0)::float8 as month_cod
     from orders where date between $2::date and $1::date`,
    [todayDhaka(), monthStartDhaka()],
  );
  return { todayCount: r.today_count, todayCod: r.today_cod, monthCount: r.month_count, monthCod: r.month_cod };
}

// ---------- customers ----------

export async function listCustomers(search: string, page = 1): Promise<{ rows: CustomerRow[]; total: number }> {
  await requireAuth();
  const term = search.trim();
  const rows = await q(
    `select c.id, c.name, c.phone, c.address, c.created_at::text as created_at,
       (select count(*)::int from orders o where o.customer_id = c.id) as order_count,
       count(*) over () as total
     from customers c
     where $1 = '' or c.name ilike $2 or c.phone like $2 or c.address ilike $2
     order by c.created_at desc, c.id desc
     limit $3 offset $4`,
    [term, likeTerm(term), PAGE_SIZE, (Math.max(1, page) - 1) * PAGE_SIZE],
  );
  return { rows: rows as CustomerRow[], total: rows[0] ? Number(rows[0].total) : 0 };
}

export async function getCustomerWithOrders(id: number): Promise<{ customer: Customer; orders: Order[] } | null> {
  await requireAuth();
  const [customer] = await q(
    `select id, name, phone, address, created_at::text as created_at from customers where id = $1`,
    [id],
  );
  if (!customer) return null;
  const orders = await q(`select ${ORDER_COLS} from orders o where o.customer_id = $1 order by o.memo_no desc`, [id]);
  return { customer: customer as Customer, orders: orders.map(toOrder) };
}

export async function findCustomerByPhone(phone: string): Promise<CustomerRow | null> {
  await requireAuth();
  const p = normalizePhone(phone);
  if (p.length < 10) return null;
  const [row] = await q(
    `select c.id, c.name, c.phone, c.address, c.created_at::text as created_at,
       (select count(*)::int from orders o where o.customer_id = c.id) as order_count
     from customers c where c.phone = $1`,
    [p],
  );
  return (row as CustomerRow) ?? null;
}

// ---------- backup ----------

export async function exportBackup(): Promise<string> {
  await requireAuth();
  const [settings, next_memo_no, customers, products, orders] = await Promise.all([
    getSettings(),
    getNextMemoNo(),
    q(`select id, name, phone, address, created_at::text as created_at from customers order by id`),
    q(`select ${PRODUCT_COLS} from products order by id`),
    q(`select ${ORDER_COLS}, ${ITEMS_JSON} from orders o order by o.id`),
  ]);
  const exported_at = new Date().toISOString();
  await setMeta("last_backup_at", exported_at);
  return JSON.stringify({
    app: "mount-blue-memo",
    version: 2,
    exported_at,
    settings,
    next_memo_no,
    customers,
    products,
    orders,
  });
}

/** Replace ALL data with the contents of a backup file. */
export async function importBackup(json: string): Promise<{ orders: number; customers: number; products: number }> {
  await requireAuth();
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("That file is not a valid backup");
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Not a MOUNT BLUE backup (${firstIssue(parsed.error)})`);
  const b = parsed.data;
  await q(`select import_backup($1::jsonb)`, [JSON.stringify(b)]);
  await setMeta("last_backup_at", b.exported_at);
  return { orders: b.orders.length, customers: b.customers.length, products: b.products.length };
}

export async function getLastBackupAt(): Promise<string | null> {
  await requireAuth();
  return getMeta<string>("last_backup_at");
}
