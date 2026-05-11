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

      <div className="flex min-w-0 flex-col md:ml-68">
        <div className="h-14 md:hidden" aria-hidden />

        <main className="min-h-[calc(100vh-3.5rem)] px-4 py-5 md:min-h-screen md:px-8 md:py-7 xl:px-10">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
