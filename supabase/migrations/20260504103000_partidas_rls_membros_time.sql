-- Membros ativos de time1/time2 enxergam e atualizam partidas de desafio (agenda, placar pendente).

drop policy if exists "partidas_select_access" on public.partidas;

create policy "partidas_select_access"
  on public.partidas for select
  to authenticated
  using (
    auth.uid() in (jogador1_id, jogador2_id, usuario_id, desafiante_id, desafiado_id, lancado_por)
    or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or (
      torneio_id is not null
      and exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
    )
    or (
      torneio_id is not null
      and exists (
        select 1
        from public.torneio_staff ts
        where ts.torneio_id = partidas.torneio_id
          and ts.usuario_id = auth.uid()
      )
    )
    or (
      time1_id is not null
      and exists (
        select 1
        from public.membros_time mt
        where mt.time_id = partidas.time1_id
          and mt.usuario_id = auth.uid()
          and mt.status in ('ativo', 'aceito', 'aprovado')
      )
    )
    or (
      time2_id is not null
      and exists (
        select 1
        from public.membros_time mt
        where mt.time_id = partidas.time2_id
          and mt.usuario_id = auth.uid()
          and mt.status in ('ativo', 'aceito', 'aprovado')
      )
    )
  );

drop policy if exists "partidas_write_non_tournament_participant" on public.partidas;

create policy "partidas_write_non_tournament_participant"
  on public.partidas for all
  to authenticated
  using (
    torneio_id is null
    and (
      auth.uid() in (jogador1_id, jogador2_id, usuario_id, desafiante_id, desafiado_id, lancado_por)
      or (
        time1_id is not null
        and exists (
          select 1
          from public.membros_time mt
          where mt.time_id = partidas.time1_id
            and mt.usuario_id = auth.uid()
            and mt.status in ('ativo', 'aceito', 'aprovado')
        )
      )
      or (
        time2_id is not null
        and exists (
          select 1
          from public.membros_time mt
          where mt.time_id = partidas.time2_id
            and mt.usuario_id = auth.uid()
            and mt.status in ('ativo', 'aceito', 'aprovado')
        )
      )
    )
  )
  with check (
    torneio_id is null
    and (
      auth.uid() in (jogador1_id, jogador2_id, usuario_id, desafiante_id, desafiado_id, lancado_por)
      or (
        time1_id is not null
        and exists (
          select 1
          from public.membros_time mt
          where mt.time_id = partidas.time1_id
            and mt.usuario_id = auth.uid()
            and mt.status in ('ativo', 'aceito', 'aprovado')
        )
      )
      or (
        time2_id is not null
        and exists (
          select 1
          from public.membros_time mt
          where mt.time_id = partidas.time2_id
            and mt.usuario_id = auth.uid()
            and mt.status in ('ativo', 'aceito', 'aprovado')
        )
      )
    )
  );
