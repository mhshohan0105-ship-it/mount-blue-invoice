import { OrdersView, type OrdersSearch } from "./orders-view";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrdersSearch> }) {
  return <OrdersView search={await searchParams} />;
}
