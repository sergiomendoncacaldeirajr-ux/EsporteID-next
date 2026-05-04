export type SupportChamadoArea =
  | "dashboard"
  | "desafio_match"
  | "ranking"
  | "vagas"
  | "perfil"
  | "torneios"
  | "locais"
  | "comunidade"
  | "conta"
  | "outro";

export const SUPPORT_CHAMADO_AREAS: { value: SupportChamadoArea; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "desafio_match", label: "Desafio / Match" },
  { value: "ranking", label: "Ranking" },
  { value: "vagas", label: "Vagas / Times / Elenco" },
  { value: "perfil", label: "Perfil público / EID" },
  { value: "torneios", label: "Torneios" },
  { value: "locais", label: "Locais / Reservas" },
  { value: "comunidade", label: "Comunidade / Social" },
  { value: "conta", label: "Conta / login / termos" },
  { value: "outro", label: "Outro" },
];

const AREA_SET = new Set<string>(SUPPORT_CHAMADO_AREAS.map((a) => a.value));

export function isSupportChamadoArea(v: string): v is SupportChamadoArea {
  return AREA_SET.has(v);
}

export const SUPPORT_FAQ_ITEMS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Não consigo ver o ranking ou apareço sem posição",
    resposta:
      "Confira se o esporte está selecionado no filtro, se o gênero do ranking bate com o do seu perfil e se você já tem EID cadastrado naquele esporte. Partidas ainda não validadas podem demorar a refletir.",
  },
  {
    pergunta: "Desafio ou match não aparece ou está travado",
    resposta:
      "Veja na Agenda se há pendência de aceite ou placar. Em dupla/time, só o líder pode certas ações. Se houver carência de ranking, o sistema pode bloquear novo desafio contra o mesmo adversário.",
  },
  {
    pergunta: "Modo amistoso ou radar sem sugestões",
    resposta:
      "O amistoso usa janela de disponibilidade e filtros de perfil. Ative o modo amistoso no seu perfil, confira localização/coordenadas e se o esporte permite desafio individual.",
  },
  {
    pergunta: "Não encontro vaga ou convite de time",
    resposta:
      "Vagas dependem do esporte da formação e do que o capitão publicou. Confirme se você está no papel certo (atleta) e se o time está ativo naquele esporte.",
  },
  {
    pergunta: "Problema com reserva ou espaço",
    resposta:
      "Verifique se o espaço aceita reserva, horários disponíveis e se há bloqueio administrativo. Em dúvida sobre pagamento, use o histórico na sua conta.",
  },
];
