"use client";

import { ErrorBox, Loading, NotFound } from "@/components/load-state";
import { OrderForm } from "@/components/order-form";
import { todayDhaka } from "@/lib/format";
import { getOrder, getSettings, listProducts } from "@/lib/store";
import { useDb } from "@/lib/use-db";

export function EditOrderView({ id }: { id: number }) {
  const { data, error } = useDb(() => Promise.all([getOrder(id), listProducts(true), getSettings()]), [id]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const [order, products, settings] = data;
  if (!order) return <NotFound what="Order" />;
  return <OrderForm products={products} settings={settings} memoNo={order.memo_no} today={todayDhaka()} initial={order} />;
}
