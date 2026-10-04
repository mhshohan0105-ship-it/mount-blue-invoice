"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { downloadSheetsAsPdf } from "@/lib/pdf";

/** Resolves once web fonts and every image on the page have loaded. */
function pageReady() {
  return Promise.all([
    document.fonts.ready,
    ...Array.from(document.images).map((img) =>
      img.complete ? null : new Promise((r) => img.addEventListener("load", r, { once: true })),
    ),
  ]);
}

export function PrintToolbar({
  count,
  autoPrint,
  autoPdf = false,
  backHref,
  pdfName,
}: {
  count: number;
  autoPrint: boolean;
  autoPdf?: boolean;
  backHref: string;
  pdfName: string;
}) {
  const [busy, setBusy] = useState(false);

  const downloadPdf = useCallback(async () => {
    const area = document.querySelector<HTMLElement>(".print-area");
    if (!area) return;
    setBusy(true);
    try {
      await pageReady();
      await downloadSheetsAsPdf(area, pdfName);
    } catch (e) {
      alert(`PDF could not be created: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [pdfName]);

  useEffect(() => {
    if (!autoPrint && !autoPdf) return;
    let cancelled = false;
    pageReady().then(() => {
      if (cancelled) return;
      if (autoPdf) downloadPdf();
      else setTimeout(() => window.print(), 150);
    });
    return () => {
      cancelled = true;
    };
  }, [autoPrint, autoPdf, downloadPdf]);

  return (
    <div className="no-print sticky top-0 z-10 mb-4 border-b border-neutral-300 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href={backHref} className="btn-ghost px-2">
          ← Back
        </Link>
        <span className="text-sm text-neutral-500">
          {count} memo{count === 1 ? "" : "s"} · {Math.ceil(count / 2)} A4 page{count > 2 ? "s" : ""}
        </span>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={downloadPdf} disabled={busy} className="btn-outline">
            {busy ? "Creating PDF…" : "Download PDF"}
          </button>
          <button type="button" onClick={() => window.print()} className="btn-primary">
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
