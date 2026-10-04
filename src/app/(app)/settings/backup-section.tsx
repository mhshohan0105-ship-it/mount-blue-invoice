"use client";

import { useState, useTransition } from "react";
import { formatDate, todayDhaka } from "@/lib/format";
import { deleteLegacyBrowserData, readLegacyBrowserData } from "@/lib/legacy-browser-data";
import { exportBackup, getLastBackupAt, importBackup } from "@/lib/store";
import { useDb } from "@/lib/use-db";

export function BackupSection({ onRestored }: { onRestored: () => void }) {
  const { data: lastBackup, reload } = useDb(getLastBackupAt, []);
  const legacy = useDb(readLegacyBrowserData, []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const fail = (e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });

  function download() {
    setMsg(null);
    startTransition(async () => {
      try {
        const json = await exportBackup();
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `mount-blue-backup-${todayDhaka()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        reload();
        setMsg({ ok: true, text: "Backup downloaded" });
      } catch (e) {
        fail(e);
      }
    });
  }

  function restore(json: string, after?: () => Promise<void>) {
    startTransition(async () => {
      try {
        const n = await importBackup(json);
        await after?.();
        reload();
        legacy.reload();
        onRestored();
        setMsg({ ok: true, text: `Restored ${n.orders} orders, ${n.customers} customers, ${n.products} products` });
      } catch (e) {
        fail(e);
      }
    });
  }

  async function restoreFile(file: File) {
    if (!confirm("Restoring replaces ALL orders, customers, products and settings in the database. Continue?")) return;
    setMsg(null);
    restore(await file.text());
  }

  function moveBrowserData() {
    if (!legacy.data) return;
    if (
      !confirm(
        `Move ${legacy.data.orders} orders and ${legacy.data.customers} customers saved in this browser into the database?\n\nThis REPLACES what is currently in the database.`,
      )
    )
      return;
    setMsg(null);
    restore(legacy.data.json, deleteLegacyBrowserData);
  }

  return (
    <section id="backup" className="card space-y-3 p-5">
      <h2 className="font-semibold">Backup & restore</h2>

      {legacy.data && (
        <div className="space-y-2 rounded-lg border border-black p-3">
          <p className="text-sm">
            This browser still has <b>{legacy.data.orders} orders</b> and <b>{legacy.data.customers} customers</b> from
            the earlier offline version.
          </p>
          <button type="button" className="btn-primary" disabled={pending} onClick={moveBrowserData}>
            Move them to the database
          </button>
        </div>
      )}

      <p className="text-sm text-neutral-600">
        Your data is saved in the online database. You can also keep your own copy as a file.
      </p>
      <p className="text-sm text-neutral-500">
        Last backup: {lastBackup ? formatDate(lastBackup.slice(0, 10)) : "never"}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-outline" disabled={pending} onClick={download}>
          Download backup
        </button>
        <label className={`btn-outline cursor-pointer ${pending ? "pointer-events-none opacity-50" : ""}`}>
          Restore from backup
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) restoreFile(file);
            }}
          />
        </label>
      </div>
      {msg && <p className={`text-sm font-medium ${msg.ok ? "text-black" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
