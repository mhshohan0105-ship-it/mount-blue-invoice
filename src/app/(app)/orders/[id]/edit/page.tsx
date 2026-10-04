import { EditOrderView } from "./edit-order-view";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditOrderView id={Number(id)} />;
}
