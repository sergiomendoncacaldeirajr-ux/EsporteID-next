import { redirect } from "next/navigation";

/** Rota legada: recrutamento e candidaturas ficam em `/times`. */
export default function VagasPage() {
  redirect("/times");
}
