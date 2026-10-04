"use client";

import { useState, useTransition } from "react";
import { formatDate, todayDhaka } from "@/lib/format";
import { exportBackup, getLastBackupAt, importBackup } from "@/lib/store";
import { useDb } from "@/lib/use-db";

export function BackupSection({ onRestored }: { onRestored: () => void }) {
  const { data: lastBackup, reload } = useDb(getLastBackupAt, []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

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
        setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  function restore(file: File) {
    if (!confirm("Restoring replaces ALL orders, customers, products and settings in this browser. Continue?")) return;
    setMsg(null);
    startTransition(async () => {
      try {
        const n = await importBackup(await file.text());
        reload();
        onRestored();
        setMsg({ ok: true, text: `Restored ${n.orders} orders, ${n.customers} customers, ${n.products} products` });
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  return (
    <section id="backup" className="card space-y-3 p-5">
      <h2 className="font-semibold">Backup & restore</h2>
      <p className="text-sm text-neutral-600">
        All orders are stored only in this browser on this device. Download a backup regularly and keep it in Google
        Drive or email. To move your data to another phone or computer, download a backup here and restore it there.
      </p>
      <p className="text-sm text-neutral-500">
        Last backup: {lastBackup ? formatDate(lastBackup.slice(0, 10)) : "never"}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={pending} onClick={download}>
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
              if (file) restore(file);
            }}
          />
        </label>
      </div>
      {msg && <p className={`text-sm font-medium ${msg.ok ? "text-black" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
