import { NextResponse } from "next/server";
import { createAsaasCustomer } from "@/lib/asaas/client";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, nome, whatsapp, asaas_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }
  if (profile.asaas_customer_id) {
    return NextResponse.json({ customerId: profile.asaas_customer_id, reused: true });
  }

  try {
    const created = await createAsaasCustomer({
      name: profile.nome ?? user.email ?? "Cliente EsporteID",
      email: user.email,
      mobilePhone: profile.whatsapp,
      externalReference: profile.id,
    });

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ asaas_customer_id: created.id, atualizado_em: new Date().toISOString() })
      .eq("id", user.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ customerId: created.id, reused: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar customer no Asaas." },
      { status: 500 }
    );
  }
}
