import { PrintView } from "@/components/print-view";

export const metadata = { title: "Print memo" };

/** ?auto=1 opens the print dialog, ?pdf=1 downloads the PDF straight away. */
export default async function PrintOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string; pdf?: string }>;
}) {
  const [{ id }, { auto, pdf }] = await Promise.all([params, searchParams]);
  return (
    <PrintView ids={[Number(id)]} autoPrint={auto === "1"} autoPdf={pdf === "1"} backHref={`/orders/${id}`} />
  );
}
