-- Permite combinar modalidades de match (ex.: individual + dupla + time) por esporte.

alter table public.usuario_eid
  add column if not exists modalidades_match text[];

update public.usuario_eid
set modalidades_match = array[coalesce(nullif(trim(modalidade_match), ''), 'individual')]::text[]
where modalidades_match is null;

alter table public.usuario_eid
  alter column modalidades_match set default array['individual']::text[],
  alter column modalidades_match set not null;

alter table public.usuario_eid
  drop constraint if exists usuario_eid_modalidades_match_ck;

alter table public.usuario_eid
  add constraint usuario_eid_modalidades_match_ck
  check (
    coalesce(array_length(modalidades_match, 1), 0) >= 1
    and modalidades_match <@ array['individual', 'dupla', 'time']::text[]
  );

create or replace function public.usuario_eid_modalidades_legacy_sync()
returns trigger
language plpgsql
as $$
begin
  if new.modalidades_match is not null and coalesce(array_length(new.modalidades_match, 1), 0) >= 1 then
    new.modalidade_match := new.modalidades_match[1];
  elsif new.modalidade_match is not null and (
    tg_op = 'INSERT'
    or (old.modalidade_match is distinct from new.modalidade_match)
  ) then
    new.modalidades_match := array[new.modalidade_match]::text[];
  end if;
  return new;
end;
$$;

drop trigger if exists tr_usuario_eid_modalidades_legacy_sync on public.usuario_eid;
create trigger tr_usuario_eid_modalidades_legacy_sync
before insert or update on public.usuario_eid
for each row
execute function public.usuario_eid_modalidades_legacy_sync();

-- Radar: uma linha por combinação (usuário, esporte, modalidade escolhida).
create or replace function public.buscar_match_atletas(
  p_viewer_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_esporte_id bigint default null,
  p_raio_km integer default 30,
  p_limit integer default 300
)
returns table (
  usuario_id uuid,
  nome text,
  localizacao text,
  esporte_id bigint,
  esporte_nome text,
  dist_km double precision,
  nota_eid numeric,
  pontos_ranking integer,
  modalidade_match text,
  interesse_match text
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      ue.usuario_id,
      coalesce(p.nome, 'Atleta') as nome,
      coalesce(p.localizacao, 'Localização não informada') as localizacao,
      ue.esporte_id,
      coalesce(e.nome, 'Esporte') as esporte_nome,
      public.eid_distance_km(p_lat, p_lng, p.lat, p.lng) as dist_km,
      ue.nota_eid,
      ue.pontos_ranking,
      case
        when ue.modalidades_match is not null and coalesce(array_length(ue.modalidades_match, 1), 0) >= 1
        then ue.modalidades_match
        else array[coalesce(ue.modalidade_match, 'individual')]::text[]
      end as mods,
      coalesce(ue.interesse_match, 'ranking_e_amistoso') as interesse_match,
      row_number() over (
        partition by ue.usuario_id
        order by ue.nota_eid desc nulls last, ue.pontos_ranking desc nulls last, ue.esporte_id asc
      ) as rn
    from public.usuario_eid ue
    join public.profiles p on p.id = ue.usuario_id
    left join public.esportes e on e.id = ue.esporte_id
    where ue.usuario_id <> p_viewer_id
      and (p_esporte_id is null or ue.esporte_id = p_esporte_id)
  ),
  expanded as (
    select
      r.usuario_id,
      r.nome,
      r.localizacao,
      r.esporte_id,
      r.esporte_nome,
      r.dist_km,
      r.nota_eid,
      r.pontos_ranking,
      unnest(r.mods) as modalidade_match,
      r.interesse_match
    from ranked r
    where (p_esporte_id is not null or r.rn = 1)
  )
  select
    e.usuario_id,
    e.nome,
    e.localizacao,
    e.esporte_id,
    e.esporte_nome,
    e.dist_km,
    e.nota_eid,
    e.pontos_ranking,
    e.modalidade_match,
    e.interesse_match
  from expanded e
  where e.dist_km <= greatest(1, p_raio_km)
  order by e.dist_km asc, e.nome asc, e.modalidade_match asc
  limit greatest(1, p_limit);
$$;
