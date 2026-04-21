-- Dominio de professores: perfil comercial, esportes, agenda, pagamentos,
-- feedback mensal e metricas docentes.

create table if not exists public.professor_perfil (
  usuario_id uuid primary key references public.profiles (id) on delete cascade,
  slug_publico text unique,
  headline text,
  bio_profissional text,
  tipo_atuacao text[] not null default array['aulas']::text[],
  objetivo_padrao text not null default 'somente_exposicao',
  certificacoes_json jsonb not null default '[]'::jsonb,
  publico_alvo_json jsonb not null default '[]'::jsonb,
  formato_aula_json jsonb not null default '[]'::jsonb,
  politica_cancelamento_json jsonb not null default '{}'::jsonb,
  notificacoes_json jsonb not null default '{}'::jsonb,
  aceita_novos_alunos boolean not null default true,
  perfil_publicado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_perfil_objetivo_ck
    check (objetivo_padrao in ('gerir_alunos', 'somente_exposicao', 'ambos')),
  constraint professor_perfil_tipo_atuacao_ck
    check (coalesce(array_length(tipo_atuacao, 1), 0) >= 1
      and tipo_atuacao <@ array['aulas', 'treinamento', 'consultoria']::text[])
);

create table if not exists public.professor_esportes (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  modo_atuacao text not null default 'professor',
  objetivo_plataforma text not null default 'somente_exposicao',
  tipo_atuacao text[] not null default array['aulas']::text[],
  especialidades_json jsonb not null default '[]'::jsonb,
  nivel_alunos_json jsonb not null default '[]'::jsonb,
  tempo_experiencia text,
  valor_base_centavos integer not null default 0,
  moeda text not null default 'BRL',
  elegivel_match boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_esportes_unique unique (professor_id, esporte_id),
  constraint professor_esportes_modo_ck
    check (modo_atuacao in ('professor', 'professor_e_atleta')),
  constraint professor_esportes_objetivo_ck
    check (objetivo_plataforma in ('gerir_alunos', 'somente_exposicao', 'ambos')),
  constraint professor_esportes_tipo_atuacao_ck
    check (coalesce(array_length(tipo_atuacao, 1), 0) >= 1
      and tipo_atuacao <@ array['aulas', 'treinamento', 'consultoria']::text[]),
  constraint professor_esportes_valor_ck
    check (valor_base_centavos >= 0),
  constraint professor_esportes_moeda_ck
    check (char_length(moeda) = 3)
);

create table if not exists public.professor_locais (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  espaco_id bigint not null references public.espacos_genericos (id) on delete cascade,
  tipo_vinculo text not null default 'preferencial',
  usa_horarios_do_espaco boolean not null default false,
  status_vinculo text not null default 'ativo',
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_locais_unique unique (professor_id, espaco_id),
  constraint professor_locais_tipo_ck
    check (tipo_vinculo in ('parceiro', 'preferencial', 'proprio')),
  constraint professor_locais_status_ck
    check (status_vinculo in ('ativo', 'pendente', 'inativo'))
);

create table if not exists public.professor_disponibilidades (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint references public.esportes (id) on delete set null,
  espaco_id bigint references public.espacos_genericos (id) on delete set null,
  dia_semana smallint not null,
  hora_inicio time not null,
  hora_fim time not null,
  capacidade smallint not null default 1,
  recorrente boolean not null default true,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_disponibilidades_dia_ck check (dia_semana between 0 and 6),
  constraint professor_disponibilidades_hora_ck check (hora_inicio < hora_fim),
  constraint professor_disponibilidades_capacidade_ck check (capacidade >= 1)
);

