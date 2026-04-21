-- Intenção de aula: aluno logado pode solicitar aula ao professor a partir do perfil público.

create table if not exists public.professor_solicitacoes_aula (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  mensagem text,
  status text not null default 'pendente',
  referencia_aula_id bigint references public.professor_aulas (id) on delete set null,
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  atualizado_em timestamptz not null default now(),
  constraint professor_solicitacoes_aula_status_ck
    check (status in ('pendente', 'aceita', 'recusada', 'cancelada')),
  constraint professor_solicitacoes_aula_professor_aluno_ck
    check (professor_id <> aluno_id)
);

create index if not exists idx_professor_solicitacoes_professor_status
  on public.professor_solicitacoes_aula (professor_id, status, criado_em desc);

create index if not exists idx_professor_solicitacoes_aluno_status
  on public.professor_solicitacoes_aula (aluno_id, status, criado_em desc);

create unique index if not exists idx_professor_solicitacoes_pendente_unica
  on public.professor_solicitacoes_aula (professor_id, aluno_id, esporte_id)
  where status = 'pendente';

drop trigger if exists tr_professor_solicitacoes_touch_updated_at on public.professor_solicitacoes_aula;
create trigger tr_professor_solicitacoes_touch_updated_at
before update on public.professor_solicitacoes_aula
for each row
execute function public.professor_touch_updated_at();

create or replace function public.professor_solicitar_aula(
  p_professor_id uuid,
  p_esporte_id bigint,
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id bigint;
  v_nome_aluno text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_professor_id is null or p_esporte_id is null then
    raise exception 'Parâmetros inválidos';
  end if;

  if p_professor_id = v_uid then
    raise exception 'Você não pode solicitar aula para si mesmo';
  end if;

  if not exists (
    select 1
    from public.professor_esportes pe
    where pe.professor_id = p_professor_id
      and pe.esporte_id = p_esporte_id
      and pe.ativo = true
  ) then
    raise exception 'Professor não atende esse esporte';
  end if;

  if exists (
    select 1
    from public.professor_solicitacoes_aula s
    where s.professor_id = p_professor_id
      and s.aluno_id = v_uid
      and s.esporte_id = p_esporte_id
      and s.status = 'pendente'
  ) then
    raise exception 'Você já tem uma solicitação pendente para este esporte';
  end if;

  insert into public.professor_solicitacoes_aula (
    professor_id,
    aluno_id,
    esporte_id,
    mensagem
  )
  values (
    p_professor_id,
    v_uid,
    p_esporte_id,
    nullif(left(trim(coalesce(p_mensagem, '')), 600), '')
  )
  returning id into v_id;

  select nome into v_nome_aluno from public.profiles where id = v_uid;

  perform public.professor_criar_notificacao(
    p_professor_id,
    coalesce(nullif(trim(v_nome_aluno), ''), 'Um aluno') || ' solicitou uma aula pelo seu perfil público.',
    'professor_solicitacao',
    v_id,
    v_uid
  );

  return v_id;
end;
$$;

alter table public.professor_solicitacoes_aula enable row level security;

drop policy if exists "professor_solicitacoes_participantes_select" on public.professor_solicitacoes_aula;
create policy "professor_solicitacoes_participantes_select"
  on public.professor_solicitacoes_aula for select to authenticated
  using (professor_id = auth.uid() or aluno_id = auth.uid());

drop policy if exists "professor_solicitacoes_aluno_insert" on public.professor_solicitacoes_aula;
create policy "professor_solicitacoes_aluno_insert"
  on public.professor_solicitacoes_aula for insert to authenticated
  with check (aluno_id = auth.uid());

drop policy if exists "professor_solicitacoes_participantes_update" on public.professor_solicitacoes_aula;
create policy "professor_solicitacoes_participantes_update"
  on public.professor_solicitacoes_aula for update to authenticated
  using (professor_id = auth.uid() or aluno_id = auth.uid())
  with check (professor_id = auth.uid() or aluno_id = auth.uid());

revoke all on function public.professor_solicitar_aula(uuid, bigint, text) from public;
grant execute on function public.professor_solicitar_aula(uuid, bigint, text) to authenticated;
