-- Modo teste (sandbox): perfis isolados — só veem entre si em listagens/RLS; admins veem tudo.
-- RPCs security definer filtram explicitamente (RLS não se aplica dentro delas).

alter table public.profiles
  add column if not exists perfil_modo_teste boolean not null default false;

comment on column public.profiles.perfil_modo_teste is
  'Quando true, o atleta fica em sandbox: invisível para quem está fora do modo teste; só interage em listagens com perfis no mesmo modo. Admins de plataforma continuam vendo tudo.';

create index if not exists idx_profiles_perfil_modo_teste
  on public.profiles (perfil_modo_teste)
  where perfil_modo_teste is true;

-- Leitura do flag sem recursão em políticas RLS de profiles.
create or replace function public.profiles_perfil_modo_teste_of(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select pe.perfil_modo_teste from public.profiles pe where pe.id = p_uid),
    false
  );
$$;

create or replace function public.eid_visible_profiles_for_match(p_viewer uuid, p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.profiles_perfil_modo_teste_of(p_viewer) = public.profiles_perfil_modo_teste_of(p_other);
$$;

revoke all on function public.profiles_perfil_modo_teste_of(uuid) from public;
grant execute on function public.profiles_perfil_modo_teste_of(uuid) to authenticated, service_role;

revoke all on function public.eid_visible_profiles_for_match(uuid, uuid) from public;
grant execute on function public.eid_visible_profiles_for_match(uuid, uuid) to authenticated, service_role;

-- Perfis: visibilidade mútua (mesmo modo teste) ou próprio perfil ou admin de plataforma.
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_visibility_sandbox" on public.profiles;

create policy "profiles_select_visibility_sandbox"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or public.eid_visible_profiles_for_match(auth.uid(), id)
  );

-- usuario_eid público no ranking: restringe ao mesmo “modo teste” (admin vê tudo).
drop policy if exists "usuario_eid_select_ranking_public" on public.usuario_eid;

create policy "usuario_eid_select_ranking_public"
  on public.usuario_eid for select
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or public.eid_visible_profiles_for_match(auth.uid(), usuario_id)
  );

-- Times: visível pelo criador (mesma regra de sandbox).
drop policy if exists "times_read" on public.times;

create policy "times_read"
  on public.times for select
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or criador_id is null
    or public.eid_visible_profiles_for_match(auth.uid(), criador_id)
  );

-- Elenco: visível se o time for visível ao viewer.
drop policy if exists "mt_read_roster_public" on public.membros_time;

create policy "mt_read_roster_public"
  on public.membros_time for select
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or exists (
      select 1
      from public.times t
      where t.id = membros_time.time_id
        and (
          t.criador_id is null
          or public.eid_visible_profiles_for_match(auth.uid(), t.criador_id)
        )
    )
  );

-- Duplas cadastrais: sandbox pelo criador do registro.
drop policy if exists "duplas_read_public" on public.duplas;

create policy "duplas_read_public"
  on public.duplas for select
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or criador_id is null
    or public.eid_visible_profiles_for_match(auth.uid(), criador_id)
  );

-- Radar atletas: filtra sandbox (mantém corpo da última versão em 20260430110000).
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
  interesse_match text,
  avatar_url text,
  disponivel_amistoso boolean,
  vitorias integer,
  derrotas integer,
  posicao_rank integer
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
      coalesce(ue.interesse_match, 'ranking_e_amistoso')::text as interesse_match,
      p.avatar_url,
      (
        coalesce(p.disponivel_amistoso, false) is true
        and p.disponivel_amistoso_ate is not null
        and p.disponivel_amistoso_ate > now()
      ) as disponivel_amistoso,
      coalesce(ue.vitorias, 0)::integer as vitorias,
      coalesce(ue.derrotas, 0)::integer as derrotas,
      ue.posicao_rank::integer as posicao_rank,
      row_number() over (
        partition by ue.usuario_id
        order by ue.nota_eid desc nulls last, ue.pontos_ranking desc nulls last, ue.esporte_id asc
      ) as rn
    from public.usuario_eid ue
    join public.profiles p on p.id = ue.usuario_id
    left join public.esportes e on e.id = ue.esporte_id
    where ue.usuario_id <> p_viewer_id
      and (p_esporte_id is null or ue.esporte_id = p_esporte_id)
      and public.eid_visible_profiles_for_match(p_viewer_id, ue.usuario_id)
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
      r.interesse_match,
      r.avatar_url,
      r.disponivel_amistoso,
      r.vitorias,
      r.derrotas,
      r.posicao_rank
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
    e.interesse_match,
    e.avatar_url,
    e.disponivel_amistoso,
    e.vitorias,
    e.derrotas,
    e.posicao_rank
  from expanded e
  where e.dist_km <= greatest(1, p_raio_km)
  order by e.disponivel_amistoso desc, e.dist_km asc, e.nome asc, e.modalidade_match asc
  limit greatest(1, p_limit);
$$;

revoke all on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) to authenticated;

