# MOUNT BLUE · Invoice & Delivery Memo

A private web app for creating orders and printing delivery memos (2 per A4 page, or PDF) for MOUNT BLUE.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Neon Postgres (free) · Vercel

All data (orders, customers, products, settings) is stored in a free Neon Postgres database, so your phone and computer see the same orders. **The database tables are created automatically** the first time the app runs. You never need to run SQL.

---

## 1. Deploy to Vercel (free Hobby plan)

1. Push this folder to a **private** GitHub repository.
2. Go to <https://vercel.com/new>, sign in with GitHub and **Import** the repository. Framework: **Next.js** (auto-detected).
3. Under **Environment Variables** add:

   | Variable | What to put |
   | --- | --- |
   | `APP_PASSWORD` | The password you'll use to log in |
   | `SESSION_SECRET` | Any long random text. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

4. Click **Deploy**.

## 2. Add the free Neon database

1. In your Vercel project open the **Storage** tab → **Create Database** → choose **Neon** (Serverless Postgres) → **Continue**.
2. Plan: **Free**. Region: **Singapore (ap-southeast-1)**. It's closest to Bangladesh, and the app's server also runs in Singapore (`vercel.json`).
3. Give it a name (e.g. `mount-blue-db`) → **Create** → **Connect** it to this project (all environments).
   Vercel adds `DATABASE_URL` to the project for you.
4. Go to **Deployments** → **⋯** on the latest one → **Redeploy** so the app picks up the new variable.
5. Open your site and log in. On first load the app creates its tables and pulls your products from mountblue4u.com.

> Free Neon limits: 0.5 GB storage, which fits many thousands of orders. The database sleeps when unused, so the first request after a quiet period can take 1–2 seconds.

## 3. Run it on your computer (optional)

You need Node.js 20 or newer.

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in `APP_PASSWORD`, `SESSION_SECRET` and `DATABASE_URL`. You can copy the URL from Vercel → **Storage** → your database → **.env.local** tab.

```bash
npm run dev
```

Open <http://localhost:3000>. Local and live use the **same** database, so orders you make locally show up on the live site.

Changing `APP_PASSWORD` later: Vercel → **Settings → Environment Variables**, edit it, then **Redeploy**. This logs out every device.

---

## Using the app

| Page | What it does |
| --- | --- |
| **New order** (`/`) | Type the phone first; a saved customer's name and address fill in automatically. Search products by typing, pick courier and zone; the summary shows COD live. **Save** keeps you on the form for the next order. **Save and print** opens the print dialog. |
| **Orders** | Today's count, today's COD and this month's COD. Search by memo no / name / phone, filter by date and status, change status inline, tick orders and **Print / PDF**. |
| **Products** | **Sync from website** pulls every product (name, price, sizes, stock) from mountblue4u.com and runs automatically the first time. Sold-out items become inactive. You can also add, edit and deactivate products by hand. |
| **Customers** | Search customers and see each one's order history. |
| **Settings** | Shop info, logo, footer, Facebook link, delivery zones, couriers, "add delivery charge to COD", memo colour (solid or gradient), next memo number, and Backup & restore. |

**COD maths:** `COD = subtotal + delivery charge` when the Settings switch is on, otherwise just `subtotal`. Orders marked **Paid** have COD ৳0.

**Moving from the old offline version:** if a browser still holds orders from the earlier browser-only version, **Settings → Backup & restore** shows a **Move them to the database** button.

### Printing tips

- In the print dialog choose **A4**, **Margins: None** (or Default), **Scale: 100%**, and turn **Headers and footers** off.
- **Download PDF** creates the same two-per-page layout as a file.
- Each half fits about 8–10 item rows; longer orders get tighter rows automatically.

---

## Project structure

```
src/proxy.ts                 login check on every page (Next 16's name for middleware.ts)
src/lib/auth.ts, session.ts  signed httpOnly session cookie
src/lib/db.ts                Neon connection + automatic migrations
src/lib/schema.ts            database tables and SQL functions
src/lib/store.ts             all data operations (server actions)
src/lib/catalog.ts           reads products from the Shopify website
src/lib/validation.ts        input checks
src/lib/calc.ts              subtotal / COD maths
src/lib/couriers/            courier API interface (for Steadfast later)
src/app/(app)/               pages with the navigation bar
src/app/(print)/             print pages (no app UI)
src/components/memo.tsx      the printed memo design
```

## Future: Steadfast courier integration

Orders already have `consignment_id` and `tracking_code` columns, and `src/lib/couriers/types.ts` defines a `CourierProvider` interface. Add `STEADFAST_API_KEY` / `STEADFAST_SECRET_KEY`, implement the provider, and add a "Send to Steadfast" server action that saves the returned tracking code on the order.
