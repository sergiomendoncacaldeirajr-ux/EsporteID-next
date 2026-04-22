-- Confirmação explícita 18+ antes de usar match: flag no perfil + auditoria (IP, UA, horário, etc.).

alter table public.profiles add column if not exists match_maioridade_confirmada boolean not null default false;
alter table public.profiles add column if not exists match_maioridade_confirmada_em timestamptz;

comment on column public.profiles.match_maioridade_confirmada is
  'Usuário concluiu fluxo de declaração de 18+ para uso do sistema de match.';
comment on column public.profiles.match_maioridade_confirmada_em is
  'Momento UTC registrado no servidor da confirmação etária para match.';

comment on column public.profiles.data_nascimento is
  'Data de nascimento: pode ser preenchida na confirmação de maioridade para match (cadastro não exige).';

create table if not exists public.match_maioridade_confirmacoes (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  data_nascimento_declarada date not null,
  confirmado_em timestamptz not null default now(),
  ip_publico text,
  user_agent text,
  accept_language text,
  referer text,
  host text,
  localizacao_perfil_snapshot text,
  lat_snapshot double precision,
  lng_snapshot double precision,
  pais_inferido text,
  versao_declaracao text not null default 'match_maioridade_v1',
  detalhes_json jsonb not null default '{}'::jsonb
);

comment on table public.match_maioridade_confirmacoes is
  'Registro imutável (append) de confirmação etária para uso do match — auditoria e LGPD.';

create index if not exists match_maioridade_confirmacoes_usuario_idx
  on public.match_maioridade_confirmacoes (usuario_id, confirmado_em desc);

alter table public.match_maioridade_confirmacoes enable row level security;

drop policy if exists "match_maioridade_conf_none" on public.match_maioridade_confirmacoes;
create policy "match_maioridade_conf_none"
  on public.match_maioridade_confirmacoes for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.profiles_block_client_maioridade_confirm_change ()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.match_maioridade_confirmada is distinct from old.match_maioridade_confirmada
     or new.match_maioridade_confirmada_em is distinct from old.match_maioridade_confirmada_em then
    if coalesce(auth.jwt()->>'role', '') = 'authenticated'
       and auth.uid() is not null
       and auth.uid() = old.id then
      raise exception 'A confirmação de maioridade para match só pode ser feita pelo fluxo oficial da plataforma.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_profiles_block_maioridade_confirm on public.profiles;
create trigger tr_profiles_block_maioridade_confirm
before update on public.profiles
for each row
execute function public.profiles_block_client_maioridade_confirm_change ();

