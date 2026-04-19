import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { hasServiceRoleConfig } from "@/lib/supabase/service-role";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  const hasServiceRole = hasServiceRoleConfig();
  return <AdminShell hasServiceRole={hasServiceRole}>{children}</AdminShell>;
}
