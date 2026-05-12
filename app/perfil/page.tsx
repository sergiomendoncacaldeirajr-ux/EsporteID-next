import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/auth/rsc-auth";

export const dynamic = "force-dynamic";

export default async function MeuPerfilRedirectPage() {
  const { user } = await getServerAuth();
  if (!user) redirect("/login");
  redirect(`/perfil/${user.id}`);
}
