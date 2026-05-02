-- Dupla/time: mesmas regras de ranking que individual (carência, pedido pendente duplicado),
-- aplicadas ao par de formações (times), não só aos UUIDs fixos em usuario_id/adversario_id.
-- `times.criador_id` já é o líder atual (transferência atualiza a coluna).
-- UPDATE em matches: permitir líder atual das formações referenciadas (além dos UUIDs na linha).

drop policy if exists "matches_update_participants" on public.matches;

create policy "matches_update_participants"
  on public.matches for update
  to authenticated
  using (
    auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2)
    or (
      desafiante_time_id is not null
      and exists (
        select 1
        from public.times t
        where t.id = matches.desafiante_time_id
          and t.criador_id = auth.uid()
      )
    )
    or (
      adversario_time_id is not null
      and exists (
        select 1
        from public.times t
        where t.id = matches.adversario_time_id
          and t.criador_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2)
    or (
      desafiante_time_id is not null
      and exists (
        select 1
        from public.times t
        where t.id = matches.desafiante_time_id
          and t.criador_id = auth.uid()
      )
    )
    or (
      adversario_time_id is not null
      and exists (
        select 1
        from public.times t
        where t.id = matches.adversario_time_id
          and t.criador_id = auth.uid()
      )
    )
  );

-- RPC solicitar_desafio_match (limites por perfil individual vs formação): ver 20260506120000_solicitar_desafio_limites_por_formacao.sql


