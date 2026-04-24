import type { User } from "@supabase/supabase-js";
import { getCachedIsPlatformAdmin } from "@/lib/auth/platform-admin";
import { SiteFooter } from "@/components/site-footer";

type Props = {
  user: User | null;
};

/** Consulta `platform_admins` fora do caminho crítico do layout. */
export async function SiteFooterLoader({ user }: Props) {
  const isPlatformAdmin = user ? await getCachedIsPlatformAdmin() : false;
  return <SiteFooter user={user} isPlatformAdmin={isPlatformAdmin} />;
}
