"use client";

import Link from "next/link";
import { ErrorBox, Loading } from "./load-state";
import { PrintSheets } from "./print-sheets";
import { PrintToolbar } from "./print-toolbar";
import { getOrdersByIds, getSettings } from "@/lib/store";
import { useDb } from "@/lib/use-db";

export function PrintView({
  ids,
  autoPrint,
  autoPdf = false,
  backHref,
}: {
  ids: number[];
  autoPrint: boolean;
  autoPdf?: boolean;
  backHref: string;
}) {
  const { data, error } = useDb(() => Promise.all([getOrdersByIds(ids), getSettings()]), [ids.join(",")]);

  if (error) return <div className="mx-auto max-w-md p-8"><ErrorBox error={error} /></div>;
  if (!data) return <Loading />;
  const [orders, settings] = data;

  if (!orders.length) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="mb-4">No orders to print.</p>
        <Link href="/orders" className="btn-primary">
          Back to orders
        </Link>
      </div>
    );
  }

  const memos = orders.map((o) => o.memo_no).sort((a, b) => a - b);
  const pdfName =
    memos.length === 1 ? `memo-${memos[0]}.pdf` : `memos-${memos[0]}-${memos[memos.length - 1]}.pdf`;

  return (
    <>
      <PrintToolbar
        count={orders.length}
        autoPrint={autoPrint}
        autoPdf={autoPdf}
        backHref={backHref}
        pdfName={pdfName}
      />
      <PrintSheets orders={orders} settings={settings} />
    </>
  );
}
