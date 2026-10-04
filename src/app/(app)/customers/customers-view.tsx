"use client";

import Link from "next/link";
import { ErrorBox, Loading } from "@/components/load-state";
import { listCustomers, PAGE_SIZE } from "@/lib/store";
import { useDb } from "@/lib/use-db";

export function CustomersView({ q, page }: { q: string; page: number }) {
  const { data, error } = useDb(() => listCustomers(q, page), [q, page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const href = (p: number) => `/customers?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Customers</h1>

      <form action="/customers" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, phone or address" className="input" />
        <button className="btn-primary">Search</button>
      </form>

      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : data.rows.length === 0 ? (
        <div className="card p-10 text-center text-neutral-500">No customers found.</div>
      ) : (
        <ul className="card divide-y divide-neutral-100">
          {data.rows.map((c) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`} className="flex items-start gap-3 p-3 hover:bg-neutral-50">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm tabular-nums text-neutral-600">{c.phone}</div>
                  {c.address && <div className="truncate text-xs text-neutral-500">{c.address}</div>}
                </div>
                <span className="badge shrink-0 border-neutral-300">
                  {c.order_count} order{c.order_count === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>{data.total} customers</span>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link href={href(page - 1)} className="btn-outline px-3 py-1">
                  ← Prev
                </Link>
              )}
              <span>
                Page {page} / {pages}
              </span>
              {page < pages && (
                <Link href={href(page + 1)} className="btn-outline px-3 py-1">
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
