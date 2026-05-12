import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-nav";

export function AdminShell({
  children,
  hasServiceRole,
}: {
  children: ReactNode;
  hasServiceRole: boolean;
}) {
  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--eid-primary-500)_12%,transparent),transparent_28rem),linear-gradient(180deg,color-mix(in_srgb,var(--eid-brand-ink)_34%,var(--eid-bg)),var(--eid-bg)_18rem)] text-eid-fg"
      data-eid-admin
    >
      <AdminSidebar hasServiceRole={hasServiceRole} />

      <div className="flex min-w-0 flex-col overflow-x-clip md:ml-68">
        <div className="h-[calc(3.5rem+env(safe-area-inset-top,0px))] md:hidden" aria-hidden />

        <main className="min-h-[calc(100vh-3.5rem)] min-w-0 px-3 py-4 sm:px-4 md:min-h-screen md:px-8 md:py-7 xl:px-10">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
