"use client";

import { useEffect, useRef } from "react";
import { ErrorBox, Loading } from "@/components/load-state";
import { OrderForm } from "@/components/order-form";
import { todayDhaka } from "@/lib/format";
import { autoSyncIfEmpty, countProducts, getNextMemoNo, getSettings, listProducts } from "@/lib/store";
import { useDb } from "@/lib/use-db";

export function NewOrderView({ initialPhone }: { initialPhone?: string }) {
  const { data, error, reload } = useDb(
    () => Promise.all([listProducts(true), getSettings(), getNextMemoNo(), countProducts()]),
    [],
  );
  const tried = useRef(false);

  // First time on a new device: load the product list from the website.
  useEffect(() => {
    if (!data || tried.current) return;
    tried.current = true;
    if (data[3] === 0) autoSyncIfEmpty().then((added) => added && reload());
  }, [data, reload]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const [products, settings, memoNo] = data;
  return (
    <OrderForm
      products={products}
      settings={settings}
      memoNo={memoNo}
      today={todayDhaka()}
      initialPhone={initialPhone}
    />
  );
}