create table if not exists public.professor_aulas (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete restrict,
  espaco_id bigint references public.espacos_genericos (id) on delete set null,
  reserva_quadra_id bigint references public.reservas_quadra (id) on delete set null,
  titulo text,
  descricao text,
  tipo_aula text not null default 'individual',
  status text not null default 'agendada',
  origem_agendamento text not null default 'professor',
  capacidade integer not null default 1,
  valor_total_centavos integer not null default 0,
  moeda text not null default 'BRL',
  inicio timestamptz not null,
  fim timestamptz not null,
  cancelado_por uuid references public.profiles (id) on delete set null,
  motivo_cancelamento text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_aulas_tipo_ck
    check (tipo_aula in ('individual', 'grupo', 'avaliacao', 'treino')),
  constraint professor_aulas_status_ck
    check (status in ('rascunho', 'agendada', 'confirmada', 'concluida', 'cancelada', 'reagendada')),
  constraint professor_aulas_origem_ck
    check (origem_agendamento in ('professor', 'aluno', 'automatico', 'espaco')),
  constraint professor_aulas_capacidade_ck check (capacidade >= 1),
  constraint professor_aulas_valor_ck check (valor_total_centavos >= 0),
  constraint professor_aulas_horario_ck check (inicio < fim),
  constraint professor_aulas_moeda_ck check (char_length(moeda) = 3)
);

create table if not exists public.professor_aula_alunos (
  id bigint generated always as identity primary key,
  aula_id bigint not null references public.professor_aulas (id) on delete cascade,
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  status_inscricao text not null default 'confirmada',
  status_pagamento text not null default 'pendente',
  valor_centavos integer not null default 0,
  presenca_confirmada boolean not null default false,
  concluido_em timestamptz,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_aula_alunos_unique unique (aula_id, aluno_id),
  constraint professor_aula_alunos_status_ck
    check (status_inscricao in ('pendente', 'confirmada', 'cancelada', 'concluida', 'faltou')),
  constraint professor_aula_alunos_pagamento_ck
    check (status_pagamento in ('pendente', 'processando', 'pago', 'falhou', 'estornado', 'isento')),
  constraint professor_aula_alunos_valor_ck check (valor_centavos >= 0)
);

create table if not exists public.professor_pagamentos (
  id bigint generated always as identity primary key,
  aula_id bigint not null references public.professor_aulas (id) on delete cascade,
  aula_aluno_id bigint references public.professor_aula_alunos (id) on delete set null,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  aluno_id uuid references public.profiles (id) on delete set null,
  asaas_payment_id text unique,
  asaas_customer_id text,
  asaas_charge_url text,
  billing_type text,
  status text not null default 'pending',
  valor_bruto_centavos integer not null default 0,
  taxa_gateway_centavos integer not null default 0,
  comissao_plataforma_centavos integer not null default 0,
  valor_liquido_professor_centavos integer not null default 0,
  payload_resumo_json jsonb not null default '{}'::jsonb,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_pagamentos_status_ck
    check (status in ('pending', 'processing', 'approved', 'received', 'overdue', 'refunded', 'failed', 'cancelled')),
  constraint professor_pagamentos_valores_ck
    check (
      valor_bruto_centavos >= 0
      and taxa_gateway_centavos >= 0
      and comissao_plataforma_centavos >= 0
      and valor_liquido_professor_centavos >= 0
    )
);

create table if not exists public.professor_feedback_ciclos (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  competencia_ano smallint not null,
  competencia_mes smallint not null,
  status text not null default 'aberto',
  aulas_pagas_periodo integer not null default 0,
  aberto_em timestamptz not null default now(),
  fechado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_feedback_ciclos_unique
    unique (professor_id, aluno_id, esporte_id, competencia_ano, competencia_mes),
  constraint professor_feedback_ciclos_status_ck
    check (status in ('aberto', 'respondido', 'expirado', 'dispensado')),
  constraint professor_feedback_ciclos_mes_ck
    check (competencia_mes between 1 and 12),
  constraint professor_feedback_ciclos_aulas_ck
    check (aulas_pagas_periodo >= 0)
);

create table if not exists public.professor_feedback_respostas (
  id bigint generated always as identity primary key,
  ciclo_id bigint not null unique references public.professor_feedback_ciclos (id) on delete cascade,
  aula_id bigint references public.professor_aulas (id) on delete set null,
  nota_geral smallint not null,
  nps smallint,
  quiz_json jsonb not null default '{}'::jsonb,
  comentario text,
  aula_realizada boolean not null default true,
  respondido_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_feedback_respostas_nota_ck check (nota_geral between 1 and 5),
  constraint professor_feedback_respostas_nps_ck check (nps is null or nps between 0 and 10)
);

create table if not exists public.professor_metricas (
  professor_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  nota_docente numeric(6, 2) not null default 0,
  total_avaliacoes_validas integer not null default 0,
  taxa_presenca numeric(8, 4) not null default 0,
  taxa_cancelamento numeric(8, 4) not null default 0,
  media_periodo numeric(6, 2) not null default 0,
  ultimo_calculo_em timestamptz,
  atualizado_em timestamptz not null default now(),
  primary key (professor_id, esporte_id)
);

