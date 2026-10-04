const takaFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** 1130 -> "৳1,130" */
export function taka(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `৳${takaFormatter.format(Number.isFinite(n) ? n : 0)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-01-08" -> "8 Jan 2026" (no timezone shifting) */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Today's date in Bangladesh as YYYY-MM-DD. */
export function todayDhaka(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}

/** First day of the current month in Bangladesh as YYYY-MM-DD. */
export function monthStartDhaka(): string {
  return `${todayDhaka().slice(0, 7)}-01`;
}

/** Normalise Bangladeshi phone numbers: "+880 1755-990789" -> "01755990789". */
export function normalizePhone(raw: string): string {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("88") && digits.length === 13) digits = digits.slice(2);
  return digits;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  delivered: "Delivered",
  returned: "Returned",
};
