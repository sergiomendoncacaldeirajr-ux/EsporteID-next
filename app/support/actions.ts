"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupportChamadoArea } from "@/lib/support/support-areas";

export type SupportChamadoSubmitState = { ok: boolean; message: string };

export async function submitSupportChamado(
  _prev: SupportChamadoSubmitState,
  formData: FormData
): Promise<SupportChamadoSubmitState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Faça login para abrir um chamado." };

  const area = String(formData.get("area") ?? "").trim();
  const mensagem = String(formData.get("mensagem") ?? "").trim();
  if (!isSupportChamadoArea(area)) return { ok: false, message: "Selecione onde ocorreu o problema." };
  if (mensagem.length < 12) return { ok: false, message: "Descreva o problema com pelo menos 12 caracteres." };
  if (mensagem.length > 4000) return { ok: false, message: "Texto muito longo (máx. 4000 caracteres)." };

  const { data: perfil } = await supabase.from("profiles").select("whatsapp").eq("id", user.id).maybeSingle();
  const whatsapp = String(perfil?.whatsapp ?? "").trim() || null;
  if (!whatsapp) {
    return {
      ok: false,
      message: "Cadastre seu WhatsApp no perfil para que possamos retornar o contato. Depois envie o chamado de novo.",
    };
  }

  const { error } = await supabase.from("support_chamados").insert({
    usuario_id: user.id,
    area,
    mensagem,
    whatsapp_contato: whatsapp,
    status: "aberto",
  });

  if (error) return { ok: false, message: error.message || "Não foi possível registrar o chamado." };
  return { ok: true, message: "Chamado registrado. Em breve a equipe entra em contato pelo WhatsApp informado no seu perfil." };
}
