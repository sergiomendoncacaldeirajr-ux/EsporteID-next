-- ============================================================
-- Sorteio de Ranking Mensal
-- Tabelas: sorteio_rank_edicoes, sorteio_rank_confrontos
-- Coluna:  profiles.sorteio_rank_ativo
-- ============================================================

-- 1. Participação no perfil -----------------------------------
alter table public.profiles
  add column if not exists sorteio_rank_ativo boolean not null default true;

comment on column public.profiles.sorteio_rank_ativo is
  'Usuário deseja participar do sorteio de ranking mensal. '
  'true = ativo (padrão), false = optou por não participar no próximo ciclo.';

-- 2. Edições do sorteio (uma por esporte + modalidade + mês) --
create table if not exists public.sorteio_rank_edicoes (
  id            bigint generated always as identity primary key,
  esporte_id    bigint not null references public.esportes(id) on delete restrict,
  modalidade    text   not null
                check (modalidade in ('individual', 'dupla', 'time')),
  mes_ref       date   not null,   -- primeiro dia do mês de referência (ex: 2026-06-01)
  status        text   not null default 'simulacao'
                check (status in ('simulacao', 'pendente_aprovacao', 'publicado', 'cancelado')),
  modo_genero   text   not null default 'mesmo_genero'
                check (modo_genero in ('mesmo_genero', 'misto')),
  algoritmo_log jsonb,             -- log/debug da execução do algoritmo
  criado_por    uuid   references public.profiles(id) on delete set null,
  publicado_por uuid   references public.profiles(id) on delete set null,
  criado_em     timestamptz not null default now(),
  publicado_em  timestamptz,
  -- não duplicar edição para mesmo esporte+modalidade+mês+modo_genero
  unique (esporte_id, modalidade, mes_ref, modo_genero)
);

comment on table public.sorteio_rank_edicoes is
  'Cada linha representa um ciclo de sorteio (esporte × modalidade × mês). '
  'status=simulacao → preview sem notificar; '
  'pendente_aprovacao → admin revisou, aguarda publicação; '
  'publicado → ativo para os usuários.';

