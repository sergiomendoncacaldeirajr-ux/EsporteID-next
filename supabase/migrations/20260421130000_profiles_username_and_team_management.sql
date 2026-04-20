-- Perfis, handles (@username) e gestão de equipes/convites.

alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists estilo_jogo text,
  add column if not exists disponibilidade_semana_json jsonb,
  add column if not exists visibilidade_match text not null default 'ambos';

alter table public.times
  add column if not exists username text,
  add column if not exists bio text;

alter table public.duplas
  add column if not exists username text,
  add column if not exists bio text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_visibilidade_match_ck'
  ) then
    alter table public.profiles
      add constraint profiles_visibilidade_match_ck
      check (visibilidade_match in ('apenas_amistosos', 'participar_ranking', 'ambos'));
  end if;
end $$;

create or replace function public.normalize_username(v text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(trim(coalesce(v, ''))), '[^a-z0-9_]', '', 'g'), '');
$$;

create or replace function public.validate_username(v text)
returns boolean
language sql
immutable
as $$
  select case
    when v is null then true
    when length(v) between 3 and 24 and v ~ '^[a-z0-9_]+$' then true
    else false
  end;
$$;

create or replace function public.set_username_defaults()
returns trigger
language plpgsql
as $$
begin
  new.username := public.normalize_username(new.username);
  if not public.validate_username(new.username) then
    raise exception 'Username inválido. Use 3-24 chars [a-z0-9_].';
  end if;
  return new;
end;
$$;

drop trigger if exists tr_profiles_username_norm on public.profiles;
create trigger tr_profiles_username_norm
before insert or update of username on public.profiles
for each row execute function public.set_username_defaults();

drop trigger if exists tr_times_username_norm on public.times;
create trigger tr_times_username_norm
before insert or update of username on public.times
for each row execute function public.set_username_defaults();

drop trigger if exists tr_duplas_username_norm on public.duplas;
create trigger tr_duplas_username_norm
before insert or update of username on public.duplas
for each row execute function public.set_username_defaults();

create unique index if not exists idx_profiles_username_unique
  on public.profiles (username)
  where username is not null;

create unique index if not exists idx_times_username_unique
  on public.times (username)
  where username is not null;

create unique index if not exists idx_duplas_username_unique
  on public.duplas (username)
  where username is not null;

create table if not exists public.time_convites (
  id bigint generated always as identity primary key,
  time_id bigint not null references public.times (id) on delete cascade,
  convidado_usuario_id uuid not null references public.profiles (id) on delete cascade,
  convidado_por_usuario_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  unique (time_id, convidado_usuario_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'time_convites_status_ck'
  ) then
    alter table public.time_convites
      add constraint time_convites_status_ck
      check (status in ('pendente', 'aceito', 'recusado', 'cancelado'));
  end if;
end $$;

alter table public.time_convites enable row level security;

drop policy if exists "time_convites_owner_or_invited" on public.time_convites;
create policy "time_convites_owner_or_invited"
  on public.time_convites
  for all to authenticated
  using (
    convidado_usuario_id = auth.uid()
    or convidado_por_usuario_id = auth.uid()
    or exists (
      select 1 from public.times t
      where t.id = time_id
        and t.criador_id = auth.uid()
    )
  )
  with check (
    convidado_usuario_id = auth.uid()
    or convidado_por_usuario_id = auth.uid()
    or exists (
      select 1 from public.times t
      where t.id = time_id
        and t.criador_id = auth.uid()
    )
  );

create or replace function public.sair_da_equipe(p_time_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_leader uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select criador_id into v_leader
  from public.times
  where id = p_time_id;

  if v_leader is null then
    raise exception 'Equipe não encontrada';
  end if;

  if v_leader = v_uid then
    raise exception 'Líder não pode sair sem transferir liderança';
  end if;

  delete from public.membros_time
  where time_id = p_time_id
    and usuario_id = v_uid;
end;
$$;

revoke all on function public.sair_da_equipe(bigint) from public;
grant execute on function public.sair_da_equipe(bigint) to authenticated;
