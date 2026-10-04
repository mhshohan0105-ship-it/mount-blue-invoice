import { CustomersView } from "./customers-view";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page } = await searchParams;
  return <CustomersView q={q} page={Math.max(1, Number(page) || 1)} />;
}
