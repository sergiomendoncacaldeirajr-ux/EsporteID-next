-- Sugestão de match: atleta que não é líder pede ao líder da formação adversária avaliar;
-- ao aprovar, cria match Aceito e notifica envolvidos (membros das duas formações).

create table if not exists public.match_sugestoes (
  id bigint generated always as identity primary key,
  sugeridor_id uuid not null references public.profiles (id) on delete cascade,
  sugeridor_time_id bigint not null references public.times (id) on delete cascade,
  alvo_time_id bigint not null references public.times (id) on delete cascade,
  alvo_dono_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete restrict,
  modalidade text not null,
  mensagem text,
  status text not null default 'pendente',
  match_id bigint references public.matches (id) on delete set null,
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  constraint match_sugestoes_modalidade_ck check (modalidade in ('dupla', 'time')),
  constraint match_sugestoes_status_ck check (status in ('pendente', 'aprovado', 'recusado'))
);

create index if not exists idx_match_sugestoes_alvo_dono_pendente
  on public.match_sugestoes (alvo_dono_id)
  where status = 'pendente';

create index if not exists idx_match_sugestoes_sugeridor
  on public.match_sugestoes (sugeridor_id);

create unique index if not exists idx_match_sugestoes_pendente_par
  on public.match_sugestoes (sugeridor_id, alvo_time_id, sugeridor_time_id)
  where status = 'pendente';

alter table public.match_sugestoes enable row level security;

create policy "match_sugestoes_select_participantes"
  on public.match_sugestoes for select
  to authenticated
  using (sugeridor_id = auth.uid() or alvo_dono_id = auth.uid());

-- Inserção/atualização apenas via funções security definer.

create or replace function public.sugerir_match_para_lider (
  p_alvo_time_id bigint,
  p_sugeridor_time_id bigint,
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sid bigint;
  v_alvo record;
  v_sug record;
  v_msg text;
  v_sug_nome text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_alvo_time_id is null or p_alvo_time_id < 1 or p_sugeridor_time_id is null or p_sugeridor_time_id < 1 then
    raise exception 'Parâmetros inválidos';
  end if;

  if p_alvo_time_id = p_sugeridor_time_id then
    raise exception 'Formações inválidas';
  end if;

  select t.id, t.criador_id, t.esporte_id, lower(trim(coalesce(t.tipo, ''))) as tipo, t.nome
  into v_alvo
  from public.times t
  where t.id = p_alvo_time_id;

  if v_alvo.id is null then
    raise exception 'Formação alvo não encontrada';
  end if;

  if v_alvo.tipo not in ('dupla', 'time') then
    raise exception 'Modalidade da formação alvo inválida';
  end if;

  if v_alvo.criador_id = v_uid then
    raise exception 'Líderes enviam pedido de match direto pelo fluxo habitual';
  end if;

  select t.id, t.criador_id, t.esporte_id, lower(trim(coalesce(t.tipo, ''))) as tipo
  into v_sug
  from public.times t
  where t.id = p_sugeridor_time_id;

  if v_sug.id is null then
    raise exception 'Sua formação não encontrada';
  end if;

  if v_sug.criador_id = v_uid then
    raise exception 'Como líder, use o pedido de match normal';
  end if;

  if v_sug.esporte_id is distinct from v_alvo.esporte_id or v_sug.tipo is distinct from v_alvo.tipo then
    raise exception 'Esporte ou tipo de formação não confere com o alvo';
  end if;

  if not exists (
    select 1 from public.membros_time m
    where m.time_id = p_sugeridor_time_id
      and m.usuario_id = v_uid
      and m.status = 'ativo'
  ) then
    raise exception 'Você precisa ser membro ativo da formação indicada';
  end if;

  if exists (
    select 1 from public.match_sugestoes s
    where s.sugeridor_id = v_uid
      and s.alvo_time_id = p_alvo_time_id
      and s.sugeridor_time_id = p_sugeridor_time_id
      and s.status = 'pendente'
  ) then
    raise exception 'Já existe uma sugestão pendente para este confronto';
  end if;

  v_msg := left(trim(coalesce(p_mensagem, '')), 500);
  if v_msg = '' then
    v_msg := null;
  end if;

  insert into public.match_sugestoes (
    sugeridor_id,
    sugeridor_time_id,
    alvo_time_id,
    alvo_dono_id,
    esporte_id,
    modalidade,
    mensagem,
    status
  )
  values (
    v_uid,
    p_sugeridor_time_id,
    p_alvo_time_id,
    v_alvo.criador_id,
    v_alvo.esporte_id,
    v_alvo.tipo,
    v_msg,
    'pendente'
  )
  returning id into v_sid;

  select nome into v_sug_nome from public.profiles where id = v_uid;

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
    v_alvo.criador_id,
    coalesce(
      nullif(trim(v_sug_nome), ''),
      'Um atleta da sua equipe'
    ) || ' sugeriu um match contra ' || coalesce(v_alvo.nome, 'sua formação') || '. Abra Social para aprovar ou recusar.',
    'match',
    v_sid,
    false,
    v_uid,
    now()
  );

  return v_sid;
