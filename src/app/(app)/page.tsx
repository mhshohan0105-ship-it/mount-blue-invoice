import { NewOrderView } from "./new-order-view";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone } = await searchParams;
  return <NewOrderView initialPhone={phone} />;
}
