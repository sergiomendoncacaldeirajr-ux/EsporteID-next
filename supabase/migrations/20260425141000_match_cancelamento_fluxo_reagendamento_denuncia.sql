-- Fluxo de cancelamento de desafio com confirmação, reagendamento e expiração automática.

alter table public.matches
  add column if not exists cancel_requested_by uuid references public.profiles (id) on delete set null,
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists cancel_response_deadline_at timestamptz,
  add column if not exists cancel_refused_at timestamptz,
  add column if not exists reschedule_deadline_at timestamptz,
  add column if not exists reschedule_selected_option smallint,
  add column if not exists scheduled_for timestamptz,
  add column if not exists scheduled_location text,
  add column if not exists wo_auto_if_no_result boolean not null default false;

create table if not exists public.match_cancelamento_opcoes (
  id bigserial primary key,
  match_id bigint not null references public.matches (id) on delete cascade,
  option_idx smallint not null check (option_idx between 1 and 3),
  suggested_by uuid not null references public.profiles (id) on delete cascade,
  scheduled_for timestamptz not null,
  location text,
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada')),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  rejected_by uuid references public.profiles (id) on delete set null,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (match_id, option_idx)
);

create index if not exists idx_match_cancelamento_opcoes_match on public.match_cancelamento_opcoes (match_id);

alter table public.match_cancelamento_opcoes enable row level security;

drop policy if exists "match_cancelamento_opcoes_select_partes" on public.match_cancelamento_opcoes;
create policy "match_cancelamento_opcoes_select_partes"
on public.match_cancelamento_opcoes
for select
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_id
      and auth.uid() in (m.usuario_id, m.adversario_id)
  )
);

drop policy if exists "match_cancelamento_opcoes_write_nenhum" on public.match_cancelamento_opcoes;
create policy "match_cancelamento_opcoes_write_nenhum"
on public.match_cancelamento_opcoes
for all
to authenticated
using (false)
with check (false);

