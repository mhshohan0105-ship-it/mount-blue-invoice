"use client";

import { useState, useTransition } from "react";
import { syncFromWebsite } from "@/lib/catalog-sync";
import { formatDate, taka } from "@/lib/format";
import { saveProduct } from "@/lib/store";
import type { Product } from "@/lib/types";

export function ProductsManager({
  products,
  onChanged,
  lastSync,
}: {
  products: Product[];
  onChanged: () => void;
  lastSync: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncMsg(null);
    setSyncing(true);
    try {
      const r = await syncFromWebsite();
      setSyncMsg({ ok: true, text: `${r.total} products on website · ${r.added} added · ${r.updated} updated` });
      onChanged();
    } catch (e) {
      setSyncMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSyncing(false);
    }
  }
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string; price: string } | null>(null);

  function run(id: number | null, input: { name: string; default_price: number; active: boolean }, done?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await saveProduct(id, input);
        done?.();
        onChanged();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  const term = search.trim().toLowerCase();
  const shown = term
    ? products.filter((p) => p.name.toLowerCase().includes(term) || (p.category ?? "").toLowerCase().includes(term))
    : products;
  const active = shown.filter((p) => p.active);
  const inactive = shown.filter((p) => !p.active);

  return (
    <div className="space-y-5">
      <section className="card flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Products from mountblue4u.com</div>
          <div className="text-sm text-neutral-500">
            Adds new products and updates prices and stock (sold out = inactive).
            {lastSync && <> Last synced {formatDate(lastSync.slice(0, 10))}.</>}
          </div>
          {syncMsg && (
            <div className={`mt-1 text-sm font-medium ${syncMsg.ok ? "text-black" : "text-red-600"}`}>{syncMsg.text}</div>
          )}
        </div>
        <button type="button" className="btn-primary" disabled={syncing} onClick={sync}>
          {syncing ? "Syncing…" : "Sync from website"}
        </button>
      </section>

      <form
        className="card grid gap-3 p-4 sm:grid-cols-[1fr_160px_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run(null, { name, default_price: Number(price) || 0, active: true }, () => {
            setName("");
            setPrice("");
          });
        }}
      >
        <div>
          <label className="label" htmlFor="pname">
            Product name
          </label>
          <input id="pname" lang="bn" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="pprice">
            Default price
          </label>
          <input
            id="pprice"
            type="number"
            inputMode="decimal"
            min={0}
            className="input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <button className="btn-primary" disabled={pending}>
          + Add product
        </button>
      </form>

      {error && <p className="rounded-lg bg-red-50 p-2 text-sm font-medium text-red-700">{error}</p>}

      {products.length > 0 && (
        <input
          type="search"
          className="input"
          placeholder={`Search ${products.length} products`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {[
        { title: "Active", list: active },
        { title: "Inactive", list: inactive },
      ].map(
        ({ title, list }) =>
          list.length > 0 && (
            <section key={title}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {title} ({list.length})
              </h2>
              <ul className="card divide-y divide-neutral-100">
                {list.map((p) =>
                  editing?.id === p.id ? (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 p-3">
                      <input
                        aria-label="Name"
                        lang="bn"
                        className="input min-w-40 flex-1"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      />
                      <input
                        aria-label="Price"
                        type="number"
                        min={0}
                        className="input w-32"
                        value={editing.price}
                        onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={pending}
                        onClick={() =>
                          run(p.id, { name: editing.name, default_price: Number(editing.price) || 0, active: p.active }, () =>
                            setEditing(null),
                          )
                        }
                      >
                        Save
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </li>
                  ) : (
                    <li key={p.id} className={`flex items-center gap-3 p-3 ${p.active ? "" : "text-neutral-400"}`}>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{p.name}</span>
                        {(p.category || p.sizes?.length) && (
                          <span className="block truncate text-xs text-neutral-400">
                            {[p.category, p.sizes?.join(" / ")].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums">{taka(p.default_price)}</span>
                      <button
                        type="button"
                        className="btn-ghost px-2 py-1"
                        onClick={() => setEditing({ id: p.id, name: p.name, price: String(p.default_price) })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-outline px-2 py-1 text-xs"
                        disabled={pending}
                        onClick={() => run(p.id, { name: p.name, default_price: p.default_price, active: !p.active })}
                      >
                        {p.active ? "Deactivate" : "Activate"}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}
