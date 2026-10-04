# MOUNT BLUE · Invoice & Delivery Memo

A private web app for creating orders and printing delivery memos (2 per A4 page) for MOUNT BLUE.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Vercel. **No database:** all data is stored in your browser (IndexedDB).

---

## How your data is stored (important)

- Orders, customers, products and settings are saved **inside the browser** you use (Chrome on your PC, Chrome on your phone, etc.). Nothing is stored on Vercel.
- Each browser/device has **its own separate data**. An order made on your phone will not appear on your PC.
- Clearing the browser's site data, or uninstalling the browser, **deletes your orders**.
- So: go to **Settings → Backup & restore → Download backup** regularly (the Orders page reminds you every 7 days) and keep the file in Google Drive or email.
- To move to a new phone/PC: download a backup on the old one, then **Restore from backup** on the new one.
- If you do use two devices, give them different memo ranges in **Settings → Next memo number** (e.g. PC from 3849, phone from 9000) so numbers never clash.

## 1. Run it on your computer

You need Node.js 20 or newer.

```bash
npm install
```

Copy `.env.example` to `.env.local` and set your values:

| Variable | What to put |
| --- | --- |
| `APP_PASSWORD` | The password you'll use to log in |
| `SESSION_SECRET` | Any long random text. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

```bash
npm run dev
```

Open <http://localhost:3000> and log in with your `APP_PASSWORD`.

## 2. Deploy to Vercel (free Hobby plan)

1. Push this folder to a **private** GitHub repository.
2. Go to <https://vercel.com/new>, sign in with GitHub and **Import** the repository. Framework: **Next.js** (auto-detected).
3. Under **Environment Variables** add `APP_PASSWORD` and `SESSION_SECRET`.
4. Click **Deploy**. You'll get a URL like `https://mount-blue-xxxx.vercel.app`.
5. On your phone open it and use **Add to Home Screen**.

Changing `APP_PASSWORD` later: Vercel → **Settings → Environment Variables**, edit, then **Deployments → ⋯ → Redeploy**. This logs out every device (your data stays in the browser).

Note: data saved on `localhost` and data saved on your Vercel URL are separate. Use Backup/Restore to move between them.

---

## Using the app

| Page | What it does |
| --- | --- |
| **New order** (`/`) | Type the phone first; a saved customer's name and address fill in automatically. Add items, pick courier and zone; the summary shows COD live. **Save** keeps you on the form for the next order; **Save and print** opens the print dialog. |
| **Orders** | Today's count, today's COD and this month's COD. Search by memo no / name / phone, filter by date and status, change status inline, tick orders and **Print selected**. |
| **Products** | **Sync from website** pulls every product (name, price, sizes, stock) from mountblue4u.com; it runs automatically the first time on a new device. Sold-out items become inactive. You can also add, edit and deactivate products by hand. |
| **Customers** | Search customers and see each one's order history. |
| **Settings** | Shop info, logo, footer, Facebook link, delivery zones, couriers, "add delivery charge to COD", next memo number, and Backup & restore. |

**COD maths:** `COD = subtotal + delivery charge` when the Settings switch is on, otherwise just `subtotal`. Orders marked **Paid** have COD ৳0.

### Printing tips

- In the print dialog choose **A4**, **Margins: None** (or Default), **Scale: 100%**, and turn **Headers and footers** off.
- Chrome and Edge give the most accurate result.
- Each half fits about 8–10 item rows; longer orders get tighter rows automatically.

---

## Project structure

```
src/proxy.ts                 login check on every page (Next 16's name for middleware.ts)
src/lib/auth.ts              signed httpOnly session cookie
src/lib/store.ts             all data storage (browser IndexedDB) + backup/restore
src/lib/validation.ts        input checks
src/lib/calc.ts              subtotal / COD maths
src/lib/couriers/            courier API interface (for Steadfast later)
src/app/actions.ts           login / logout (the only server code)
src/app/(app)/               pages with the navigation bar
src/app/(print)/             print pages (no app UI)
src/components/memo.tsx      the printed memo design
```

## Future: Steadfast courier integration

Orders already have `consignment_id` and `tracking_code` fields, and `src/lib/couriers/types.ts` defines a `CourierProvider` interface. The API keys must stay on the server, so the plan is: a server action receives the order from the browser, calls Steadfast with `STEADFAST_API_KEY` / `STEADFAST_SECRET_KEY`, and returns the tracking code, which the browser then saves on the order.