-- Radar formações: sandbox pelo criador do time.
create or replace function public.buscar_match_formacoes(
  p_viewer_id uuid,
  p_tipo text,
  p_lat double precision,
  p_lng double precision,
  p_esporte_id bigint default null,
  p_raio_km integer default 30,
  p_limit integer default 300
)
returns table (
  id bigint,
  nome text,
  localizacao text,
  esporte_id bigint,
  esporte_nome text,
  dist_km double precision,
  eid_time numeric,
  pontos_ranking integer,
  interesse_match text,
  can_challenge boolean,
  disponivel_amistoso boolean,
  vitorias integer,
  derrotas integer
)
language sql
security definer
set search_path = public
as $$
  with kind as (
    select
      case
        when lower(trim(coalesce(p_tipo, ''))) = 'dupla' then 'dupla'
        else 'time'
      end as p_kind
  ),
  mine as (
    select exists (
      select 1
      from public.times mt
      cross join kind k
      where (
        case when lower(trim(coalesce(mt.tipo, ''))) = 'dupla' then 'dupla' else 'time' end
      ) = k.p_kind
        and (p_esporte_id is null or mt.esporte_id = p_esporte_id)
        and (
          mt.criador_id = p_viewer_id
          or exists (
            select 1
            from public.membros_time m
            where m.time_id = mt.id
              and m.usuario_id = p_viewer_id
              and m.status in ('ativo', 'aceito', 'aprovado')
          )
        )
    ) as can_challenge
  )
  select
    t.id,
    coalesce(t.nome, initcap(coalesce(p_tipo, 'time'))) as nome,
    coalesce(t.localizacao, 'Localização não informada') as localizacao,
    t.esporte_id,
    coalesce(e.nome, 'Esporte') as esporte_nome,
    public.eid_distance_km(
      p_lat,
      p_lng,
      coalesce(nullif(t.lat, '')::double precision, cp.lat),
      coalesce(nullif(t.lng, '')::double precision, cp.lng)
    ) as dist_km,
    t.eid_time,
    t.pontos_ranking,
    'ranking'::text as interesse_match,
    m.can_challenge,
    (
      coalesce(t.disponivel_amistoso, false) is true
      and t.disponivel_amistoso_ate is not null
      and t.disponivel_amistoso_ate > now()
    ) as disponivel_amistoso,
    coalesce(t.vitorias, 0)::integer as vitorias,
    coalesce(t.derrotas, 0)::integer as derrotas
  from public.times t
  cross join kind k
  cross join mine m
  left join public.esportes e on e.id = t.esporte_id
  left join public.profiles cp on cp.id = t.criador_id
  where (
    case when lower(trim(coalesce(t.tipo, ''))) = 'dupla' then 'dupla' else 'time' end
  ) = k.p_kind
    and (p_esporte_id is null or t.esporte_id = p_esporte_id)
    and t.criador_id is distinct from p_viewer_id
    and t.criador_id is not null
    and public.eid_visible_profiles_for_match(p_viewer_id, t.criador_id)
    and not exists (
      select 1
      from public.membros_time m
      where m.time_id = t.id
        and m.usuario_id = p_viewer_id
        and m.status in ('ativo', 'aceito', 'aprovado')
    )
    and not exists (
      select 1
      from public.matches mm
      where mm.finalidade = 'ranking'
        and mm.status = 'Pendente'
        and lower(trim(coalesce(mm.modalidade_confronto, mm.tipo, ''))) in ('dupla', 'time')
        and mm.desafiante_time_id is not null
        and mm.adversario_time_id is not null
        and (
          (
            mm.desafiante_time_id = t.id
            and exists (
              select 1
              from public.times tx
              where tx.id = mm.adversario_time_id
                and (
                  tx.criador_id = p_viewer_id
                  or exists (
                    select 1
                    from public.membros_time mv
                    where mv.time_id = tx.id
                      and mv.usuario_id = p_viewer_id
                      and mv.status in ('ativo', 'aceito', 'aprovado')
                  )
                )
            )
          )
          or (
            mm.adversario_time_id = t.id
            and exists (
              select 1
              from public.times tx
              where tx.id = mm.desafiante_time_id
                and (
                  tx.criador_id = p_viewer_id
                  or exists (
                    select 1
                    from public.membros_time mv
                    where mv.time_id = tx.id
                      and mv.usuario_id = p_viewer_id
                      and mv.status in ('ativo', 'aceito', 'aprovado')
                  )
                )
            )
          )
        )
    )
    and public.eid_distance_km(
      p_lat,
      p_lng,
      coalesce(nullif(t.lat, '')::double precision, cp.lat),
      coalesce(nullif(t.lng, '')::double precision, cp.lng)
    ) <= greatest(1, p_raio_km)
  order by
    (
      coalesce(t.disponivel_amistoso, false) is true
      and t.disponivel_amistoso_ate is not null
      and t.disponivel_amistoso_ate > now()
    ) desc,
    dist_km asc,
    t.id desc
  limit greatest(1, p_limit);
$$;

revoke all on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) to authenticated;

-- Partidas 1v1 encerradas: antes qualquer autenticado lia todas (vazamento para sandbox).
drop policy if exists "partidas_read_concluidas_publico" on public.partidas;

create policy "partidas_read_concluidas_publico"
  on public.partidas for select
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or (
      jogador1_id is not null
      and jogador2_id is not null
      and lower(coalesce(status, '')) in (
        'encerrada',
        'finalizada',
        'concluida',
        'concluída',
        'validada'
      )
      and public.eid_visible_profiles_for_match(auth.uid(), jogador1_id)
      and public.eid_visible_profiles_for_match(auth.uid(), jogador2_id)
    )
  );

-- Impede que o próprio usuário ligue/desligue sandbox pelo client (só service role / jobs internos).
create or replace function public.profiles_block_client_perfil_modo_teste_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if coalesce(new.perfil_modo_teste, false) is distinct from coalesce(old.perfil_modo_teste, false) then
    if (select auth.role()) = 'service_role' then
      return new;
    end if;
    raise exception 'perfil_modo_teste só pode ser alterado pelo painel administrativo (service role).';
  end if;
  return new;
end;
$$;

drop trigger if exists tr_profiles_block_client_modo_teste on public.profiles;
create trigger tr_profiles_block_client_modo_teste
  before update of perfil_modo_teste on public.profiles
  for each row
  execute function public.profiles_block_client_perfil_modo_teste_change();
