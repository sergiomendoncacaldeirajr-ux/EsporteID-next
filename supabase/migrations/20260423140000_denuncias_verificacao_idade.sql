-- Denúncias (perfil UUID + motivos), verificação de idade pós-denúncia, alertas admin, bloqueio de match.

-- Perfis: gate de match após denúncia de menor ou verificação
alter table public.profiles add column if not exists match_idade_gate text not null default 'ok';
alter table public.profiles add column if not exists match_idade_gate_atualizado_em timestamptz;

comment on column public.profiles.match_idade_gate is
  'ok | pendente_documento | em_analise | aprovado | reprovado — controla uso de match até verificação documento+selfie.';

alter table public.profiles drop constraint if exists profiles_match_idade_gate_ck;
alter table public.profiles
  add constraint profiles_match_idade_gate_ck check (
    match_idade_gate in ('ok', 'pendente_documento', 'em_analise', 'aprovado', 'reprovado')
  );

-- Denúncias: alvo por UUID (alvo_id bigint era legado genérico)
alter table public.denuncias alter column alvo_id drop not null;

alter table public.denuncias add column if not exists alvo_usuario_id uuid references public.profiles (id) on delete cascade;
alter table public.denuncias add column if not exists codigo_motivo text;

alter table public.denuncias drop constraint if exists denuncias_alvo_ck;
alter table public.denuncias
  add constraint denuncias_alvo_ck check (
    alvo_usuario_id is not null
    or alvo_id is not null
  );

comment on column public.denuncias.codigo_motivo is
  'abuso | menor_idade | spam | perfil_falso | conteudo_improprio | outro';

-- Auditoria de tentativas de verificação (documento + selfie)
create table if not exists public.perfil_verificacao_idade (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  denuncia_origem_id bigint references public.denuncias (id) on delete set null,
  documento_storage_path text not null,
  selfie_storage_path text not null,
  provider text not null default 'desconhecido',
  score_similaridade numeric(6, 4),
  resultado text not null default 'pendente',
  detalhes_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  processado_em timestamptz
);

comment on table public.perfil_verificacao_idade is
  'Registro auditável de envio de documento oficial + selfie e resultado da checagem automática.';

alter table public.perfil_verificacao_idade drop constraint if exists perfil_verificacao_idade_resultado_ck;
alter table public.perfil_verificacao_idade
  add constraint perfil_verificacao_idade_resultado_ck check (
    resultado in ('pendente', 'aprovado_automatico', 'reprovado_automatico', 'erro_processamento')
  );

create index if not exists perfil_verificacao_idade_usuario_idx on public.perfil_verificacao_idade (usuario_id, criado_em desc);

alter table public.perfil_verificacao_idade enable row level security;

drop policy if exists "verif_idade_select_own" on public.perfil_verificacao_idade;
create policy "verif_idade_select_own"
  on public.perfil_verificacao_idade for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists "verif_idade_insert_own" on public.perfil_verificacao_idade;
create policy "verif_idade_insert_own"
  on public.perfil_verificacao_idade for insert
  to authenticated
  with check (usuario_id = auth.uid());

-- Fila simples para o painel admin (lido via service role)
create table if not exists public.admin_alertas (
  id bigint generated always as identity primary key,
  tipo text not null,
  titulo text not null,
  corpo text,
  payload_json jsonb not null default '{}'::jsonb,
  lido boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists admin_alertas_nao_lido_idx on public.admin_alertas (lido, criado_em desc);

alter table public.admin_alertas enable row level security;

-- Sem acesso direto para usuários comuns; admins usam service role.
drop policy if exists "admin_alertas_none" on public.admin_alertas;
create policy "admin_alertas_none"
  on public.admin_alertas for all
  to authenticated
  using (false)
  with check (false);

-- Helper: usuário bloqueado para match por verificação de idade
create or replace function public.perfil_bloqueado_match_idade (p_uid uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select match_idade_gate in ('pendente_documento', 'em_analise', 'reprovado')
      from public.profiles p
      where p.id = p_uid
    ),
    false
  );
$$;

