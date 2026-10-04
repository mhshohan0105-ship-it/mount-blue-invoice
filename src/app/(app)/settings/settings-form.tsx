"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

/** Shrink an uploaded image to fit in a square and return it as a data URL. */
function resizeImage(file: File, max = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000"; // logo sits on a black square anyway
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = URL.createObjectURL(file);
  });
}

export function SettingsForm({ settings, nextMemoNo }: { settings: Settings; nextMemoNo: number }) {
  const [s, setS] = useState(settings);
  const [zones, setZones] = useState(settings.delivery_zones.map((z) => ({ name: z.name, charge: String(z.charge) })));
  const [couriers, setCouriers] = useState(settings.couriers);
  const [memo, setMemo] = useState(String(nextMemoNo));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setS((prev) => ({ ...prev, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      try {
        await saveSettings(
          {
            ...s,
            delivery_zones: zones.map((z) => ({ name: z.name, charge: Number(z.charge) || 0 })),
            couriers: couriers.map((c) => c.trim()).filter(Boolean),
          },
          Number(memo),
        );
        setMsg({ ok: true, text: "Settings saved" });
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">Shop info</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.logo_data || "/logo.jpg"} alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div className="space-y-2">
            <label className="btn-outline cursor-pointer">
              Upload logo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    set("logo_data", await resizeImage(file));
                  } catch (err) {
                    setMsg({ ok: false, text: (err as Error).message });
                  }
                  e.target.value = "";
                }}
              />
            </label>
            {s.logo_data && (
              <button type="button" className="btn-ghost block px-2 py-1 text-xs" onClick={() => set("logo_data", null)}>
                Use default logo
              </button>
            )}
          </div>
        </div>
        <Field label="Shop name" value={s.shop_name} onChange={(v) => set("shop_name", v)} />
        <div>
          <label className="label" htmlFor="address">
            Address
          </label>
          <textarea
            id="address"
            rows={2}
            className="input"
            value={s.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
        <Field label="Phone" value={s.phone} onChange={(v) => set("phone", v)} />
        <Field label="Footer text" value={s.footer_text} onChange={(v) => set("footer_text", v)} />
        <Field
          label="Facebook page link"
          value={s.facebook_url}
          placeholder="facebook.com/yourpage"
          onChange={(v) => set("facebook_url", v)}
        />
      </section>

      <div className="space-y-5">
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Delivery zones</h2>
          {zones.map((z, i) => (
            <div key={i} className="flex gap-2">
              <input
                aria-label="Zone name"
                className="input flex-1"
                value={z.name}
                onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <input
                aria-label="Charge"
                type="number"
                min={0}
                className="input w-28"
                value={z.charge}
                onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, charge: e.target.value } : x)))}
              />
              <button
                type="button"
                aria-label="Remove zone"
                className="btn-ghost px-3"
                disabled={zones.length === 1}
                onClick={() => setZones(zones.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn-outline" onClick={() => setZones([...zones, { name: "", charge: "0" }])}>
            + Add zone
          </button>
          <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-neutral-100 pt-3">
            <span>
              <span className="block font-medium">Add delivery charge to COD amount</span>
              <span className="text-sm text-neutral-500">When off, COD = product subtotal only.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={s.add_delivery_to_cod}
              onChange={(e) => set("add_delivery_to_cod", e.target.checked)}
              className="peer sr-only"
            />
            <span className="relative h-7 w-12 shrink-0 rounded-full bg-neutral-300 transition after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:bg-black peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-black peer-focus-visible:ring-offset-2" />
          </label>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Couriers</h2>
          {couriers.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                aria-label="Courier name"
                className="input flex-1"
                value={c}
                onChange={(e) => setCouriers(couriers.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button
                type="button"
                aria-label="Remove courier"
                className="btn-ghost px-3"
                disabled={couriers.length === 1}
                onClick={() => setCouriers(couriers.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn-outline" onClick={() => setCouriers([...couriers, ""])}>
            + Add courier
          </button>
        </section>

        <MemoColorPicker
          color={s.memo_color}
          color2={s.memo_color2}
          onChange={(c1, c2) => setS((prev) => ({ ...prev, memo_color: c1, memo_color2: c2 }))}
        />

        <section className="card space-y-2 p-5">
          <h2 className="font-semibold">Memo numbers</h2>
          <label className="label" htmlFor="memo">
            Next memo number
          </label>
          <input
            id="memo"
            type="number"
            min={1}
            className="input w-40"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          <p className="text-sm text-neutral-500">Must be higher than every memo already saved.</p>
        </section>
      </div>

      <div className="sticky bottom-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:col-span-2">
        <button className="btn-primary px-6" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        {msg && <span className={`text-sm font-medium ${msg.ok ? "text-black" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

const SOLID_PRESETS = [
  { name: "Black", c1: "#0a0a0a" },
  { name: "Navy", c1: "#1e3a8a" },
  { name: "Royal blue", c1: "#2563eb" },
  { name: "Maroon", c1: "#881337" },
  { name: "Forest", c1: "#166534" },
];
const GRADIENT_PRESETS = [
  { name: "Ocean", c1: "#1e3a8a", c2: "#06b6d4" },
  { name: "Royal", c1: "#4338ca", c2: "#db2777" },
  { name: "Sunset", c1: "#be123c", c2: "#f59e0b" },
  { name: "Steel", c1: "#0a0a0a", c2: "#64748b" },
  { name: "Forest", c1: "#14532d", c2: "#65a30d" },
];

const swatch = (c1: string, c2: string | null) =>
  c2 ? `linear-gradient(120deg, ${c1}, ${c2})` : c1;

function MemoColorPicker({
  color,
  color2,
  onChange,
}: {
  color: string;
  color2: string | null;
  onChange: (c1: string, c2: string | null) => void;
}) {
  const isGradient = !!color2;
  const isActive = (c1: string, c2: string | null) =>
    c1.toLowerCase() === color.toLowerCase() && (c2 ?? "").toLowerCase() === (color2 ?? "").toLowerCase();

  const Swatch = ({ name, c1, c2 = null }: { name: string; c1: string; c2?: string | null }) => (
    <button
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={isActive(c1, c2)}
      onClick={() => onChange(c1, c2)}
      className={`h-9 w-9 rounded-full border-2 transition ${
        isActive(c1, c2) ? "border-black ring-2 ring-black ring-offset-2" : "border-white shadow"
      }`}
      style={{ background: swatch(c1, c2) }}
    />
  );

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Memo colour</h2>
        <p className="text-sm text-neutral-500">
          Used for the shop name, memo number, COD box and lines. Black-and-white printers print colours as grey.
        </p>
      </div>

      {/* live preview */}
      <div
        className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
      >
        <span
          className="bg-clip-text text-lg font-extrabold tracking-[0.3em] text-transparent"
          style={{ backgroundImage: `linear-gradient(120deg, ${color}, ${color2 ?? color})` }}
        >
          MOUNT BLUE
        </span>
        <span
          className="rounded-lg border-2 px-3 py-1 text-lg font-extrabold"
          style={{
            borderColor: "transparent",
            background: `linear-gradient(#fff,#fff) padding-box, linear-gradient(120deg, ${color}, ${color2 ?? color}) border-box`,
            color,
          }}
        >
          ৳1,130
        </span>
      </div>

      <div>
        <div className="label">Solid</div>
        <div className="flex flex-wrap gap-3">
          {SOLID_PRESETS.map((p) => (
            <Swatch key={p.name} {...p} />
          ))}
        </div>
      </div>
      <div>
        <div className="label">Gradient</div>
        <div className="flex flex-wrap gap-3">
          {GRADIENT_PRESETS.map((p) => (
            <Swatch key={p.name} {...p} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 border-t border-neutral-100 pt-4">
        <label className="text-sm">
          <span className="label">{isGradient ? "Colour 1" : "Custom colour"}</span>
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value, color2)}
            className="h-10 w-16 cursor-pointer rounded border border-neutral-300"
          />
        </label>
        {isGradient && (
          <label className="text-sm">
            <span className="label">Colour 2</span>
            <input
              type="color"
              value={color2 ?? "#000000"}
              onChange={(e) => onChange(color, e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-neutral-300"
            />
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={isGradient}
            onChange={(e) => onChange(color, e.target.checked ? "#06b6d4" : null)}
            className="h-4 w-4 accent-black"
          />
          Gradient
        </label>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