-- 3. Confrontos sorteados ------------------------------------
create table if not exists public.sorteio_rank_confrontos (
  id               bigint generated always as identity primary key,
  edicao_id        bigint not null references public.sorteio_rank_edicoes(id) on delete cascade,

  -- Lado 1 (um dos dois é não-nulo conforme modalidade)
  lado1_usuario_id uuid   references public.profiles(id) on delete set null,
  lado1_time_id    bigint references public.times(id) on delete set null,

  -- Lado 2
  lado2_usuario_id uuid   references public.profiles(id) on delete set null,
  lado2_time_id    bigint references public.times(id) on delete set null,

  -- Partida resultante (preenchida após o confronto ser realizado)
  partida_id       bigint references public.partidas(id) on delete set null,

  -- Prazo: último dia do mês de referência
  data_limite      date not null,

  -- WO tracking: quem tentou agendar
  lado1_tentou_agendar  boolean     not null default false,
  lado2_tentou_agendar  boolean     not null default false,
  lado1_tentou_em       timestamptz,
  lado2_tentou_em       timestamptz,

  -- Status do confronto
  status           text not null default 'pendente'
                   check (status in (
                     'pendente',        -- aguardando agendamento
                     'em_andamento',    -- data acordada, partida agendada
                     'concluido',       -- partida registrada com placar
                     'wo_lado1',        -- wo a favor do lado 1 (lado2 dificultou)
                     'wo_lado2',        -- wo a favor do lado 2 (lado1 dificultou)
                     'wo_duplo',        -- ambos sem agendamento / ambos recusaram
                     'cancelado'        -- admin cancelou
                   )),

  -- Metadados do algoritmo
  modo_genero      text not null default 'mesmo_genero'
                   check (modo_genero in ('mesmo_genero', 'misto')),
  distancia_km     numeric(8, 2),
  delta_rank       numeric(10, 2),  -- diferença de pontos de ranking entre os dois
  delta_eid        numeric(8, 4),   -- diferença de EID entre os dois

  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

comment on table public.sorteio_rank_confrontos is
  'Par sorteado dentro de uma edição. '
  'lado*_usuario_id para individual; lado*_time_id para dupla/time.';

-- 4. Índices -------------------------------------------------
create index if not exists idx_sorteio_rank_edicoes_esporte_mes
  on public.sorteio_rank_edicoes (esporte_id, modalidade, mes_ref);

create index if not exists idx_sorteio_rank_edicoes_status
  on public.sorteio_rank_edicoes (status);

create index if not exists idx_sorteio_rank_confrontos_edicao
  on public.sorteio_rank_confrontos (edicao_id);

create index if not exists idx_sorteio_rank_confrontos_lado1_user
  on public.sorteio_rank_confrontos (lado1_usuario_id)
  where lado1_usuario_id is not null;

create index if not exists idx_sorteio_rank_confrontos_lado2_user
  on public.sorteio_rank_confrontos (lado2_usuario_id)
  where lado2_usuario_id is not null;

create index if not exists idx_sorteio_rank_confrontos_lado1_time
  on public.sorteio_rank_confrontos (lado1_time_id)
  where lado1_time_id is not null;

create index if not exists idx_sorteio_rank_confrontos_lado2_time
  on public.sorteio_rank_confrontos (lado2_time_id)
  where lado2_time_id is not null;

create index if not exists idx_sorteio_rank_confrontos_status
  on public.sorteio_rank_confrontos (status)
  where status = 'pendente';

-- 5. Trigger atualizado_em -----------------------------------
create or replace function public.sorteio_rank_confrontos_set_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_sorteio_rank_confrontos_atualizado_em
  on public.sorteio_rank_confrontos;

create trigger trg_sorteio_rank_confrontos_atualizado_em
  before update on public.sorteio_rank_confrontos
  for each row execute function public.sorteio_rank_confrontos_set_atualizado_em();

-- 6. RLS -----------------------------------------------------
alter table public.sorteio_rank_edicoes    enable row level security;
alter table public.sorteio_rank_confrontos enable row level security;

-- Edições: autenticados veem somente publicadas
drop policy if exists "sorteio_edicoes_auth_read_publicadas"
  on public.sorteio_rank_edicoes;
create policy "sorteio_edicoes_auth_read_publicadas"
  on public.sorteio_rank_edicoes
  for select to authenticated
  using (status = 'publicado');

-- Confrontos: usuário lê seus próprios (ou de seu time)
drop policy if exists "sorteio_confrontos_user_read"
  on public.sorteio_rank_confrontos;
create policy "sorteio_confrontos_user_read"
  on public.sorteio_rank_confrontos
  for select to authenticated
  using (
    lado1_usuario_id = auth.uid()
    or lado2_usuario_id = auth.uid()
    or exists (
      select 1 from public.times t
      where t.criador_id = auth.uid()
        and (t.id = sorteio_rank_confrontos.lado1_time_id
          or t.id = sorteio_rank_confrontos.lado2_time_id)
    )
    or exists (
      select 1 from public.membros_time mt
      where mt.usuario_id = auth.uid()
        and mt.status in ('ativo', 'aceito', 'aprovado')
        and (mt.time_id = sorteio_rank_confrontos.lado1_time_id
          or mt.time_id = sorteio_rank_confrontos.lado2_time_id)
    )
  );

-- Confrontos: usuário pode marcar que tentou agendar (somente seus campos)
drop policy if exists "sorteio_confrontos_user_tentou_update"
  on public.sorteio_rank_confrontos;
create policy "sorteio_confrontos_user_tentou_update"
  on public.sorteio_rank_confrontos
  for update to authenticated
  using (
    lado1_usuario_id = auth.uid()
    or lado2_usuario_id = auth.uid()
  )
  with check (
    lado1_usuario_id = auth.uid()
    or lado2_usuario_id = auth.uid()
  );

-- Grants (service role opera via bypass)
grant select, update on public.sorteio_rank_confrontos to authenticated;
grant select               on public.sorteio_rank_edicoes    to authenticated;

-- 7. Helper RPC: buscar confrontos ativos do usuário no mês --
create or replace function public.sorteio_rank_confrontos_ativos_usuario(
  p_uid       uuid,
  p_mes_ref   date default date_trunc('month', now())::date
)
returns table (
  confronto_id   bigint,
  edicao_id      bigint,
  esporte_id     bigint,
  modalidade     text,
  mes_ref        date,
  lado           text,   -- 'lado1' | 'lado2'
  oponente_usuario_id uuid,
  oponente_time_id    bigint,
  data_limite    date,
  status         text,
  lado1_tentou_agendar boolean,
  lado2_tentou_agendar boolean
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.edicao_id,
    e.esporte_id,
    e.modalidade,
    e.mes_ref,
    case when c.lado1_usuario_id = p_uid then 'lado1' else 'lado2' end,
    case when c.lado1_usuario_id = p_uid then c.lado2_usuario_id else c.lado1_usuario_id end,
    case when c.lado1_usuario_id = p_uid then c.lado2_time_id    else c.lado1_time_id    end,
    c.data_limite,
    c.status,
    c.lado1_tentou_agendar,
    c.lado2_tentou_agendar
  from public.sorteio_rank_confrontos c
  join public.sorteio_rank_edicoes    e on e.id = c.edicao_id
  where e.status  = 'publicado'
    and e.mes_ref = p_mes_ref
    and c.status  not in ('cancelado')
    and (c.lado1_usuario_id = p_uid or c.lado2_usuario_id = p_uid)
  order by c.id;
$$;

revoke all on function public.sorteio_rank_confrontos_ativos_usuario(uuid, date) from public;
grant execute on function public.sorteio_rank_confrontos_ativos_usuario(uuid, date)
  to authenticated, service_role;
