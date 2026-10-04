"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorBox, Loading, NotFound } from "@/components/load-state";
import { StatusSelect } from "@/components/status-select";
import { formatDate, taka } from "@/lib/format";
import { getCustomerWithOrders } from "@/lib/store";
import { useDb } from "@/lib/use-db";

export default function CustomerPage() {
  const id = Number(useParams<{ id: string }>().id);
  const { data: result, error, reload } = useDb(() => getCustomerWithOrders(id), [id]);
  if (error) return <ErrorBox error={error} />;
  if (result === undefined) return <Loading />;
  if (!result) return <NotFound what="Customer" />;
  const { customer, orders } = result;

  const delivered = orders.filter((o) => o.status === "delivered");
  const returned = orders.filter((o) => o.status === "returned").length;
  const spent = delivered.reduce((s, o) => s + o.cod_amount, 0);

  return (
    <div className="space-y-5">
      <Link href="/customers" className="btn-ghost -ml-2 px-2">
        ← Customers
      </Link>

      <div className="card flex flex-wrap items-start gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <a href={`tel:${customer.phone}`} className="font-medium tabular-nums underline">
            {customer.phone}
          </a>
          {customer.address && <p className="mt-1 whitespace-pre-line text-sm text-neutral-600">{customer.address}</p>}
        </div>
        <Link href={`/?phone=${customer.phone}`} className="btn-primary">
          + New order
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase text-neutral-500">Orders</div>
          <div className="text-2xl font-extrabold">{orders.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase text-neutral-500">Delivered</div>
          <div className="text-2xl font-extrabold">{taka(spent)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase text-neutral-500">Returned</div>
          <div className="text-2xl font-extrabold">{returned}</div>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Order history</h2>
        {orders.length === 0 ? (
          <div className="card p-8 text-center text-neutral-500">No orders yet.</div>
        ) : (
          <ul className="card divide-y divide-neutral-100">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center gap-3 p-3">
                <Link href={`/orders/${o.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="font-bold">#{o.memo_no}</span>
                  <span className="ml-2 text-sm text-neutral-500">
                    {formatDate(o.date)} · {o.courier}
                  </span>
                </Link>
                <span className="font-semibold tabular-nums">{taka(o.cod_amount)}</span>
                <StatusSelect id={o.id} status={o.status} onChanged={reload} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
