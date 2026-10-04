import { Memo } from "./memo";
import type { OrderWithItems, Settings } from "@/lib/types";

/** Lays memos out two per A4 sheet with a dashed cut line between them. */
export function PrintSheets({ orders, settings }: { orders: OrderWithItems[]; settings: Settings }) {
  const sheets: OrderWithItems[][] = [];
  for (let i = 0; i < orders.length; i += 2) sheets.push(orders.slice(i, i + 2));

  return (
    <>
      {sheets.map((pair, i) => (
        <div className="sheet" key={i}>
          <div className="sheet-slot">
            <Memo order={pair[0]} settings={settings} />
          </div>
          <div className="cut-line" aria-hidden>
            ✂
          </div>
          <div className="sheet-slot">{pair[1] && <Memo order={pair[1]} settings={settings} />}</div>
        </div>
      ))}
    </>
  );
}
