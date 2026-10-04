import { z } from "zod";
import { normalizePhone } from "./format";
import { ORDER_STATUSES, PAYMENT_TYPES } from "./types";

const money = z.coerce.number().min(0).max(10_000_000);

export const orderInputSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  customer_name: z.string().trim().min(1, "Customer name is required").max(200),
  customer_phone: z
    .string()
    .transform(normalizePhone)
    .refine((p) => p.length >= 10 && p.length <= 15, "Enter a valid phone number"),
  customer_address: z.string().trim().max(1000),
  courier: z.string().trim().max(100),
  delivery_zone: z.string().trim().max(100),
  delivery_charge: money,
  payment_type: z.enum(PAYMENT_TYPES),
  note: z.string().trim().max(1000),
  items: z
    .array(
      z.object({
        product_name: z.string().trim().min(1, "Product name is required").max(200),
        size: z.string().trim().max(50),
        qty: z.coerce.number().int().min(1, "Quantity must be at least 1").max(10_000),
        unit_price: money,
      }),
    )
    .min(1, "Add at least one item"),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  default_price: money,
  active: z.boolean(),
});

export const settingsSchema = z.object({
  shop_name: z.string().trim().min(1, "Shop name is required").max(100),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(100),
  logo_data: z.string().startsWith("data:image/", "Logo must be an image").nullable(),
  footer_text: z.string().trim().max(300),
  facebook_url: z.string().trim().max(300),
  delivery_zones: z
    .array(z.object({ name: z.string().trim().min(1, "Zone name is required").max(100), charge: money }))
    .min(1, "Add at least one delivery zone"),
  couriers: z.array(z.string().trim().min(1).max(100)).min(1, "Add at least one courier"),
  add_delivery_to_cod: z.boolean(),
  memo_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour").default("#0a0a0a"),
  memo_color2: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour").nullable().default(null),
});

// Backup files: checked loosely so older/newer backups still restore.
const storedOrderSchema = z
  .object({
    id: z.number().int().positive(),
    memo_no: z.number().int().positive(),
    date: z.string(),
    status: z.enum(ORDER_STATUSES),
    order_items: z.array(z.object({}).passthrough()),
  })
  .passthrough();

export const backupSchema = z.object({
  app: z.literal("mount-blue-memo"),
  version: z.number(),
  exported_at: z.string(),
  settings: settingsSchema,
  next_memo_no: z.number().int().positive(),
  customers: z.array(z.object({ id: z.number().int().positive(), phone: z.string() }).passthrough()),
  products: z.array(z.object({ id: z.number().int().positive(), name: z.string() }).passthrough()),
  orders: z.array(storedOrderSchema),
});

export function firstIssue(err: z.ZodError): string {
  const i = err.issues[0];
  return i ? `${i.path.join(".") || "input"}: ${i.message}` : "Invalid input";
}
