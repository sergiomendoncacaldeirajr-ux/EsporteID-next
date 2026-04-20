-- Permite que usuários autenticados vejam partidas 1v1 já encerradas (resultado público no ranking),
-- além da regra existente de participante. Necessário para histórico no perfil / página EID por esporte.

create policy "partidas_read_concluidas_publico"
  on public.partidas for select
  to authenticated
  using (
    jogador1_id is not null
    and jogador2_id is not null
    and lower(coalesce(status, '')) in (
      'encerrada',
      'finalizada',
      'concluida',
      'concluída',
      'validada'
    )
  );
