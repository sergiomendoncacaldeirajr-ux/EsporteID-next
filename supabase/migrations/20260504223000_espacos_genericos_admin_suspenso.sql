-- Suspensão administrativa: oculta o local do público (listagem + páginas /espaco) sem apagar dados.
-- Exclusão permanente: apenas via service_role (server actions admin).

alter table public.espacos_genericos
  add column if not exists admin_suspenso boolean not null default false;

comment on column public.espacos_genericos.admin_suspenso is
  'True: local oculto para quem não é dono (criador/responsável). Listagem pública e slug público bloqueados na app.';

create or replace function public.trg_espacos_genericos_admin_suspenso_service_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (server admin): `auth.uid()` é null. Usuário logado: não pode alterar a flag.
  if tg_op = 'INSERT' then
    if coalesce(new.admin_suspenso, false) = true and (select auth.uid()) is not null then
      new.admin_suspenso := false;
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.admin_suspenso is distinct from old.admin_suspenso and (select auth.uid()) is not null then
      new.admin_suspenso := old.admin_suspenso;
    end if;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_espacos_genericos_admin_suspenso_service_only on public.espacos_genericos;
create trigger trg_espacos_genericos_admin_suspenso_service_only
  before insert or update on public.espacos_genericos
  for each row
  execute function public.trg_espacos_genericos_admin_suspenso_service_only();

drop policy if exists eg_read on public.espacos_genericos;
create policy eg_read on public.espacos_genericos
  for select to authenticated
  using (
    coalesce(admin_suspenso, false) = false
    or criado_por_usuario_id = (select auth.uid())
    or responsavel_usuario_id = (select auth.uid())
  );

drop policy if exists eg_read_anon on public.espacos_genericos;
create policy eg_read_anon on public.espacos_genericos
  for select to anon
  using (
    ativo_listagem = true
    and coalesce(admin_suspenso, false) = false
  );

create or replace function public.api_fold_search_espacos_listagem(p_search text, p_limit int default 60)
returns table (id bigint, slug text, nome_publico text, localizacao text, lat text, lng text)
language sql
stable
security invoker
set search_path = public
as $$
  select e.id, e.slug, e.nome_publico, e.localizacao, e.lat, e.lng
  from public.espacos_genericos e
  where e.ativo_listagem = true
    and coalesce(e.admin_suspenso, false) = false
    and length(trim(p_search)) >= 3
    and (
      strpos(public.fold_search_text(e.nome_publico), public.fold_search_text(p_search)) > 0
      or strpos(public.fold_search_text(e.localizacao), public.fold_search_text(p_search)) > 0
    )
  limit least(coalesce(nullif(p_limit, 0), 60), 120);
$$;