end;
$$;

revoke all on function public.sugerir_match_para_lider (bigint, bigint, text) from public;
grant execute on function public.sugerir_match_para_lider (bigint, bigint, text) to authenticated;

create or replace function public.responder_sugestao_match (p_sugestao_id bigint, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_mid bigint;
  v_challenger uuid;
  nome_sug text;
  nome_alvo text;
  nome_sug_time text;
  v_body text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select *
  into r
  from public.match_sugestoes
  where id = p_sugestao_id;

  if r.id is null then
    raise exception 'Sugestão não encontrada';
  end if;

  if r.alvo_dono_id is distinct from v_uid then
    raise exception 'Sem permissão para responder esta sugestão';
  end if;

  if r.status is distinct from 'pendente' then
    raise exception 'Esta sugestão já foi respondida';
  end if;

  select nome into nome_sug from public.profiles where id = r.sugeridor_id;
  select nome into nome_alvo from public.times where id = r.alvo_time_id;
  select nome into nome_sug_time from public.times where id = r.sugeridor_time_id;

  if not p_aceitar then
    update public.match_sugestoes
    set status = 'recusado', respondido_em = now()
    where id = p_sugestao_id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values (
      r.sugeridor_id,
      'O líder recusou sua sugestão de match' || coalesce(' contra ' || nullif(trim(nome_alvo), ''), '') || '.',
      'match',
      p_sugestao_id,
      false,
      v_uid,
      now()
    );
    return;
  end if;

  select criador_id into v_challenger from public.times where id = r.sugeridor_time_id;
  if v_challenger is null then
    raise exception 'Formação do sugeridor inválida';
  end if;

  insert into public.matches (
    usuario_id,
    adversario_id,
    esporte_id,
    tipo,
    modalidade_confronto,
    status,
    data_registro,
    data_solicitacao,
    data_confirmacao,
    adversario_time_id
  )
  values (
    v_challenger,
    r.alvo_dono_id,
    r.esporte_id,
    r.modalidade,
    r.modalidade,
    'Aceito',
    now(),
    now(),
    now(),
    r.alvo_time_id
  )
  returning id into v_mid;

  update public.match_sugestoes
  set status = 'aprovado', respondido_em = now(), match_id = v_mid
  where id = p_sugestao_id;

  v_body := 'Match confirmado: '
    || coalesce(nullif(trim(nome_sug_time), ''), 'Formação')
    || ' × '
    || coalesce(nullif(trim(nome_alvo), ''), 'Formação')
    || '. Combine detalhes com o líder e registre na agenda quando jogarem.';

  insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
  select distinct u.uid, v_body, 'match', v_mid, false, v_uid, now()
  from (
    select r.sugeridor_id as uid
    union
    select v_challenger
    union
    select r.alvo_dono_id
    union
    select m.usuario_id from public.membros_time m
    where m.status = 'ativo'
      and m.time_id in (r.alvo_time_id, r.sugeridor_time_id)
  ) u
  where u.uid is not null;
end;
$$;

revoke all on function public.responder_sugestao_match (bigint, boolean) from public;
grant execute on function public.responder_sugestao_match (bigint, boolean) to authenticated;
