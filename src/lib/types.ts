export type DeliveryZone = { name: string; charge: number };

export type Settings = {
  shop_name: string;
  address: string;
  phone: string;
  logo_data: string | null;
  footer_text: string;
  facebook_url: string;
  delivery_zones: DeliveryZone[];
  couriers: string[];
  add_delivery_to_cod: boolean;
  memo_color: string; // hex accent colour used on the printed memo
  memo_color2: string | null; // second colour -> gradient; null = solid
};

export const ORDER_STATUSES = ["pending", "delivered", "returned"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_TYPES = ["COD", "Paid"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  created_at: string;
};

export type Product = {
  id: number;
  name: string;
  default_price: number;
  active: boolean;
  sizes?: string[]; // size/colour suggestions shown on the order form
  category?: string;
  from_website?: boolean; // added by "Sync from website"
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_name: string;
  size: string;
  qty: number;
  unit_price: number;
  line_total: number;
};

export type Order = {
  id: number;
  memo_no: number;
  date: string; // YYYY-MM-DD
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  courier: string;
  delivery_zone: string;
  delivery_charge: number;
  subtotal: number;
  cod_amount: number;
  payment_type: PaymentType;
  note: string;
  status: OrderStatus;
  consignment_id: string | null;
  tracking_code: string | null;
  created_at: string;
};

export type OrderWithItems = Order & { order_items: OrderItem[] };

/** Shape the order form sends to the saveOrder action. */
export type OrderInput = {
  id?: number;
  date: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  courier: string;
  delivery_zone: string;
  delivery_charge: number;
  payment_type: PaymentType;
  note: string;
  items: { product_name: string; size: string; qty: number; unit_price: number }[];
};

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export type CatalogItem = { name: string; price: number; sizes: string[]; available: boolean; category: string };

export type CustomerRow = Customer & { order_count: number };

export type OrderFilters = { q?: string; from?: string; to?: string; status?: OrderStatus | ""; page?: number };
