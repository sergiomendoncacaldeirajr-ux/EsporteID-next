import { DashboardTopbar } from "@/components/dashboard/topbar";

/** Área logada da conta: mesma navegação do app (painel, match, etc.). */
export default function ContaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardTopbar />
      {children}
    </>
  );
}
