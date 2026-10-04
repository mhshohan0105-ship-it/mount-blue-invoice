import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-5 pb-16 sm:py-8">{children}</main>
    </div>
  );
}
