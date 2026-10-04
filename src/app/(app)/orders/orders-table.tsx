"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusSelect } from "@/components/status-select";
import { formatDate, taka } from "@/lib/format";
import type { Order } from "@/lib/types";

export function OrdersTable({ rows, onChanged }: { rows: Order[]; onChanged?: () => void }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  // print in memo order (oldest first) so the stack comes out sorted
  const printHref = `/print?ids=${rows
    .filter((r) => selected.has(r.id))
    .sort((a, b) => a.memo_no - b.memo_no)
    .map((r) => r.id)
    .join(",")}`;

  if (!rows.length) {
    return <div className="card p-10 text-center text-neutral-500">No orders found.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-black" />
          Select all
        </label>
        {selected.size > 0 && (
          <>
            <Link href={printHref} className="btn-primary px-3 py-1.5">
              Print / PDF ({selected.size})
            </Link>
            <button type="button" className="btn-ghost px-2 py-1.5" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </>
        )}
      </div>

      {/* desktop table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="w-10 p-3" />
              <th className="p-3">Memo</th>
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Courier</th>
              <th className="p-3 text-right">COD</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr
                key={o.id}
                onClick={() => router.push(`/orders/${o.id}`)}
                className={`cursor-pointer border-b border-neutral-100 hover:bg-neutral-50 ${
                  selected.has(o.id) ? "bg-neutral-100" : ""
                }`}
              >
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select memo ${o.memo_no}`}
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    className="h-4 w-4 accent-black"
                  />
                </td>
                <td className="p-3 font-bold">#{o.memo_no}</td>
                <td className="whitespace-nowrap p-3">{formatDate(o.date)}</td>
                <td className="max-w-48 truncate p-3">{o.customer_name}</td>
                <td className="p-3 tabular-nums">{o.customer_phone}</td>
                <td className="p-3">{o.courier}</td>
                <td className="p-3 text-right font-semibold tabular-nums">{taka(o.cod_amount)}</td>
                <td className="p-3">
                  <StatusSelect id={o.id} status={o.status} onChanged={onChanged} />
                </td>
                <td className="whitespace-nowrap p-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/orders/${o.id}/edit`} className="mr-3 text-neutral-500 hover:text-black">
                    Edit
                  </Link>
                  <Link href={`/orders/${o.id}/print`} className="mr-3 text-neutral-500 hover:text-black">
                    Print
                  </Link>
                  <Link href={`/orders/${o.id}/print?pdf=1`} className="text-neutral-500 hover:text-black">
                    PDF
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <ul className="space-y-2 md:hidden">
        {rows.map((o) => (
          <li
            key={o.id}
            className={`card flex gap-3 p-3 ${selected.has(o.id) ? "border-black" : ""}`}
            onClick={() => router.push(`/orders/${o.id}`)}
          >
            <input
              type="checkbox"
              aria-label={`Select memo ${o.memo_no}`}
              checked={selected.has(o.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggle(o.id)}
              className="mt-1 h-5 w-5 shrink-0 accent-black"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold">#{o.memo_no}</span>
                <span className="font-bold tabular-nums">{taka(o.cod_amount)}</span>
              </div>
              <div className="truncate text-sm">{o.customer_name}</div>
              <div className="text-xs text-neutral-500">
                {o.customer_phone} · {o.courier} · {formatDate(o.date)}
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
                <StatusSelect id={o.id} status={o.status} onChanged={onChanged} />
                <Link href={`/orders/${o.id}/edit`} className="text-neutral-500 underline">
                  Edit
                </Link>
                <Link href={`/orders/${o.id}/print`} className="text-neutral-500 underline">
                  Print
                </Link>
                <Link href={`/orders/${o.id}/print?pdf=1`} className="text-neutral-500 underline">
                  PDF
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
