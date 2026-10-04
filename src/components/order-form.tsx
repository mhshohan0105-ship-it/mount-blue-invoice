"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { findCustomerByPhone, getNextMemoNo, saveOrder } from "@/lib/store";
import { computeTotals, lineTotal } from "@/lib/calc";
import { formatDate, normalizePhone, taka } from "@/lib/format";
import type { OrderInput, OrderWithItems, PaymentType, Product, Settings } from "@/lib/types";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "28", "30", "32", "34", "36", "38", "40", "Free"];

type ItemRow = {
  key: number;
  productId: string; // id of the matching product, or "" for a typed-in name
  product_name: string;
  size: string;
  qty: string;
  unit_price: string;
};

let keySeq = 0;
const emptyRow = (): ItemRow => ({ key: ++keySeq, productId: "", product_name: "", size: "", qty: "1", unit_price: "" });

type Props = {
  products: Product[];
  settings: Settings;
  memoNo: number | null;
  today: string;
  initial?: OrderWithItems;
  initialPhone?: string;
};

export function OrderForm({ products, settings, memoNo: initialMemoNo, today, initial, initialPhone }: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const defaultZone = settings.delivery_zones[0];

  const [memoNo, setMemoNo] = useState(initial?.memo_no ?? initialMemoNo);
  const [date, setDate] = useState(initial?.date ?? today);
  const [phone, setPhone] = useState(initial?.customer_phone ?? initialPhone ?? "");
  const [name, setName] = useState(initial?.customer_name ?? "");
  const [address, setAddress] = useState(initial?.customer_address ?? "");
  const [items, setItems] = useState<ItemRow[]>(() =>
    initial?.order_items.length
      ? initial.order_items.map((i) => {
          const match = products.find((p) => p.name === i.product_name);
          return {
            key: ++keySeq,
            productId: match ? String(match.id) : "",
            product_name: i.product_name,
            size: i.size,
            qty: String(i.qty),
            unit_price: String(i.unit_price),
          };
        })
      : [emptyRow()],
  );
  const [courier, setCourier] = useState(initial?.courier ?? settings.couriers[0] ?? "");
  const [zone, setZone] = useState(initial?.delivery_zone ?? defaultZone?.name ?? "");
  const [deliveryCharge, setDeliveryCharge] = useState(String(initial?.delivery_charge ?? defaultZone?.charge ?? 0));
  const [paymentType, setPaymentType] = useState<PaymentType>(initial?.payment_type ?? "COD");
  const [note, setNote] = useState(initial?.note ?? "");

  const [customerHint, setCustomerHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: number; memo_no: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const lastLookup = useRef(initial ? normalizePhone(initial.customer_phone) : "");
  const phoneRef = useRef<HTMLInputElement>(null);

  // Look up the customer as soon as a full phone number is typed.
  useEffect(() => {
    const p = normalizePhone(phone);
    if (p.length < 11 || p === lastLookup.current) {
      if (p.length < 11) setCustomerHint(null);
      return;
    }
    const t = setTimeout(async () => {
      lastLookup.current = p;
      try {
        const c = await findCustomerByPhone(p);
        if (normalizePhone(phone) !== p) return;
        if (c) {
          setName(c.name);
          setAddress(c.address);
          setCustomerHint(`Returning customer · ${c.order_count} previous order${c.order_count === 1 ? "" : "s"}`);
        } else {
          setCustomerHint("New customer");
        }
      } catch {
        setCustomerHint(null);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [phone]);

  const totals = useMemo(
    () =>
      computeTotals({
        items: items.map((i) => ({ qty: Number(i.qty), unit_price: Number(i.unit_price) })),
        deliveryCharge: Number(deliveryCharge),
        paymentType,
        addDeliveryToCod: settings.add_delivery_to_cod,
      }),
    [items, deliveryCharge, paymentType, settings.add_delivery_to_cod],
  );

  // Keep the old zone selectable when editing an order whose zone was later renamed.
  const zones = useMemo(() => {
    const list = [...settings.delivery_zones];
    if (zone && !list.some((z) => z.name === zone)) list.push({ name: zone, charge: Number(deliveryCharge) });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.delivery_zones]);
  const couriers = useMemo(() => {
    const list = [...settings.couriers];
    if (courier && !list.includes(courier)) list.push(courier);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.couriers]);

  function updateItem(key: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // Typing a name that matches a product fills its price; anything else is a custom item.
  function typeProduct(key: number, value: string) {
    const p = products.find((x) => x.name.toLowerCase() === value.trim().toLowerCase());
    if (p) updateItem(key, { productId: String(p.id), product_name: p.name, unit_price: String(p.default_price) });
    else updateItem(key, { productId: "", product_name: value });
  }

  const sizesFor = (row: ItemRow) => {
    const p = row.productId ? products.find((x) => String(x.id) === row.productId) : undefined;
    return p?.sizes?.length ? p.sizes : SIZES;
  };

  function pickZone(name: string) {
    setZone(name);
    const z = zones.find((x) => x.name === name);
    if (z) setDeliveryCharge(String(z.charge));
  }

  function resetForNextOrder() {
    setPhone("");
    setName("");
    setAddress("");
    setItems([emptyRow()]);
    setNote("");
    setPaymentType("COD");
    setCourier(settings.couriers[0] ?? "");
    pickZone(defaultZone?.name ?? "");
    setCustomerHint(null);
    lastLookup.current = "";
    setDate(today);
    phoneRef.current?.focus();
  }

  function submit(andPrint: boolean) {
    setError(null);
    setSaved(null);
    const input: OrderInput = {
      id: initial?.id,
      date,
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      courier,
      delivery_zone: zone,
      delivery_charge: Number(deliveryCharge) || 0,
      payment_type: paymentType,
      note,
      items: items
        .filter((i) => i.product_name.trim() || Number(i.unit_price))
        .map((i) => ({
          product_name: i.product_name,
          size: i.size,
          qty: Number(i.qty) || 0,
          unit_price: Number(i.unit_price) || 0,
        })),
    };

    startTransition(async () => {
      let res: { id: number; memo_no: number };
      try {
        res = await saveOrder(input);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return;
      }
      if (andPrint) {
        router.push(`/orders/${res.id}/print?auto=1`);
      } else if (isEdit) {
        router.push(`/orders/${res.id}`);
      } else {
        setSaved(res);
        resetForNextOrder();
        setMemoNo(await getNextMemoNo().catch(() => null));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      onKeyDown={(e) => {
        // Enter in a text input should not save a half-filled order
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
      className="grid gap-5 lg:grid-cols-[1fr_320px]"
    >
      <div className="space-y-5">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? "Edit order" : "New order"}</h1>
            <p className="text-sm text-neutral-500">
              Memo <span className="font-semibold text-black">#{memoNo ?? "—"}</span> · {formatDate(date)}
            </p>
          </div>
          <div className="w-40">
            <label className="label" htmlFor="date">
              Date
            </label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>

        {saved && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-black bg-white px-4 py-3 text-sm">
            <span className="font-semibold">✓ Saved memo #{saved.memo_no}</span>
            <Link href={`/orders/${saved.id}`} className="underline">
              View
            </Link>
            <Link href={`/orders/${saved.id}/print?auto=1`} className="underline">
              Print
            </Link>
            <Link href={`/orders/${saved.id}/print?pdf=1`} className="underline">
              PDF
            </Link>
          </div>
        )}

        {/* customer */}
        <section className="card space-y-4 p-4 sm:p-5">
          <h2 className="font-semibold">Customer</h2>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              ref={phoneRef}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              autoFocus={!isEdit}
              placeholder="01XXXXXXXXX"
              className="input text-lg font-semibold tracking-wide"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {customerHint && <p className="mt-1 text-xs text-neutral-500">{customerHint}</p>}
          </div>
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" lang="bn" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="address">
              Address
            </label>
            <textarea
              id="address"
              lang="bn"
              rows={3}
              className="input resize-y"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </section>

        {/* items */}
        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 font-semibold">Items</h2>
          {products.length === 0 && (
            <p className="mb-3 text-sm text-neutral-500">
              No products yet. Type any product name, or sync your website products on the{" "}
              <Link href="/products" className="underline">
                Products
              </Link>{" "}
              page.
            </p>
          )}
          <div className="hidden grid-cols-[1fr_90px_70px_100px_90px_32px] gap-2 px-0.5 sm:grid">
            {["Product", "Size", "Qty", "Price", "Total", ""].map((h) => (
              <span key={h} className="label">
                {h}
              </span>
            ))}
          </div>
          <div className="space-y-3 sm:space-y-2">
            {items.map((row, idx) => (
              <div
                key={row.key}
                className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 rounded-lg border border-neutral-200 p-2 sm:grid-cols-[1fr_90px_70px_100px_90px_32px] sm:items-center sm:border-0 sm:p-0"
              >
                <div className="col-span-4 space-y-2 sm:col-span-1">
                  <input
                    aria-label={`Product ${idx + 1}`}
                    lang="bn"
                    list="product-list"
                    placeholder="Type to search products…"
                    autoComplete="off"
                    className="input"
                    value={row.product_name}
                    onChange={(e) => typeProduct(row.key, e.target.value)}
                  />
                </div>
                <input
                  aria-label="Size"
                  placeholder="Size"
                  list={`sizes-${row.key}`}
                  className="input"
                  value={row.size}
                  onChange={(e) => updateItem(row.key, { size: e.target.value })}
                />
                <datalist id={`sizes-${row.key}`}>
                  {sizesFor(row).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <input
                  aria-label="Quantity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="input"
                  value={row.qty}
                  onChange={(e) => updateItem(row.key, { qty: e.target.value })}
                />
                <input
                  aria-label="Unit price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="Price"
                  className="input"
                  value={row.unit_price}
                  onChange={(e) => updateItem(row.key, { unit_price: e.target.value })}
                />
                <div className="col-span-3 self-center text-right text-sm font-semibold sm:col-span-1">
                  <span className="mr-1 text-xs font-normal text-neutral-400 sm:hidden">Line total</span>
                  {taka(lineTotal(Number(row.qty), Number(row.unit_price)))}
                </div>
                <button
                  type="button"
                  aria-label="Remove item"
                  className="flex h-8 w-8 items-center justify-center self-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-black disabled:opacity-30"
                  disabled={items.length === 1}
                  onClick={() => setItems((rows) => rows.filter((r) => r.key !== row.key))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <datalist id="product-list">
            {products.map((p) => (
              <option key={p.id} value={p.name} label={taka(p.default_price)} />
            ))}
          </datalist>
          <button type="button" className="btn-outline mt-3" onClick={() => setItems((r) => [...r, emptyRow()])}>
            + Add item
          </button>
        </section>

        {/* shipping */}
        <section className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <h2 className="font-semibold sm:col-span-2">Shipping & payment</h2>
          <div>
            <label className="label" htmlFor="courier">
              Courier
            </label>
            <select id="courier" className="input" value={courier} onChange={(e) => setCourier(e.target.value)}>
              {couriers.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="payment">
              Payment
            </label>
            <select
              id="payment"
              className="input"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
            >
              <option value="COD">Cash on Delivery</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="zone">
              Delivery zone
            </label>
            <select id="zone" className="input" value={zone} onChange={(e) => pickZone(e.target.value)}>
              {zones.map((z) => (
                <option key={z.name} value={z.name}>
                  {z.name} — {taka(z.charge)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="charge">
              Delivery charge
            </label>
            <input
              id="charge"
              type="number"
              inputMode="decimal"
              min={0}
              className="input"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="note">
              Note
            </label>
            <input id="note" lang="bn" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>
      </div>

      {/* summary */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">Summary</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Subtotal</dt>
              <dd className="font-medium">{taka(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">
                Delivery charge
                {!settings.add_delivery_to_cod && <span className="block text-xs">(not added to COD)</span>}
              </dt>
              <dd className="font-medium">{taka(totals.deliveryCharge)}</dd>
            </div>
          </dl>
          <div className="rounded-lg border-2 border-black p-3 text-right">
            <div className="text-[11px] font-bold tracking-[0.18em]">COLLECT (COD)</div>
            <div className="text-3xl font-extrabold">{taka(totals.codAmount)}</div>
            {paymentType === "Paid" && <div className="text-xs text-neutral-500">Already paid</div>}
          </div>
          {error && <p className="rounded-lg bg-red-50 p-2 text-sm font-medium text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <button type="submit" disabled={pending} className="btn-outline py-3">
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" disabled={pending} onClick={() => submit(true)} className="btn-primary py-3">
              Save and print
            </button>
          </div>
          {isEdit && (
            <Link href={`/orders/${initial.id}`} className="btn-ghost w-full">
              Cancel
            </Link>
          )}
        </div>
      </aside>
    </form>
  );
}
