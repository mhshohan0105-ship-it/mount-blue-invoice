"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

const LINKS = [
  { href: "/", label: "New order" },
  { href: "/orders", label: "Orders" },
  { href: "/customers", label: "Customers" },
  { href: "/products", label: "Products" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="no-print sticky top-0 z-20 bg-black text-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" className="h-8 w-8 rounded-md" />
          <span className="hidden text-sm font-extrabold tracking-[0.3em] sm:inline">MOUNT BLUE</span>
        </Link>
        <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive(l.href) ? "bg-white text-black" : "text-neutral-300 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <button className="shrink-0 rounded-md px-2 py-1.5 text-xs text-neutral-400 hover:text-white">Log out</button>
        </form>
      </div>
    </header>
  );
}
