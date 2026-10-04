"use client";

import { useEffect, useState, useTransition } from "react";
import { STATUS_LABEL } from "@/lib/format";
import { updateOrderStatus } from "@/lib/store";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

const STYLE: Record<OrderStatus, string> = {
  pending: "border-neutral-300 bg-white text-black",
  delivered: "border-black bg-black text-white",
  returned: "border-neutral-400 bg-neutral-200 text-neutral-700 line-through",
};

export function StatusSelect({
  id,
  status,
  size = "sm",
  onChanged,
}: {
  id: number;
  status: OrderStatus;
  size?: "sm" | "md";
  onChanged?: () => void;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  useEffect(() => setValue(status), [status]);

  return (
    <select
      aria-label="Order status"
      value={value}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        const prev = value;
        setValue(next);
        startTransition(async () => {
          try {
            await updateOrderStatus(id, next);
            onChanged?.();
          } catch (err) {
            setValue(prev);
            alert(err instanceof Error ? err.message : String(err));
          }
        });
      }}
      className={`cursor-pointer rounded-full border font-medium outline-none ${STYLE[value]} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"
      } ${pending ? "opacity-50" : ""}`}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
