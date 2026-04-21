import { redirect } from "next/navigation";

export const metadata = {
  title: "Minhas aulas",
};

export default async function MinhasAulasPage() {
  redirect("/comunidade");
}