create index if not exists idx_professor_esportes_professor
  on public.professor_esportes (professor_id, ativo);
create index if not exists idx_professor_esportes_esporte
  on public.professor_esportes (esporte_id, ativo);
create index if not exists idx_professor_locais_professor
  on public.professor_locais (professor_id, status_vinculo);
create index if not exists idx_professor_disponibilidades_professor
  on public.professor_disponibilidades (professor_id, dia_semana, ativo);
create index if not exists idx_professor_aulas_professor_inicio
  on public.professor_aulas (professor_id, inicio desc);
create index if not exists idx_professor_aulas_status_inicio
  on public.professor_aulas (status, inicio asc);
create index if not exists idx_professor_aula_alunos_aluno
  on public.professor_aula_alunos (aluno_id, status_pagamento);
create index if not exists idx_professor_pagamentos_professor
  on public.professor_pagamentos (professor_id, status, criado_em desc);
create index if not exists idx_professor_feedback_ciclos_professor
  on public.professor_feedback_ciclos (professor_id, competencia_ano desc, competencia_mes desc);
create index if not exists idx_professor_metricas_nota
  on public.professor_metricas (esporte_id, nota_docente desc);

create or replace function public.professor_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists tr_professor_perfil_touch_updated_at on public.professor_perfil;
create trigger tr_professor_perfil_touch_updated_at
before update on public.professor_perfil
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_esportes_touch_updated_at on public.professor_esportes;
create trigger tr_professor_esportes_touch_updated_at
before update on public.professor_esportes
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_locais_touch_updated_at on public.professor_locais;
create trigger tr_professor_locais_touch_updated_at
before update on public.professor_locais
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_disponibilidades_touch_updated_at on public.professor_disponibilidades;
create trigger tr_professor_disponibilidades_touch_updated_at
before update on public.professor_disponibilidades
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_aulas_touch_updated_at on public.professor_aulas;
create trigger tr_professor_aulas_touch_updated_at
before update on public.professor_aulas
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_aula_alunos_touch_updated_at on public.professor_aula_alunos;
create trigger tr_professor_aula_alunos_touch_updated_at
before update on public.professor_aula_alunos
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_pagamentos_touch_updated_at on public.professor_pagamentos;
create trigger tr_professor_pagamentos_touch_updated_at
before update on public.professor_pagamentos
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_feedback_ciclos_touch_updated_at on public.professor_feedback_ciclos;
create trigger tr_professor_feedback_ciclos_touch_updated_at
before update on public.professor_feedback_ciclos
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_feedback_respostas_touch_updated_at on public.professor_feedback_respostas;
create trigger tr_professor_feedback_respostas_touch_updated_at
before update on public.professor_feedback_respostas
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_metricas_touch_updated_at on public.professor_metricas;
create trigger tr_professor_metricas_touch_updated_at
before update on public.professor_metricas
for each row
execute function public.professor_touch_updated_at();

