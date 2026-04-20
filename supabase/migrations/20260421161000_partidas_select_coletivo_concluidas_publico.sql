-- Leitura pública (autenticada) de partidas de time/dupla já encerradas — espelha a regra 1v1.

create policy "partidas_read_coletivo_concluidas_publico"
  on public.partidas for select
  to authenticated
  using (
    time1_id is not null
    and time2_id is not null
    and lower(coalesce(status, '')) in (
      'encerrada',
      'finalizada',
      'concluida',
      'concluída',
      'validada'
    )
  );
