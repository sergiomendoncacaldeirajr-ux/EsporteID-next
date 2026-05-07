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
    <div className="min-h-screen bg-eid-bg text-eid-fg" data-eid-admin>
      <AdminSidebar hasServiceRole={hasServiceRole} />

      {/* Content area — offset by sidebar on desktop, full-width on mobile */}
      <div className="flex min-w-0 flex-col md:ml-56">
        {/* Spacer for mobile top bar */}
        <div className="h-12 md:hidden" aria-hidden />

        <main className="min-h-[calc(100vh-3rem)] px-4 py-6 md:min-h-screen md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
