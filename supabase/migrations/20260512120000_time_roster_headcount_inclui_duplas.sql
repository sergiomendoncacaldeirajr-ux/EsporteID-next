-- Contagem de elenco: incluir player1/player2 de `duplas` quando o time é dupla no mesmo esporte
-- e o líder atual é um dos jogadores (parceiro pode existir só na tabela duplas, sem linha em membros_time).

create or replace function public.time_roster_headcount(p_time_id bigint)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select count(distinct uid)::int
      from (
        select m.usuario_id as uid
        from public.membros_time m
        where m.time_id = p_time_id
          and lower(trim(coalesce(m.status, ''))) in ('ativo', 'aceito', 'aprovado')
        union all
        select t.criador_id as uid
        from public.times t
        where t.id = p_time_id
          and t.criador_id is not null
        union all
        select d.player1_id as uid
        from public.duplas d
        join public.times t on t.id = p_time_id
          and t.esporte_id = d.esporte_id
          and lower(trim(coalesce(t.tipo, ''))) = 'dupla'
        where d.player1_id is not null
          and (d.player1_id = t.criador_id or d.player2_id = t.criador_id)
        union all
        select d.player2_id as uid
        from public.duplas d
        join public.times t on t.id = p_time_id
          and t.esporte_id = d.esporte_id
          and lower(trim(coalesce(t.tipo, ''))) = 'dupla'
        where d.player2_id is not null
          and (d.player1_id = t.criador_id or d.player2_id = t.criador_id)
      ) s
      where uid is not null
    ),
    0
  );
$$;

create or replace function public.time_roster_headcount_many(p_time_ids bigint[])
returns table(time_id bigint, headcount integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id as time_id,
    coalesce(
      (
        select count(distinct uid)::int
        from (
          select m.usuario_id as uid
          from public.membros_time m
          where m.time_id = t.id
            and lower(trim(coalesce(m.status, ''))) in ('ativo', 'aceito', 'aprovado')
          union all
          select tt.criador_id as uid
          from public.times tt
          where tt.id = t.id
            and tt.criador_id is not null
          union all
          select d.player1_id as uid
          from public.duplas d
          where t.esporte_id = d.esporte_id
            and lower(trim(coalesce(t.tipo, ''))) = 'dupla'
            and d.player1_id is not null
            and (d.player1_id = t.criador_id or d.player2_id = t.criador_id)
          union all
          select d.player2_id as uid
          from public.duplas d
          where t.esporte_id = d.esporte_id
            and lower(trim(coalesce(t.tipo, ''))) = 'dupla'
            and d.player2_id is not null
            and (d.player1_id = t.criador_id or d.player2_id = t.criador_id)
        ) s
        where uid is not null
      ),
      0
    )::int as headcount
  from public.times t
  where t.id = any(coalesce(p_time_ids, '{}'::bigint[]))
  order by t.id;
$$;
