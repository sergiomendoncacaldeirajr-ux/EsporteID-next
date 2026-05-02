-- Partidas de ranking (dupla/time): preencher times no match a partir da partida vinculada
-- e permitir que membros do elenco vejam o match quando os IDs de time no `matches` estavam nulos.

update public.matches m
set
  desafiante_time_id = coalesce(m.desafiante_time_id, sub.t1),
  adversario_time_id = coalesce(m.adversario_time_id, sub.t2)
from (
  select distinct on (p.match_id)
    p.match_id as mid,
    p.time1_id as t1,
    p.time2_id as t2
  from public.partidas p
  where p.match_id is not null
    and p.time1_id is not null
    and p.time2_id is not null
    and p.torneio_id is null
  order by p.match_id, p.id desc
) sub
where m.id = sub.mid
  and coalesce(m.finalidade, '') = 'ranking'
  and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) in ('dupla', 'time')
  and (m.desafiante_time_id is null or m.adversario_time_id is null);

drop policy if exists "matches_select_participants_and_teams" on public.matches;

create policy "matches_select_participants_and_teams"
  on public.matches for select
  to authenticated
  using (
    auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2)
    or (
      desafiante_time_id is not null
      and exists (
        select 1
        from public.membros_time mt
        where mt.time_id = matches.desafiante_time_id
          and mt.usuario_id = auth.uid()
          and mt.status in ('ativo', 'aceito', 'aprovado')
      )
    )
    or (
      adversario_time_id is not null
      and exists (
        select 1
        from public.membros_time mt
        where mt.time_id = matches.adversario_time_id
          and mt.usuario_id = auth.uid()
          and mt.status in ('ativo', 'aceito', 'aprovado')
      )
    )
    or exists (
      select 1
      from public.partidas p
      where p.match_id = matches.id
        and p.torneio_id is null
        and (
          (
            p.time1_id is not null
            and exists (
              select 1
              from public.membros_time mt
              where mt.time_id = p.time1_id
                and mt.usuario_id = auth.uid()
                and mt.status in ('ativo', 'aceito', 'aprovado')
            )
          )
          or (
            p.time2_id is not null
            and exists (
              select 1
              from public.membros_time mt
              where mt.time_id = p.time2_id
                and mt.usuario_id = auth.uid()
                and mt.status in ('ativo', 'aceito', 'aprovado')
            )
          )
        )
    )
  );
