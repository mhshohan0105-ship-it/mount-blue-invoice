import { PrintView } from "@/components/print-view";

export const metadata = { title: "Print memos" };

/** Bulk print: /print?ids=12,13,14 */
export default async function BulkPrintPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids = "" } = await searchParams;
  const idList = [...new Set(ids.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200);
  return <PrintView ids={idList} autoPrint={false} backHref="/orders" />;
}
