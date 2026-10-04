"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteOrder } from "@/lib/store";

export function DeleteOrderButton({ id, memoNo }: { id: number; memoNo: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost text-red-600 hover:text-red-700"
      onClick={() => {
        if (!confirm(`Delete memo #${memoNo}? This cannot be undone.`)) return;
        startTransition(async () => {
          try {
            await deleteOrder(id);
            router.push("/orders");
          } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
          }
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
