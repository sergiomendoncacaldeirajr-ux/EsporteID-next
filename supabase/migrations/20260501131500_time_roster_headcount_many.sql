-- Batch headcount for teams/duplas to avoid N+1 RPC calls.

create or replace function public.time_roster_headcount_many(p_time_ids bigint[])
returns table(time_id bigint, headcount integer)
language sql
stable
security definer
set search_path = public
as $$
  with ids as (
    select distinct unnest(coalesce(p_time_ids, '{}'::bigint[])) as time_id
  ),
  leaders as (
    select t.id as time_id, t.criador_id
    from public.times t
    join ids on ids.time_id = t.id
  ),
  members as (
    select m.time_id, count(distinct m.usuario_id)::int as member_count
    from public.membros_time m
    join ids on ids.time_id = m.time_id
    where m.status in ('ativo', 'aceito', 'aprovado')
    group by m.time_id
  )
  select
    l.time_id,
    greatest(0, coalesce(m.member_count, 0) + case when l.criador_id is null then 0 else 1 end)::int as headcount
  from leaders l
  left join members m on m.time_id = l.time_id
  order by l.time_id;
$$;

grant execute on function public.time_roster_headcount_many(bigint[]) to authenticated, service_role;