create or replace function public.solicitar_cancelamento_match_aceito (
  p_match_id bigint,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'Match não encontrado';
  end if;
  if v_uid is distinct from v_match.usuario_id and v_uid is distinct from v_match.adversario_id then
    raise exception 'Sem permissão para este match';
  end if;
  if coalesce(v_match.status, '') is distinct from 'Aceito' then
    raise exception 'Apenas desafio aceito pode solicitar cancelamento';
  end if;

  update public.matches
  set
    status = 'CancelamentoPendente',
    cancel_requested_by = v_uid,
    cancel_requested_at = now(),
    cancel_response_deadline_at = now() + interval '24 hours',
    cancel_refused_at = null,
    reschedule_deadline_at = null,
    reschedule_selected_option = null,
    scheduled_for = null,
    scheduled_location = null,
    wo_auto_if_no_result = false
  where id = p_match_id;

  delete from public.match_cancelamento_opcoes where match_id = p_match_id;

  insert into public.notificacoes (
    usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao
  )
  values (
    case when v_uid = v_match.usuario_id then v_match.adversario_id else v_match.usuario_id end,
    case
      when p_motivo is not null and length(trim(p_motivo)) > 0
        then 'Seu oponente solicitou cancelamento do desafio: ' || trim(left(p_motivo, 180))
      else 'Seu oponente solicitou cancelamento do desafio. Responda em até 24h.'
    end,
    'match',
    p_match_id,
    false,
    v_uid,
    now()
  );
end;
$$;

revoke all on function public.solicitar_cancelamento_match_aceito (bigint, text) from public;
grant execute on function public.solicitar_cancelamento_match_aceito (bigint, text) to authenticated;

create or replace function public.responder_cancelamento_match (
  p_match_id bigint,
  p_aceitar_cancelamento boolean,
  p_opcao_1 timestamptz default null,
  p_opcao_2 timestamptz default null,
  p_opcao_3 timestamptz default null,
  p_local text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_requester uuid;
  v_limit timestamptz;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'Match não encontrado';
  end if;
  if v_match.status is distinct from 'CancelamentoPendente' then
    raise exception 'Este desafio não está aguardando resposta de cancelamento';
  end if;
  if v_uid is distinct from v_match.usuario_id and v_uid is distinct from v_match.adversario_id then
    raise exception 'Sem permissão';
  end if;
  if v_uid = v_match.cancel_requested_by then
    raise exception 'Apenas o oponente pode responder ao pedido de cancelamento';
  end if;
  if v_match.cancel_response_deadline_at is not null and now() > v_match.cancel_response_deadline_at then
    raise exception 'Prazo de resposta expirado';
  end if;

  v_requester := v_match.cancel_requested_by;

  if p_aceitar_cancelamento then
    update public.matches
    set
      status = 'Cancelado',
      data_confirmacao = now(),
      cancel_refused_at = null,
      reschedule_deadline_at = null
    where id = p_match_id;

    delete from public.match_cancelamento_opcoes where match_id = p_match_id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values (
      v_requester,
      'Seu pedido de cancelamento foi aceito. O desafio foi cancelado.',
      'match',
      p_match_id,
      false,
      v_uid,
      now()
    );
    return;
  end if;

  if p_opcao_1 is null or p_opcao_2 is null or p_opcao_3 is null then
    raise exception 'Informe as 3 opções de data/hora para recusar o cancelamento';
  end if;
  if p_opcao_1 <= now() or p_opcao_2 <= now() or p_opcao_3 <= now() then
    raise exception 'As opções devem ser no futuro';
  end if;

  v_limit := now() + interval '72 hours';
  if p_opcao_1 > v_limit or p_opcao_2 > v_limit or p_opcao_3 > v_limit then
    raise exception 'As opções devem estar dentro da janela de 72h';
  end if;

  delete from public.match_cancelamento_opcoes where match_id = p_match_id;

  insert into public.match_cancelamento_opcoes (match_id, option_idx, suggested_by, scheduled_for, location)
  values
    (p_match_id, 1, v_uid, p_opcao_1, nullif(trim(coalesce(p_local, '')), '')),
    (p_match_id, 2, v_uid, p_opcao_2, nullif(trim(coalesce(p_local, '')), '')),
    (p_match_id, 3, v_uid, p_opcao_3, nullif(trim(coalesce(p_local, '')), ''));

  update public.matches
  set
    status = 'ReagendamentoPendente',
    cancel_refused_at = now(),
    reschedule_deadline_at = v_limit,
    scheduled_location = nullif(trim(coalesce(p_local, '')), '')
  where id = p_match_id;

  insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
  values (
    v_requester,
    'Seu pedido de cancelamento foi recusado. Escolha uma das 3 opções de confronto em até 72h.',
    'match',
    p_match_id,
    false,
    v_uid,
    now()
  );
end;
$$;

revoke all on function public.responder_cancelamento_match (bigint, boolean, timestamptz, timestamptz, timestamptz, text) from public;
grant execute on function public.responder_cancelamento_match (bigint, boolean, timestamptz, timestamptz, timestamptz, text) to authenticated;

create or replace function public.responder_opcao_reagendamento_match (
  p_match_id bigint,
  p_option_idx smallint,
  p_aceitar boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_opt public.match_cancelamento_opcoes%rowtype;
  v_rejected_count int;
  v_requester uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'Match não encontrado';
  end if;
  if v_match.status is distinct from 'ReagendamentoPendente' then
    raise exception 'Este desafio não está aguardando escolha de opção';
  end if;
  if v_uid is distinct from v_match.usuario_id and v_uid is distinct from v_match.adversario_id then
    raise exception 'Sem permissão';
  end if;
  if v_uid is distinct from v_match.cancel_requested_by then
    raise exception 'Apenas quem pediu cancelamento pode responder às opções';
  end if;
  if v_match.reschedule_deadline_at is not null and now() > v_match.reschedule_deadline_at then
    raise exception 'Prazo de reagendamento expirado';
  end if;

  select * into v_opt
  from public.match_cancelamento_opcoes
  where match_id = p_match_id and option_idx = p_option_idx;

  if v_opt.id is null then
    raise exception 'Opção inválida';
  end if;
  if v_opt.status is distinct from 'pendente' then
    raise exception 'Esta opção já foi respondida';
  end if;

  v_requester := v_match.cancel_requested_by;

  if p_aceitar then
    update public.match_cancelamento_opcoes
    set status = 'aceita', accepted_by = v_uid, accepted_at = now()
    where id = v_opt.id;

    update public.match_cancelamento_opcoes
    set status = 'recusada', rejected_by = v_uid, rejected_at = now()
    where match_id = p_match_id and id <> v_opt.id and status = 'pendente';

    update public.matches
    set
      status = 'Aceito',
      reschedule_selected_option = p_option_idx,
      scheduled_for = v_opt.scheduled_for,
      scheduled_location = coalesce(v_opt.location, v_match.scheduled_location),
      wo_auto_if_no_result = true,
      cancel_requested_by = null,
      cancel_requested_at = null,
      cancel_response_deadline_at = null,
      cancel_refused_at = null,
      reschedule_deadline_at = null
    where id = p_match_id;

    update public.partidas p
    set
      status = 'agendada',
      data_partida = v_opt.scheduled_for,
      local_str = coalesce(v_opt.location, p.local_str)
    where p.id = (
      select p2.id
      from public.partidas p2
      where p2.torneio_id is null
        and p2.esporte_id = v_match.esporte_id
        and (
          (p2.jogador1_id = v_match.usuario_id and p2.jogador2_id = v_match.adversario_id)
          or (p2.jogador1_id = v_match.adversario_id and p2.jogador2_id = v_match.usuario_id)
        )
      order by p2.id desc
      limit 1
    );

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values (
      case when v_requester = v_match.usuario_id then v_match.adversario_id else v_match.usuario_id end,
      'Uma opção de reagendamento foi aceita. O desafio segue ativo com data definida no sistema.',
      'match',
      p_match_id,
      false,
      v_uid,
      now()
    );
    return;
  end if;

  update public.match_cancelamento_opcoes
  set status = 'recusada', rejected_by = v_uid, rejected_at = now()
  where id = v_opt.id;

  select count(*) into v_rejected_count
  from public.match_cancelamento_opcoes
  where match_id = p_match_id and status = 'recusada';

  if v_rejected_count >= 3 then
    update public.matches
    set
      status = 'Cancelado',
      data_confirmacao = now()
    where id = p_match_id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values (
      case when v_requester = v_match.usuario_id then v_match.adversario_id else v_match.usuario_id end,
      'As 3 opções de reagendamento foram recusadas. O desafio foi cancelado automaticamente.',
      'match',
      p_match_id,
      false,
      v_uid,
      now()
    );
  end if;
end;
$$;

revoke all on function public.responder_opcao_reagendamento_match (bigint, smallint, boolean) from public;
grant execute on function public.responder_opcao_reagendamento_match (bigint, smallint, boolean) to authenticated;

create or replace function public.processar_pendencias_cancelamento_match (
  p_only_user uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r record;
  v_winner uuid;
begin
  for r in
    select m.*
    from public.matches m
    where m.status = 'CancelamentoPendente'
      and m.cancel_response_deadline_at is not null
      and m.cancel_response_deadline_at <= now()
      and (
        p_only_user is null
        or p_only_user in (m.usuario_id, m.adversario_id)
      )
  loop
    update public.matches
    set status = 'Cancelado', data_confirmacao = now()
    where id = r.id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values
      (r.usuario_id, 'Cancelamento automático: não houve resposta ao pedido em 24h.', 'match', r.id, false, null, now()),
      (r.adversario_id, 'Cancelamento automático: não houve resposta ao pedido em 24h.', 'match', r.id, false, null, now());

    v_count := v_count + 1;
  end loop;

  for r in
    select m.*
    from public.matches m
    where m.status = 'ReagendamentoPendente'
      and m.reschedule_deadline_at is not null
      and m.reschedule_deadline_at <= now()
      and (
        p_only_user is null
        or p_only_user in (m.usuario_id, m.adversario_id)
      )
  loop
    update public.matches
    set status = 'Cancelado', data_confirmacao = now()
    where id = r.id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values
      (r.usuario_id, 'Cancelamento automático: nenhuma opção de reagendamento foi aceita na janela de 72h.', 'match', r.id, false, null, now()),
      (r.adversario_id, 'Cancelamento automático: nenhuma opção de reagendamento foi aceita na janela de 72h.', 'match', r.id, false, null, now());

    v_count := v_count + 1;
  end loop;

  -- Se reagendado (recusa de cancelamento) e não houve lançamento de resultado até +24h da data combinada:
  -- finaliza com W.O. automático para quem pediu cancelar.
  for r in
    select m.*
    from public.matches m
    where m.status = 'Aceito'
      and m.wo_auto_if_no_result is true
      and m.scheduled_for is not null
      and m.scheduled_for <= now() - interval '24 hours'
      and (
        p_only_user is null
        or p_only_user in (m.usuario_id, m.adversario_id)
      )
  loop
    v_winner := r.cancel_requested_by;
    if v_winner is null then
      continue;
    end if;

    update public.partidas p
    set
      status = 'concluida',
      status_ranking = coalesce(nullif(p.status_ranking, ''), 'validado'),
      placar_1 = case when p.jogador1_id = v_winner then 1 else 0 end,
      placar_2 = case when p.jogador2_id = v_winner then 1 else 0 end,
      mensagem = coalesce(p.mensagem, 'W.O. automático por ausência de resultado no prazo de 24h após data reagendada.'),
      data_resultado = coalesce(p.data_resultado, now()),
      data_validacao = now()
    where p.id = (
      select p2.id
      from public.partidas p2
      where p2.torneio_id is null
        and p2.esporte_id = r.esporte_id
        and (
          (p2.jogador1_id = r.usuario_id and p2.jogador2_id = r.adversario_id)
          or (p2.jogador1_id = r.adversario_id and p2.jogador2_id = r.usuario_id)
        )
        and lower(trim(coalesce(p2.status, ''))) in ('agendada', 'aguardando_confirmacao')
      order by p2.id desc
      limit 1
    );

    update public.matches
    set
      status = 'Concluido',
      data_confirmacao = now(),
      wo_auto_if_no_result = false,
      cancel_requested_by = null
    where id = r.id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values
      (r.usuario_id, 'Resultado encerrado por W.O. automático após prazo do reagendamento.', 'match', r.id, false, null, now()),
      (r.adversario_id, 'Resultado encerrado por W.O. automático após prazo do reagendamento.', 'match', r.id, false, null, now());

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.processar_pendencias_cancelamento_match (uuid) from public;
grant execute on function public.processar_pendencias_cancelamento_match (uuid) to authenticated;
grant execute on function public.processar_pendencias_cancelamento_match (uuid) to service_role;
