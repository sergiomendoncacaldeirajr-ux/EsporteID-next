-- Trava de duplicidade por nome+localização e revisão admin de propriedade oficial.

alter table public.espacos_genericos
  add column if not exists nome_publico_normalizado text,
  add column if not exists localizacao_normalizada text,
  add column if not exists ownership_status text not null default 'generico',
  add column if not exists ownership_verificado_em timestamptz,
  add column if not exists ownership_verificado_por_usuario_id uuid references public.profiles (id) on delete set null;

alter table public.espaco_reivindicacoes
  add column if not exists revisado_por_usuario_id uuid references public.profiles (id) on delete set null,
  add column if not exists revisado_em timestamptz,
  add column if not exists observacoes_admin text;

create or replace function public.espaco_normalize_text(p_value text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      lower(
        translate(
          coalesce(p_value, ''),
          'áàãâäéèẽêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈẼÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
          'aaaaaeeeeeiiiiooooouuuucAAAAAEEEEEIIIIOOOOOUUUUC'
        )
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.sync_espaco_duplicate_columns()
returns trigger
language plpgsql
as $$
begin
  new.nome_publico_normalizado := public.espaco_normalize_text(new.nome_publico);
  new.localizacao_normalizada := public.espaco_normalize_text(
    coalesce(nullif(new.localizacao, ''), concat_ws(' - ', nullif(new.cidade, ''), nullif(new.uf, '')))
  );
  if coalesce(new.ownership_status, '') = '' then
    new.ownership_status := case
      when new.ownership_verificado_em is not null then 'verificado'
      when lower(coalesce(new.status, '')) = 'pendente_validacao' then 'pendente_validacao'
      else 'generico'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_sync_espaco_duplicate_columns on public.espacos_genericos;
create trigger tr_sync_espaco_duplicate_columns
before insert or update of nome_publico, localizacao, cidade, uf, status, ownership_verificado_em, ownership_status
on public.espacos_genericos
for each row
execute function public.sync_espaco_duplicate_columns();

update public.espacos_genericos
set
  nome_publico_normalizado = public.espaco_normalize_text(nome_publico),
  localizacao_normalizada = public.espaco_normalize_text(
    coalesce(nullif(localizacao, ''), concat_ws(' - ', nullif(cidade, ''), nullif(uf, '')))
  ),
  ownership_status = case
    when ownership_verificado_em is not null then 'verificado'
    when lower(coalesce(status, '')) = 'pendente_validacao' then 'pendente_validacao'
    else coalesce(nullif(ownership_status, ''), 'generico')
  end;

create index if not exists idx_espacos_genericos_duplicate_lookup
  on public.espacos_genericos (nome_publico_normalizado, localizacao_normalizada);

create index if not exists idx_espaco_reivindicacoes_status
  on public.espaco_reivindicacoes (status, revisado_em desc nulls last, criado_em desc);

alter table public.espacos_genericos
  drop constraint if exists espacos_genericos_ownership_status_ck;

alter table public.espacos_genericos
  add constraint espacos_genericos_ownership_status_ck
  check (ownership_status in ('generico', 'pendente_validacao', 'verificado', 'rejeitado'));

create or replace function public.prevent_duplicate_espaco()
returns trigger
language plpgsql
as $$
declare
  v_existing_id bigint;
begin
  if coalesce(new.nome_publico_normalizado, '') = '' or coalesce(new.localizacao_normalizada, '') = '' then
    return new;
  end if;

  select eg.id
  into v_existing_id
  from public.espacos_genericos eg
  where eg.id <> coalesce(new.id, -1)
    and eg.nome_publico_normalizado = new.nome_publico_normalizado
    and eg.localizacao_normalizada = new.localizacao_normalizada
  order by eg.id asc
  limit 1;

  if v_existing_id is not null then
    raise exception 'Já existe um espaço com o mesmo nome nesta localização.'
      using errcode = '23505',
            detail = format('duplicate_espaco_id=%s', v_existing_id);
  end if;

  return new;
end;
$$;

drop trigger if exists tr_prevent_duplicate_espaco on public.espacos_genericos;
create trigger tr_prevent_duplicate_espaco
before insert or update of nome_publico, localizacao, cidade, uf
on public.espacos_genericos
for each row
execute function public.prevent_duplicate_espaco();
