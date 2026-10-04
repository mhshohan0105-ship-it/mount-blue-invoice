"use client";

import Link from "next/link";
import { ErrorBox, Loading, NotFound } from "@/components/load-state";
import { Memo } from "@/components/memo";
import { StatusSelect } from "@/components/status-select";
import { getOrder, getSettings } from "@/lib/store";
import { useDb } from "@/lib/use-db";
import { DeleteOrderButton } from "./delete-button";

export function OrderView({ id }: { id: number }) {
  const { data, error, reload } = useDb(() => Promise.all([getOrder(id), getSettings()]), [id]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const [order, settings] = data;
  if (!order) return <NotFound what="Order" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/orders" className="btn-ghost px-2">
          ←
        </Link>
        <h1 className="text-2xl font-bold">Memo #{order.memo_no}</h1>
        <StatusSelect id={order.id} status={order.status} size="md" onChanged={reload} />
        <div className="ml-auto flex flex-wrap gap-2">
          <DeleteOrderButton id={order.id} memoNo={order.memo_no} />
          <Link href={`/orders/${order.id}/edit`} className="btn-outline">
            Edit
          </Link>
          <Link href={`/orders/${order.id}/print?pdf=1`} className="btn-outline">
            PDF
          </Link>
          <Link href={`/orders/${order.id}/print`} className="btn-primary">
            Print
          </Link>
        </div>
      </div>

      {order.customer_id && (
        <p className="text-sm text-neutral-500">
          Customer:{" "}
          <Link href={`/customers/${order.customer_id}`} className="font-medium text-black underline">
            {order.customer_name}
          </Link>
        </p>
      )}

      {/* on-screen preview of the printed memo */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="mx-auto flex h-[136mm] w-[190mm] max-sm:[zoom:0.45]">
          <Memo order={order} settings={settings} />
        </div>
      </div>
    </div>
  );
}
