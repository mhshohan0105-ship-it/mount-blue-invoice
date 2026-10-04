import { formatDate, taka } from "@/lib/format";
import type { OrderWithItems, Settings } from "@/lib/types";

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function accentStyle(s: Pick<Settings, "memo_color" | "memo_color2">): React.CSSProperties {
  const c1 = s.memo_color || "#0a0a0a";
  return {
    "--accent": c1,
    "--accent-grad": s.memo_color2 ? `linear-gradient(120deg, ${c1}, ${s.memo_color2})` : `linear-gradient(${c1}, ${c1})`,
  } as React.CSSProperties;
}

const PAYMENT_LABEL = { COD: "Cash on Delivery", Paid: "Paid" } as const;

/** One delivery memo, sized to fill half of an A4 sheet. */
export function Memo({ order, settings }: { order: OrderWithItems; settings: Settings }) {
  const fb = settings.facebook_url.replace(/^https?:\/\/(www\.)?/, "");
  const paid = order.payment_type === "Paid";
  const charge = Number(order.delivery_charge);
  const deliveryInCod = !paid && charge > 0 && order.cod_amount >= order.subtotal + charge;
  const itemCount = order.order_items.reduce((n, i) => n + i.qty, 0);

  return (
    <article
      className={`memo${order.order_items.length > 4 ? " dense" : ""}`}
      style={accentStyle(settings)}
    >
      {/* brand + memo number */}
      <header className="m-head">
        <div className="m-brand">
          <div className="m-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logo_data || "/logo.jpg"} alt="" />
          </div>
          <div className="m-brand-text">
            <div className="m-shop">
              <span className="m-grad">{settings.shop_name}</span>
            </div>
            <div className="m-shop-meta">{settings.address}</div>
            {settings.phone && <div className="m-shop-meta">Hotline {settings.phone}</div>}
          </div>
        </div>
        <div className="m-id">
          <div className="m-eyebrow">Delivery Memo</div>
          <div className="m-no">
            <span className="m-hash">#</span>
            <span className="m-grad">{order.memo_no}</span>
          </div>
        </div>
      </header>

      {/* meta strip */}
      <dl className="m-meta">
        <div>
          <dt>Date</dt>
          <dd>{formatDate(order.date)}</dd>
        </div>
        <div>
          <dt>Courier</dt>
          <dd>{order.courier || "—"}</dd>
        </div>
        <div>
          <dt>Zone</dt>
          <dd>{order.delivery_zone || "—"}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>{PAYMENT_LABEL[order.payment_type]}</dd>
        </div>
      </dl>

      {/* customer + amount to collect */}
      <section className="m-main">
        <div className="m-to">
          <div className="m-eyebrow">Deliver to</div>
          <div className="m-name">{order.customer_name}</div>
          <div className="m-line m-phone">
            <PhoneIcon />
            <span>{order.customer_phone}</span>
          </div>
          {order.customer_address && (
            <div className="m-line m-address">
              <PinIcon />
              <span>{order.customer_address}</span>
            </div>
          )}
        </div>
        <div className={`m-cod${paid ? " m-cod-paid" : ""}`}>
          <div className="m-cod-label">{paid ? "Payment" : "Collect on delivery"}</div>
          <div className="m-cod-amount m-grad">{paid ? "PAID" : taka(order.cod_amount)}</div>
          <div className="m-cod-sub">
            {paid ? "Nothing to collect" : `${itemCount} item${itemCount === 1 ? "" : "s"}${deliveryInCod ? " + delivery" : ""}`}
          </div>
        </div>
      </section>

      {/* items */}
      <div className="m-items-wrap">
        <table className="m-items">
          <thead>
            <tr>
              <th className="m-c-no">#</th>
              <th>Item</th>
              <th className="m-c-ctr">Size</th>
              <th className="m-c-ctr">Qty</th>
              <th className="m-c-num">Price</th>
              <th className="m-c-num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item, i) => (
              <tr key={item.id}>
                <td className="m-c-no">{String(i + 1).padStart(2, "0")}</td>
                <td className="m-c-item">{item.product_name}</td>
                <td className="m-c-ctr">{item.size || "—"}</td>
                <td className="m-c-ctr">{item.qty}</td>
                <td className="m-c-num m-muted">{taka(item.unit_price)}</td>
                <td className="m-c-num m-strong">{taka(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* note + totals */}
      <section className="m-bottom">
        <div className="m-notes">
          {order.note && (
            <div className="m-note">
              <span className="m-eyebrow">Note</span> {order.note}
            </div>
          )}
          <div className="m-check">
            <EyeIcon />
            <span lang="bn">পার্সেল খোলার আগে ডেলিভারি ম্যানের সামনে চেক করুন</span>
          </div>
        </div>
        <dl className="m-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{taka(order.subtotal)}</dd>
          </div>
          <div>
            <dt>Delivery{!paid && charge > 0 && !deliveryInCod ? " (not incl.)" : ""}</dt>
            <dd>{charge ? taka(charge) : "Free"}</dd>
          </div>
          <div className="m-total">
            <dt>{paid ? "Paid" : "Total COD"}</dt>
            <dd>
              <span className="m-grad">{taka(paid ? order.subtotal + charge : order.cod_amount)}</span>
            </dd>
          </div>
        </dl>
      </section>

      <footer className="m-foot">
        <span>{settings.footer_text}</span>
        <span className="m-foot-fb">{fb}</span>
      </footer>
    </article>
  );
}
