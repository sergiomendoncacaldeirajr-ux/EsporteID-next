"use server";

import { redirect } from "next/navigation";
import { iniciarPerfilAtletaAction, type OnboardingActionResult } from "@/app/onboarding/actions";

export async function submitCriarPerfilAtletaForm(
  _prev: OnboardingActionResult | undefined,
  _formData: FormData
): Promise<OnboardingActionResult> {
  const r = await iniciarPerfilAtletaAction();
  if (!r.ok) return r;
  redirect("/onboarding");
}
