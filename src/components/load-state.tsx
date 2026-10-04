export function Loading() {
  return <div className="py-16 text-center text-sm text-neutral-400">Loading…</div>;
}

export function ErrorBox({ error }: { error: string }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>;
}

export function NotFound({ what }: { what: string }) {
  return <div className="card p-10 text-center text-neutral-500">{what} not found on this device.</div>;
}
