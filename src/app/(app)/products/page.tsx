"use client";

import { useEffect, useRef } from "react";
import { ErrorBox, Loading } from "@/components/load-state";
import { autoSyncIfEmpty } from "@/lib/catalog-sync";
import { getLastCatalogSyncAt, listProducts } from "@/lib/store";
import { useDb } from "@/lib/use-db";
import { ProductsManager } from "./products-manager";

export default function ProductsPage() {
  const { data, error, reload } = useDb(() => Promise.all([listProducts(), getLastCatalogSyncAt()]), []);
  const tried = useRef(false);

  useEffect(() => {
    if (!data || tried.current) return;
    tried.current = true;
    autoSyncIfEmpty(data[0].length).then((added) => added && reload());
  }, [data, reload]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Products</h1>
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <ProductsManager products={data[0]} lastSync={data[1]} onChanged={reload} />
      )}
    </div>
  );
}
