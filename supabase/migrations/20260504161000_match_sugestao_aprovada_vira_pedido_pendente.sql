-- Correção: aprovar sugestão de membro (dupla/time) NÃO deve autoaceitar confronto.
-- Ao aprovar, o líder apenas envia um pedido oficial (status Pendente) para o líder da outra formação.

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
  v_sugeridor_lider uuid;
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
      'O líder recusou sua sugestão de desafio' || coalesce(' contra ' || nullif(trim(nome_alvo), ''), '') || '.',
      'agenda_status',
      p_sugestao_id,
      false,
      v_uid,
      now()
    );
    return;
  end if;

  -- Líder da formação do membro que sugeriu.
  select criador_id into v_sugeridor_lider from public.times where id = r.sugeridor_time_id;
  if v_sugeridor_lider is null then
    raise exception 'Formação do sugeridor inválida';
  end if;

  -- Aprovação da sugestão => criar pedido oficial PENDENTE para o outro líder responder.
  insert into public.matches (
    usuario_id,
    adversario_id,
    esporte_id,
    tipo,
    modalidade_confronto,
    finalidade,
    status,
    data_registro,
    data_solicitacao,
    data_confirmacao,
    desafiante_time_id,
    adversario_time_id
  )
  values (
    r.alvo_dono_id,
    v_sugeridor_lider,
    r.esporte_id,
    r.modalidade,
    r.modalidade,
    'ranking',
    'Pendente',
    now(),
    now(),
    null,
    r.alvo_time_id,
    r.sugeridor_time_id
  )
  returning id into v_mid;

  update public.match_sugestoes
  set status = 'aprovado', respondido_em = now(), match_id = v_mid
  where id = p_sugestao_id;

  v_body := 'Sugestão aprovada: '
    || coalesce(nullif(trim(nome_sug_time), ''), 'Formação')
    || ' × '
    || coalesce(nullif(trim(nome_alvo), ''), 'Formação')
    || '. Pedido enviado ao líder adversário para aceitar o confronto.';

  insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
  select distinct u.uid, v_body, 'agenda_status', v_mid, false, v_uid, now()
  from (
    select r.sugeridor_id as uid
    union
    select v_sugeridor_lider
    union
    select r.alvo_dono_id
    union
    select m.usuario_id from public.membros_time m
    where m.status in ('ativo', 'aceito', 'aprovado')
      and m.time_id in (r.alvo_time_id, r.sugeridor_time_id)
  ) u
  where u.uid is not null;
end;
$$;

revoke all on function public.responder_sugestao_match (bigint, boolean) from public;
grant execute on function public.responder_sugestao_match (bigint, boolean) to authenticated;
