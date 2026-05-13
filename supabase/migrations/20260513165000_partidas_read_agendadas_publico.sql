-- Permite que usuários autenticados vejam confrontos agendados em listagens públicas.
-- A aplicação seleciona somente dados públicos: participantes, esporte, horário e local.

drop policy if exists "partidas_read_agendadas_publico" on public.partidas;

create policy "partidas_read_agendadas_publico"
  on public.partidas for select
  to authenticated
  using (
    lower(coalesce(status, '')) = 'agendada'
    and data_partida is not null
    and (
      (jogador1_id is not null and jogador2_id is not null)
      or (time1_id is not null and time2_id is not null)
    )
  );
