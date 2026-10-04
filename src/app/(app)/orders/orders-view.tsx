"use client";

import Link from "next/link";
import { ErrorBox, Loading } from "@/components/load-state";
import { STATUS_LABEL, taka } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/constants";
import { getOrderStats, listOrders } from "@/lib/store";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import { useDb } from "@/lib/use-db";
import { OrdersTable } from "./orders-table";

export type OrdersSearch = { q?: string; from?: string; to?: string; status?: string; page?: string };

export function OrdersView({ search: sp }: { search: OrdersSearch }) {
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { data, error, reload } = useDb(
    () => Promise.all([listOrders({ q: sp.q, from: sp.from, to: sp.to, status, page }), getOrderStats()]),
    [sp.q, sp.from, sp.to, status, page],
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams(
      Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][],
    );
    return `/orders?${params}`;
  };
  const filtered = !!(sp.q || sp.from || sp.to || status);

  const [result, stats] = data ?? [];
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link href="/" className="btn-primary">
          + New order
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Today's orders" value={stats ? String(stats.todayCount) : "–"} />
        <StatCard label="Today's COD" value={stats ? taka(stats.todayCod) : "–"} />
        <StatCard
          label="This month"
          value={stats ? taka(stats.monthCod) : "–"}
          sub={stats ? `${stats.monthCount} orders` : undefined}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-[1fr_150px_150px_140px_auto] sm:items-end" action="/orders">
        <div>
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Memo no, name or phone" className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <div>
            <label className="label" htmlFor="from">
              From
            </label>
            <input id="from" name="from" type="date" defaultValue={sp.from} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="to">
              To
            </label>
            <input id="to" name="to" type="date" defaultValue={sp.to} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="input">
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex-1">Filter</button>
          {filtered && (
            <Link href="/orders" className="btn-outline">
              Clear
            </Link>
          )}
        </div>
      </form>

      {error ? (
        <ErrorBox error={error} />
      ) : !result ? (
        <Loading />
      ) : (
        <>
          <OrdersTable rows={result.rows} onChanged={reload} />
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>
              {result.total} order{result.total === 1 ? "" : "s"}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link href={pageHref(page - 1)} className="btn-outline px-3 py-1">
                    ← Prev
                  </Link>
                )}
                <span>
                  Page {page} / {pages}
                </span>
                {page < pages && (
                  <Link href={pageHref(page + 1)} className="btn-outline px-3 py-1">
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, className = "" }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
      {sub && <div className="text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}
