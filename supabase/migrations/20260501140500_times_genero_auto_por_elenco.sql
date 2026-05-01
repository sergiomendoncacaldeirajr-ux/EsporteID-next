-- Gênero de dupla/time calculado automaticamente pelo elenco:
-- masculino (todos masc), feminino (todos fem) ou misto (qualquer combinação/indefinição).

create or replace function public.time_genero_from_participantes(p_time_id bigint)
returns text
language sql
stable
as $$
  with participantes as (
    select lower(trim(coalesce(p.genero, ''))) as genero_norm
    from public.times t
    join public.profiles p on p.id = t.criador_id
    where t.id = p_time_id

    union all

    select lower(trim(coalesce(p.genero, ''))) as genero_norm
    from public.membros_time mt
    join public.profiles p on p.id = mt.usuario_id
    where mt.time_id = p_time_id
      and lower(trim(coalesce(mt.status, ''))) in ('ativo', 'aceito', 'aprovado')
  )
  select case
    when count(*) = 0 then 'misto'
    when bool_and(genero_norm = 'masculino') then 'masculino'
    when bool_and(genero_norm = 'feminino') then 'feminino'
    else 'misto'
  end
  from participantes;
$$;

create or replace function public.recompute_time_genero(p_time_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_genero text;
begin
  if p_time_id is null or p_time_id < 1 then
    return;
  end if;

  v_genero := public.time_genero_from_participantes(p_time_id);

  update public.times t
     set genero = v_genero
   where t.id = p_time_id
     and coalesce(lower(trim(t.genero)), '') is distinct from v_genero;
end;
$$;

create or replace function public.times_set_genero_before_insert_or_owner_update()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.genero := coalesce(
      (
        select case
          when lower(trim(coalesce(p.genero, ''))) = 'masculino' then 'masculino'
          when lower(trim(coalesce(p.genero, ''))) = 'feminino' then 'feminino'
          else 'misto'
        end
        from public.profiles p
        where p.id = new.criador_id
      ),
      'misto'
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.criador_id is distinct from old.criador_id then
    new.genero := coalesce(
      (
        select case
          when lower(trim(coalesce(p.genero, ''))) = 'masculino' then 'masculino'
          when lower(trim(coalesce(p.genero, ''))) = 'feminino' then 'feminino'
          else 'misto'
        end
        from public.profiles p
        where p.id = new.criador_id
      ),
      'misto'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_times_set_genero_before_insert_or_owner_update on public.times;
create trigger trg_times_set_genero_before_insert_or_owner_update
before insert or update of criador_id
on public.times
for each row
execute function public.times_set_genero_before_insert_or_owner_update();

create or replace function public.membros_time_recompute_genero_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_time_genero(old.time_id);
    return old;
  end if;

  perform public.recompute_time_genero(new.time_id);

  if tg_op = 'UPDATE' and new.time_id is distinct from old.time_id then
    perform public.recompute_time_genero(old.time_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_membros_time_recompute_genero_iud on public.membros_time;
create trigger trg_membros_time_recompute_genero_iud
after insert or update of time_id, usuario_id, status
on public.membros_time
for each row
execute function public.membros_time_recompute_genero_trigger();

drop trigger if exists trg_membros_time_recompute_genero_delete on public.membros_time;
create trigger trg_membros_time_recompute_genero_delete
after delete
on public.membros_time
for each row
execute function public.membros_time_recompute_genero_trigger();

create or replace function public.profiles_genero_recompute_times_trigger()
returns trigger
language plpgsql
as $$
declare
  v_time_id bigint;
begin
  if coalesce(lower(trim(new.genero)), '') is not distinct from coalesce(lower(trim(old.genero)), '') then
    return new;
  end if;

  for v_time_id in
    (
      select t.id
      from public.times t
      where t.criador_id = new.id

      union

      select mt.time_id
      from public.membros_time mt
      where mt.usuario_id = new.id
        and lower(trim(coalesce(mt.status, ''))) in ('ativo', 'aceito', 'aprovado')
    )
  loop
    perform public.recompute_time_genero(v_time_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_profiles_genero_recompute_times on public.profiles;
create trigger trg_profiles_genero_recompute_times
after update of genero
on public.profiles
for each row
execute function public.profiles_genero_recompute_times_trigger();

update public.times t
   set genero = public.time_genero_from_participantes(t.id);