-- Registrar denúncia de perfil + efeitos (ex.: menor de idade exige verificação)
create or replace function public.registrar_denuncia_usuario (
  p_alvo_usuario_id uuid,
  p_codigo_motivo text,
  p_texto text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_id bigint;
  v_codigo text;
  v_motivo text;
begin
  if v_me is null then
    raise exception 'Não autenticado';
  end if;
  if p_alvo_usuario_id is null or p_alvo_usuario_id = v_me then
    raise exception 'Alvo inválido';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_alvo_usuario_id) then
    raise exception 'Perfil não encontrado';
  end if;

  v_codigo := lower(trim(coalesce(p_codigo_motivo, '')));
  if v_codigo not in ('abuso', 'menor_idade', 'spam', 'perfil_falso', 'conteudo_improprio', 'outro') then
    raise exception 'Motivo de denúncia inválido';
  end if;

  v_motivo := case v_codigo
    when 'abuso' then 'Abuso, assédio ou ameaça'
    when 'menor_idade' then 'Suspeita de menor de idade'
    when 'spam' then 'Spam ou propaganda indevida'
    when 'perfil_falso' then 'Perfil falso ou identidade suspeita'
    when 'conteudo_improprio' then 'Conteúdo impróprio'
    else 'Outro'
  end;

  insert into public.denuncias (
    denunciante_id,
    alvo_tipo,
    alvo_id,
    alvo_usuario_id,
    codigo_motivo,
    motivo,
    texto,
    status
  )
  values (
    v_me,
    'usuario',
    null,
    p_alvo_usuario_id,
    v_codigo,
    v_motivo,
    nullif(trim(coalesce(p_texto, '')), ''),
    'aberta'
  )
  returning id into v_id;

  insert into public.admin_alertas (tipo, titulo, corpo, payload_json)
  values (
    'denuncia',
    'Nova denúncia de perfil',
    v_motivo,
    jsonb_build_object(
      'denuncia_id', v_id,
      'alvo_usuario_id', p_alvo_usuario_id,
      'codigo', v_codigo,
      'denunciante_id', v_me
    )
  );

  return v_id;
end;
$$;

revoke all on function public.registrar_denuncia_usuario (uuid, text, text) from public;
grant execute on function public.registrar_denuncia_usuario (uuid, text, text) to authenticated;

-- Efeito colateral: denúncia "menor_idade" exige verificação (roda como definer, sem depender de RLS).
create or replace function public.tr_denuncias_aplica_menor_idade ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo_motivo = 'menor_idade' and new.alvo_usuario_id is not null then
    update public.profiles
    set
      match_idade_gate = 'pendente_documento',
      match_idade_gate_atualizado_em = now()
    where id = new.alvo_usuario_id
      and match_idade_gate in ('ok', 'aprovado');
  end if;
  return new;
end;
$$;

drop trigger if exists tr_denuncias_after_insert_menor on public.denuncias;
create trigger tr_denuncias_after_insert_menor
after insert on public.denuncias
for each row
execute function public.tr_denuncias_aplica_menor_idade ();

-- Impede que o próprio usuário altere match_idade_gate pelo update comum de perfil (service_role / triggers ok).
create or replace function public.profiles_block_client_match_idade_gate_change ()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.match_idade_gate is distinct from old.match_idade_gate then
    if coalesce(auth.jwt()->>'role', '') = 'authenticated' and auth.uid() is not null and auth.uid() = old.id then
      raise exception 'O status de verificação de idade só muda pelo fluxo oficial (denúncia ou verificação automática).';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_profiles_block_match_idade_gate on public.profiles;
create trigger tr_profiles_block_match_idade_gate
before update on public.profiles
for each row
execute function public.profiles_block_client_match_idade_gate_change ();

-- Bucket privado para documento + selfie de verificação
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verificacao-idade',
  'verificacao-idade',
  false,
  10485760,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_verif_idade_select_own" on storage.objects;
create policy "storage_verif_idade_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'verificacao-idade'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_verif_idade_insert_own" on storage.objects;
create policy "storage_verif_idade_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'verificacao-idade'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_verif_idade_update_own" on storage.objects;
create policy "storage_verif_idade_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'verificacao-idade'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'verificacao-idade'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_verif_idade_delete_own" on storage.objects;
create policy "storage_verif_idade_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'verificacao-idade'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Bloqueio de match: inserido após v_adv definido na função atual
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
