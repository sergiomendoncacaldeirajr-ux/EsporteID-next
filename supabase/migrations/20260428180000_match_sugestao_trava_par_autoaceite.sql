-- Trava global de sugestão pendente por par de formações (sugeridor_time_id x alvo_time_id).
-- Se já existe pendente, qualquer outro membro da mesma formação deve aguardar resposta.

-- Normaliza pendências duplicadas antigas (mantém a mais recente como pendente).
with ranked as (
  select
    id,
    row_number() over (
      partition by sugeridor_time_id, alvo_time_id
      order by id desc
    ) as rn
  from public.match_sugestoes
  where status = 'pendente'
)
update public.match_sugestoes s
set
  status = 'recusado',
  respondido_em = coalesce(s.respondido_em, now())
from ranked r
where s.id = r.id
  and r.rn > 1;

drop index if exists public.idx_match_sugestoes_pendente_par;

create unique index if not exists idx_match_sugestoes_pendente_par_formacao
  on public.match_sugestoes (sugeridor_time_id, alvo_time_id)
  where status = 'pendente';

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

  -- Trava por par de formações: qualquer membro da mesma formação entra na mesma fila.
  if exists (
    select 1 from public.match_sugestoes s
    where s.alvo_time_id = p_alvo_time_id
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
    ) || ' sugeriu um desafio contra ' || coalesce(v_alvo.nome, 'sua formação') || '. Abra Social para aprovar ou recusar.',
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