create or replace function public.solicitar_desafio_match (
  p_esporte_id bigint,
  p_modalidade text,
  p_alvo_usuario_id uuid default null,
  p_alvo_time_id bigint default null,
  p_finalidade text default 'ranking'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mid bigint;
  v_adv uuid;
  v_time_id bigint;
  v_challenger_nome text;
  v_mod text;
  t_tipo text;
  t_esporte bigint;
  t_criador uuid;
  v_fin text;
  v_meses int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  v_fin := lower(trim(coalesce(p_finalidade, 'ranking')));
  if v_fin not in ('ranking', 'amistoso') then
    raise exception 'Finalidade de match inválida';
  end if;

  v_mod := lower(trim(coalesce(p_modalidade, '')));
  if v_mod = 'atleta' then
    v_mod := 'individual';
  end if;
  if v_mod not in ('individual', 'dupla', 'time') then
    raise exception 'Modalidade inválida';
  end if;

  if v_fin = 'amistoso' and v_mod is distinct from 'individual' then
    raise exception 'Match amistoso está disponível apenas na modalidade individual.';
  end if;

  if p_esporte_id is null or p_esporte_id < 1 then
    raise exception 'Esporte obrigatório';
  end if;

  if v_mod = 'individual' then
    if p_alvo_usuario_id is null then
      raise exception 'Alvo obrigatório';
    end if;
    if p_alvo_time_id is not null then
      raise exception 'Parâmetros inválidos';
    end if;
    if p_alvo_usuario_id = v_uid then
      raise exception 'Alvo inválido';
    end if;
    if not exists (select 1 from public.profiles p where p.id = p_alvo_usuario_id) then
      raise exception 'Perfil não encontrado';
    end if;
    v_adv := p_alvo_usuario_id;
    v_time_id := null;
  else
    if p_alvo_time_id is null then
      raise exception 'Time obrigatório';
    end if;
    if p_alvo_usuario_id is not null then
      raise exception 'Parâmetros inválidos';
    end if;

    select lower(trim(coalesce(t.tipo, ''))), t.esporte_id, t.criador_id
    into t_tipo, t_esporte, t_criador
    from public.times t
    where t.id = p_alvo_time_id;

    if t_criador is null then
      raise exception 'Time não encontrado';
    end if;
    if t_tipo is distinct from v_mod then
      raise exception 'Tipo de formação não confere';
    end if;
    if t_esporte is distinct from p_esporte_id then
      raise exception 'Esporte não confere';
    end if;
    if t_criador = v_uid then
      raise exception 'Alvo inválido';
    end if;

    if not exists (
      select 1
      from public.times x
      where x.criador_id = v_uid
        and lower(trim(coalesce(x.tipo, ''))) = v_mod
        and x.esporte_id = p_esporte_id
    ) then
      raise exception 'Você precisa ser líder de uma formação neste esporte.';
    end if;

    v_adv := t_criador;
    v_time_id := p_alvo_time_id;
  end if;

  if not coalesce((select p.match_maioridade_confirmada from public.profiles p where p.id = v_uid), false) then
    raise exception 'Confirme que você tem 18 anos ou mais para usar o match.';
  end if;
  if v_adv is not null and not coalesce((select p.match_maioridade_confirmada from public.profiles p where p.id = v_adv), false) then
    raise exception 'O oponente precisa concluir a confirmação de maioridade (18+) para o match.';
  end if;

  if public.perfil_bloqueado_match_idade(v_uid) then
    raise exception
      'Confirme sua identidade com documento oficial e selfie para continuar usando o match.';
  end if;
  if v_adv is not null and public.perfil_bloqueado_match_idade(v_adv) then
    raise exception 'Este perfil não pode participar de match no momento (verificação de idade pendente).';
  end if;

  if v_fin = 'amistoso' then
    if not exists (
      select 1 from public.profiles p
      where p.id = v_uid
        and coalesce(p.disponivel_amistoso, false) is true
        and p.disponivel_amistoso_ate is not null
        and p.disponivel_amistoso_ate > now()
    ) then
      raise exception 'Ative o modo amistoso no seu perfil para solicitar match amistoso.';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = v_adv
        and coalesce(p.disponivel_amistoso, false) is true
        and p.disponivel_amistoso_ate is not null
        and p.disponivel_amistoso_ate > now()
    ) then
      raise exception 'O oponente não está com modo amistoso ativo no momento.';
    end if;
  end if;

  if v_fin = 'ranking' and v_mod = 'individual' then
    select coalesce(
      (
        select
          case jsonb_typeof(ac.value_json)
            when 'number' then (ac.value_json::text)::int
            when 'object' then nullif((ac.value_json->>'meses'), '')::int
            else null
          end
        from public.app_config ac
        where ac.key = 'match_rank_cooldown_meses'
      ),
      12
    ) into v_meses;
    if v_meses < 1 then
      v_meses := 12;
    end if;

    if exists (
      select 1 from public.matches m
      where m.esporte_id = p_esporte_id
        and m.finalidade = 'ranking'
        and m.status = 'Pendente'
        and (
          (m.usuario_id = v_uid and m.adversario_id = v_adv)
          or (m.usuario_id = v_adv and m.adversario_id = v_uid)
        )
    ) then
      raise exception 'Já existe um pedido de match de ranking pendente com este oponente neste esporte.';
    end if;

    if exists (
      select 1 from public.partidas p
      where p.esporte_id = p_esporte_id
        and p.torneio_id is null
        and lower(trim(coalesce(p.status, ''))) in (
          'concluida', 'concluída', 'concluído', 'finalizada', 'encerrada', 'validada'
        )
        and (
          (p.jogador1_id = v_uid and p.jogador2_id = v_adv)
          or (p.jogador1_id = v_adv and p.jogador2_id = v_uid)
        )
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) > now() - make_interval(months => v_meses)
    ) then
      raise exception
        using message = format(
          'Neste esporte, só é possível um novo match de ranking com este oponente após %s meses do último confronto válido.',
          v_meses
        );
    end if;
  end if;

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
    adversario_time_id
  )
  values (
    v_uid,
    v_adv,
    p_esporte_id,
    v_mod,
    v_mod,
    v_fin,
    'Pendente',
    now(),
    now(),
    v_time_id
  )
  returning id into v_mid;

  select nome into v_challenger_nome from public.profiles where id = v_uid;

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
    v_adv,
    case
      when v_fin = 'amistoso' then
        case
          when v_challenger_nome is not null and length(trim(v_challenger_nome)) > 0
          then 'Pedido de Match amistoso de ' || trim(v_challenger_nome) || ' (sem pontos de ranking).'
          else 'Você recebeu um pedido de Match amistoso.'
        end
      else
        case
          when v_challenger_nome is not null and length(trim(v_challenger_nome)) > 0
          then 'Você recebeu um novo pedido de Match de ranking de ' || trim(v_challenger_nome) || '.'
          else 'Você recebeu um novo pedido de Match de ranking.'
        end
    end,
    'match',
    v_mid,
    false,
    v_uid,
    now()
  );

  return v_mid;
