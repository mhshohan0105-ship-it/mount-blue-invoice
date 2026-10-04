import type { PaymentType } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function lineTotal(qty: number, unitPrice: number): number {
  return round2((Number(qty) || 0) * (Number(unitPrice) || 0));
}

/**
 * Single source of truth for order money maths, used by the form (live
 * summary) and by the server (what actually gets saved).
 */
export function computeTotals(opts: {
  items: { qty: number; unit_price: number }[];
  deliveryCharge: number;
  paymentType: PaymentType;
  addDeliveryToCod: boolean;
}) {
  const subtotal = round2(opts.items.reduce((sum, i) => sum + lineTotal(i.qty, i.unit_price), 0));
  const deliveryCharge = round2(Number(opts.deliveryCharge) || 0);
  const codAmount =
    opts.paymentType === "Paid" ? 0 : round2(subtotal + (opts.addDeliveryToCod ? deliveryCharge : 0));
  return { subtotal, deliveryCharge, codAmount };
}

/** Text for the memo explaining how the delivery charge was handled. */
export function deliveryNote(o: {
  payment_type: PaymentType;
  subtotal: number;
  delivery_charge: number;
  cod_amount: number;
}): string {
  const charge = Number(o.delivery_charge);
  if (o.payment_type === "Paid") return "Paid in advance. Nothing to collect.";
  if (!charge) return "Free delivery.";
  const included = Number(o.cod_amount) >= Number(o.subtotal) + charge;
  return included
    ? `Includes delivery charge ৳${charge.toLocaleString("en-IN")}.`
    : `Delivery charge ৳${charge.toLocaleString("en-IN")} not included.`;
}