create or replace function public.professor_criar_notificacao(
  p_usuario_id uuid,
  p_mensagem text,
  p_tipo text,
  p_referencia_id bigint default null,
  p_remetente_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_usuario_id is null or coalesce(trim(p_mensagem), '') = '' then
    return;
  end if;

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  values (
    p_usuario_id,
    left(trim(p_mensagem), 500),
    p_tipo,
    p_referencia_id,
    false,
    p_remetente_id,
    now()
  );
end;
$$;

create or replace function public.professor_agendar_aula(
  p_esporte_id bigint,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_tipo_aula text default 'individual',
  p_capacidade integer default 1,
  p_espaco_id bigint default null,
  p_valor_total_centavos integer default 0,
  p_titulo text default null,
  p_descricao text default null,
  p_origem_agendamento text default 'professor'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aula_id bigint;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_esporte_id is null or p_inicio is null or p_fim is null or p_inicio >= p_fim then
    raise exception 'Parâmetros inválidos';
  end if;

  if not exists (
    select 1
    from public.professor_esportes pe
    where pe.professor_id = v_uid
      and pe.esporte_id = p_esporte_id
      and pe.ativo = true
  ) then
    raise exception 'Você não está habilitado como professor neste esporte';
  end if;

  insert into public.professor_aulas (
    professor_id,
    esporte_id,
    espaco_id,
    titulo,
    descricao,
    tipo_aula,
    capacidade,
    valor_total_centavos,
    origem_agendamento,
    inicio,
    fim
  )
  values (
    v_uid,
    p_esporte_id,
    p_espaco_id,
    nullif(trim(coalesce(p_titulo, '')), ''),
    nullif(trim(coalesce(p_descricao, '')), ''),
    case
      when p_tipo_aula in ('individual', 'grupo', 'avaliacao', 'treino')
      then p_tipo_aula
      else 'individual'
    end,
    greatest(1, coalesce(p_capacidade, 1)),
    greatest(0, coalesce(p_valor_total_centavos, 0)),
    case
      when p_origem_agendamento in ('professor', 'aluno', 'automatico', 'espaco')
      then p_origem_agendamento
      else 'professor'
    end,
    p_inicio,
    p_fim
  )
  returning id into v_aula_id;

  perform public.professor_criar_notificacao(
    v_uid,
    'Aula agendada para ' || to_char(p_inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '.',
    'professor_aula',
    v_aula_id,
    v_uid
  );

  return v_aula_id;
end;
$$;

create or replace function public.professor_cancelar_aula(
  p_aula_id bigint,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aula record;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select id, professor_id, titulo, inicio
  into v_aula
  from public.professor_aulas
  where id = p_aula_id;

  if v_aula.id is null then
    raise exception 'Aula não encontrada';
  end if;

  if v_aula.professor_id is distinct from v_uid then
    raise exception 'Sem permissão para cancelar esta aula';
  end if;

  update public.professor_aulas
  set
    status = 'cancelada',
    cancelado_por = v_uid,
    motivo_cancelamento = nullif(trim(coalesce(p_motivo, '')), ''),
    atualizado_em = now()
  where id = p_aula_id;

  update public.professor_aula_alunos
  set
    status_inscricao = 'cancelada',
    atualizado_em = now()
  where aula_id = p_aula_id
    and status_inscricao <> 'cancelada';

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  select
    paa.aluno_id,
    'A aula ' || coalesce(nullif(trim(v_aula.titulo), ''), '#' || p_aula_id::text)
      || ' de '
      || to_char(v_aula.inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')
      || ' foi cancelada.'
      || coalesce(' Motivo: ' || nullif(trim(p_motivo), ''), ''),
    'professor_cancelamento',
    p_aula_id,
    false,
    v_uid,
    now()
  from public.professor_aula_alunos paa
  where paa.aula_id = p_aula_id;
end;
$$;

create or replace function public.professor_reagendar_aula(
  p_aula_id bigint,
  p_novo_inicio timestamptz,
  p_novo_fim timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aula record;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_novo_inicio is null or p_novo_fim is null or p_novo_inicio >= p_novo_fim then
    raise exception 'Novo horário inválido';
  end if;

  select id, professor_id, titulo
  into v_aula
  from public.professor_aulas
  where id = p_aula_id;

  if v_aula.id is null then
    raise exception 'Aula não encontrada';
  end if;

  if v_aula.professor_id is distinct from v_uid then
    raise exception 'Sem permissão para reagendar esta aula';
  end if;

  update public.professor_aulas
  set
    inicio = p_novo_inicio,
    fim = p_novo_fim,
    status = 'reagendada',
    atualizado_em = now()
  where id = p_aula_id;

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  select
    paa.aluno_id,
    'A aula ' || coalesce(nullif(trim(v_aula.titulo), ''), '#' || p_aula_id::text)
      || ' foi reagendada para '
      || to_char(p_novo_inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '.',
    'professor_reagendamento',
    p_aula_id,
    false,
    v_uid,
    now()
  from public.professor_aula_alunos paa
  where paa.aula_id = p_aula_id;
end;
$$;

create or replace function public.professor_marcar_feedback_respondido()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.professor_feedback_ciclos
  set
    status = 'respondido',
    fechado_em = coalesce(new.respondido_em, now()),
    atualizado_em = now()
  where id = new.ciclo_id;

  return new;
end;
$$;

drop trigger if exists tr_professor_feedback_respondido on public.professor_feedback_respostas;
create trigger tr_professor_feedback_respondido
after insert on public.professor_feedback_respostas
for each row
execute function public.professor_marcar_feedback_respondido();

create or replace function public.professor_abrir_feedbacks_mensal(
  p_ano smallint default null,
  p_mes smallint default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alvo date := date_trunc('month', coalesce(make_date(p_ano, p_mes, 1), now() - interval '1 month'))::date;
  v_inserted integer := 0;
begin
  with base as (
    select
      pa.professor_id,
      paa.aluno_id,
      pa.esporte_id,
      extract(year from pa.inicio)::smallint as ano_ref,
      extract(month from pa.inicio)::smallint as mes_ref,
      count(*)::int as aulas_pagas
    from public.professor_aulas pa
    join public.professor_aula_alunos paa on paa.aula_id = pa.id
    where pa.status = 'concluida'
      and paa.status_pagamento = 'pago'
      and date_trunc('month', pa.inicio) = date_trunc('month', v_alvo)
    group by 1, 2, 3, 4, 5
  ), inserted as (
    insert into public.professor_feedback_ciclos (
      professor_id,
      aluno_id,
      esporte_id,
      competencia_ano,
      competencia_mes,
      aulas_pagas_periodo,
      status,
      aberto_em
    )
    select
      b.professor_id,
      b.aluno_id,
      b.esporte_id,
      b.ano_ref,
      b.mes_ref,
      b.aulas_pagas,
      'aberto',
      now()
    from base b
    on conflict (professor_id, aluno_id, esporte_id, competencia_ano, competencia_mes) do update
      set aulas_pagas_periodo = excluded.aulas_pagas_periodo,
          atualizado_em = now()
    returning id, professor_id, aluno_id
  )
  select count(*) into v_inserted from inserted;

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  select
    i.aluno_id,
    'Seu feedback mensal do professor já está disponível.',
    'professor_feedback',
    i.id,
    false,
    i.professor_id,
    now()
  from inserted i
  on conflict do nothing;

  return coalesce(v_inserted, 0);
end;
$$;

create or replace function public.professor_consolidar_metricas(
  p_professor_id uuid default null,
  p_esporte_id bigint default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  with feedbacks as (
    select
      c.professor_id,
      c.esporte_id,
      avg(r.nota_geral)::numeric(6, 2) as nota_docente,
      count(*)::int as total_avaliacoes_validas
    from public.professor_feedback_ciclos c
    join public.professor_feedback_respostas r on r.ciclo_id = c.id
    where (p_professor_id is null or c.professor_id = p_professor_id)
      and (p_esporte_id is null or c.esporte_id = p_esporte_id)
      and r.aula_realizada = true
    group by 1, 2
  ), presencas as (
    select
      pa.professor_id,
      pa.esporte_id,
      coalesce(avg(case when paa.presenca_confirmada then 1 else 0 end)::numeric, 0)::numeric(8, 4) as taxa_presenca,
      coalesce(avg(case when pa.status = 'cancelada' then 1 else 0 end)::numeric, 0)::numeric(8, 4) as taxa_cancelamento
    from public.professor_aulas pa
    left join public.professor_aula_alunos paa on paa.aula_id = pa.id
    where (p_professor_id is null or pa.professor_id = p_professor_id)
      and (p_esporte_id is null or pa.esporte_id = p_esporte_id)
    group by 1, 2
  ), final_rows as (
    select
      coalesce(f.professor_id, p.professor_id) as professor_id,
      coalesce(f.esporte_id, p.esporte_id) as esporte_id,
      coalesce(f.nota_docente, 0)::numeric(6, 2) as nota_docente,
      coalesce(f.total_avaliacoes_validas, 0) as total_avaliacoes_validas,
      coalesce(p.taxa_presenca, 0)::numeric(8, 4) as taxa_presenca,
      coalesce(p.taxa_cancelamento, 0)::numeric(8, 4) as taxa_cancelamento
    from feedbacks f
    full outer join presencas p
      on p.professor_id = f.professor_id
     and p.esporte_id = f.esporte_id
  ), upserted as (
    insert into public.professor_metricas (
      professor_id,
      esporte_id,
      nota_docente,
      total_avaliacoes_validas,
      taxa_presenca,
      taxa_cancelamento,
      media_periodo,
      ultimo_calculo_em,
      atualizado_em
    )
    select
      professor_id,
      esporte_id,
      nota_docente,
      total_avaliacoes_validas,
      taxa_presenca,
      taxa_cancelamento,
      nota_docente,
      now(),
      now()
    from final_rows
    on conflict (professor_id, esporte_id) do update
      set nota_docente = excluded.nota_docente,
          total_avaliacoes_validas = excluded.total_avaliacoes_validas,
          taxa_presenca = excluded.taxa_presenca,
          taxa_cancelamento = excluded.taxa_cancelamento,
          media_periodo = excluded.media_periodo,
          ultimo_calculo_em = excluded.ultimo_calculo_em,
          atualizado_em = now()
    returning 1
  )
  select count(*) into v_rows from upserted;

  return coalesce(v_rows, 0);
end;
$$;

alter table public.professor_perfil enable row level security;
alter table public.professor_esportes enable row level security;
alter table public.professor_locais enable row level security;
alter table public.professor_disponibilidades enable row level security;
alter table public.professor_aulas enable row level security;
alter table public.professor_aula_alunos enable row level security;
alter table public.professor_pagamentos enable row level security;
alter table public.professor_feedback_ciclos enable row level security;
alter table public.professor_feedback_respostas enable row level security;
alter table public.professor_metricas enable row level security;

drop policy if exists "professor_perfil_select_public_or_owner" on public.professor_perfil;
create policy "professor_perfil_select_public_or_owner"
  on public.professor_perfil for select to authenticated
  using (usuario_id = auth.uid() or perfil_publicado = true);

drop policy if exists "professor_perfil_owner_all" on public.professor_perfil;
create policy "professor_perfil_owner_all"
  on public.professor_perfil for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists "professor_esportes_select_public_or_owner" on public.professor_esportes;
create policy "professor_esportes_select_public_or_owner"
  on public.professor_esportes for select to authenticated
  using (
    professor_id = auth.uid()
    or exists (
      select 1
      from public.professor_perfil pp
      where pp.usuario_id = professor_esportes.professor_id
        and pp.perfil_publicado = true
    )
  );

drop policy if exists "professor_esportes_owner_all" on public.professor_esportes;
create policy "professor_esportes_owner_all"
  on public.professor_esportes for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_locais_select_public_or_owner" on public.professor_locais;
create policy "professor_locais_select_public_or_owner"
  on public.professor_locais for select to authenticated
  using (
    professor_id = auth.uid()
    or status_vinculo = 'ativo'
  );

drop policy if exists "professor_locais_owner_all" on public.professor_locais;
create policy "professor_locais_owner_all"
  on public.professor_locais for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_disponibilidades_select_public_or_owner" on public.professor_disponibilidades;
create policy "professor_disponibilidades_select_public_or_owner"
  on public.professor_disponibilidades for select to authenticated
  using (
    professor_id = auth.uid()
    or exists (
      select 1
      from public.professor_perfil pp
      where pp.usuario_id = professor_disponibilidades.professor_id
        and pp.perfil_publicado = true
    )
  );

drop policy if exists "professor_disponibilidades_owner_all" on public.professor_disponibilidades;
create policy "professor_disponibilidades_owner_all"
  on public.professor_disponibilidades for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_aulas_participantes_select" on public.professor_aulas;
create policy "professor_aulas_participantes_select"
  on public.professor_aulas for select to authenticated
  using (
    professor_id = auth.uid()
    or exists (
      select 1
      from public.professor_aula_alunos paa
      where paa.aula_id = professor_aulas.id
        and paa.aluno_id = auth.uid()
    )
  );

drop policy if exists "professor_aulas_owner_all" on public.professor_aulas;
create policy "professor_aulas_owner_all"
  on public.professor_aulas for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_aula_alunos_participantes" on public.professor_aula_alunos;
create policy "professor_aula_alunos_participantes"
  on public.professor_aula_alunos for select to authenticated
  using (
    aluno_id = auth.uid()
    or exists (
      select 1
      from public.professor_aulas pa
      where pa.id = professor_aula_alunos.aula_id
        and pa.professor_id = auth.uid()
    )
  );

drop policy if exists "professor_aula_alunos_owner_insert_update" on public.professor_aula_alunos;
create policy "professor_aula_alunos_owner_insert_update"
  on public.professor_aula_alunos for all to authenticated
  using (
    aluno_id = auth.uid()
    or exists (
      select 1
      from public.professor_aulas pa
      where pa.id = professor_aula_alunos.aula_id
        and pa.professor_id = auth.uid()
    )
  )
  with check (
    aluno_id = auth.uid()
    or exists (
      select 1
      from public.professor_aulas pa
      where pa.id = professor_aula_alunos.aula_id
        and pa.professor_id = auth.uid()
    )
  );

drop policy if exists "professor_pagamentos_participantes" on public.professor_pagamentos;
create policy "professor_pagamentos_participantes"
  on public.professor_pagamentos for select to authenticated
  using (professor_id = auth.uid() or aluno_id = auth.uid());

drop policy if exists "professor_pagamentos_owner_all" on public.professor_pagamentos;
create policy "professor_pagamentos_owner_all"
  on public.professor_pagamentos for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_feedback_ciclos_participantes" on public.professor_feedback_ciclos;
create policy "professor_feedback_ciclos_participantes"
  on public.professor_feedback_ciclos for select to authenticated
  using (professor_id = auth.uid() or aluno_id = auth.uid());

drop policy if exists "professor_feedback_ciclos_owner_all" on public.professor_feedback_ciclos;
create policy "professor_feedback_ciclos_owner_all"
  on public.professor_feedback_ciclos for all to authenticated
  using (professor_id = auth.uid() or aluno_id = auth.uid())
  with check (professor_id = auth.uid() or aluno_id = auth.uid());

drop policy if exists "professor_feedback_respostas_participantes" on public.professor_feedback_respostas;
create policy "professor_feedback_respostas_participantes"
  on public.professor_feedback_respostas for select to authenticated
  using (
    exists (
      select 1
      from public.professor_feedback_ciclos c
      where c.id = professor_feedback_respostas.ciclo_id
        and (c.professor_id = auth.uid() or c.aluno_id = auth.uid())
    )
  );

drop policy if exists "professor_feedback_respostas_participantes_write" on public.professor_feedback_respostas;
create policy "professor_feedback_respostas_participantes_write"
  on public.professor_feedback_respostas for all to authenticated
  using (
    exists (
      select 1
      from public.professor_feedback_ciclos c
      where c.id = professor_feedback_respostas.ciclo_id
        and c.aluno_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.professor_feedback_ciclos c
      where c.id = professor_feedback_respostas.ciclo_id
        and c.aluno_id = auth.uid()
    )
  );

drop policy if exists "professor_metricas_select_public_or_owner" on public.professor_metricas;
create policy "professor_metricas_select_public_or_owner"
  on public.professor_metricas for select to authenticated
  using (
    professor_id = auth.uid()
    or exists (
      select 1
      from public.professor_perfil pp
      where pp.usuario_id = professor_metricas.professor_id
        and pp.perfil_publicado = true
    )
  );

drop policy if exists "professor_metricas_owner_all" on public.professor_metricas;
create policy "professor_metricas_owner_all"
  on public.professor_metricas for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

revoke all on function public.professor_criar_notificacao(uuid, text, text, bigint, uuid) from public;
grant execute on function public.professor_criar_notificacao(uuid, text, text, bigint, uuid) to authenticated;

revoke all on function public.professor_agendar_aula(bigint, timestamptz, timestamptz, text, integer, bigint, integer, text, text, text) from public;
grant execute on function public.professor_agendar_aula(bigint, timestamptz, timestamptz, text, integer, bigint, integer, text, text, text) to authenticated;

revoke all on function public.professor_cancelar_aula(bigint, text) from public;
grant execute on function public.professor_cancelar_aula(bigint, text) to authenticated;

revoke all on function public.professor_reagendar_aula(bigint, timestamptz, timestamptz) from public;
grant execute on function public.professor_reagendar_aula(bigint, timestamptz, timestamptz) to authenticated;

revoke all on function public.professor_abrir_feedbacks_mensal(smallint, smallint) from public;
grant execute on function public.professor_abrir_feedbacks_mensal(smallint, smallint) to authenticated;

revoke all on function public.professor_consolidar_metricas(uuid, bigint) from public;
grant execute on function public.professor_consolidar_metricas(uuid, bigint) to authenticated;