end;
$$;

revoke all on function public.solicitar_desafio_match (bigint, text, uuid, bigint, text) from public;
grant execute on function public.solicitar_desafio_match (bigint, text, uuid, bigint, text) to authenticated;

create or replace function public.responder_pedido_match (p_match_id bigint, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_usuario uuid;
  v_status text;
  v_adv uuid;
  v_fin text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select usuario_id, status, adversario_id, coalesce(m.finalidade, 'ranking')
  into v_usuario, v_status, v_adv, v_fin
  from public.matches m
  where m.id = p_match_id;

  if v_usuario is null then
    raise exception 'Pedido não encontrado';
  end if;
  if v_adv is distinct from v_uid then
    raise exception 'Sem permissão para responder este pedido';
  end if;
  if v_status is distinct from 'Pendente' then
    raise exception 'Este pedido já foi respondido';
  end if;

  if p_aceitar then
    if not coalesce((select match_maioridade_confirmada from public.profiles where id = v_uid), false) then
      raise exception 'Confirme que você tem 18 anos ou mais para aceitar pedidos de match.';
    end if;
    if not coalesce((select match_maioridade_confirmada from public.profiles where id = v_usuario), false) then
      raise exception 'O solicitante ainda não concluiu a confirmação etária obrigatória para o match.';
    end if;
    if public.perfil_bloqueado_match_idade(v_uid) then
      raise exception
        'Confirme sua identidade com documento oficial e selfie para aceitar pedidos de match.';
    end if;
    if public.perfil_bloqueado_match_idade(v_usuario) then
      raise exception 'O solicitante não pode prosseguir com match no momento (verificação de idade).';
    end if;

    update public.matches
    set
      status = 'Aceito',
      data_confirmacao = now()
    where id = p_match_id;

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
      v_usuario,
      case
        when v_fin = 'amistoso' then
          'Seu pedido de Match amistoso foi aceito. Use o WhatsApp para combinar — não há pontos de ranking nem agenda obrigatória.'
        else
          'Seu pedido de Match de ranking foi aceito. Use a agenda para agendar e registrar o resultado.'
      end,
      'match',
      p_match_id,
      false,
      v_uid,
      now()
    );
  else
    update public.matches
    set
      status = 'Recusado',
      data_confirmacao = now()
    where id = p_match_id;

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
      v_usuario,
      case
        when v_fin = 'amistoso' then 'Seu pedido de Match amistoso foi recusado.'
        else 'Seu pedido de Match de ranking foi recusado.'
      end,
      'match',
      p_match_id,
      false,
      v_uid,
      now()
    );
  end if;
end;
$$;

revoke all on function public.responder_pedido_match (bigint, boolean) from public;
grant execute on function public.responder_pedido_match (bigint, boolean) to authenticated;
