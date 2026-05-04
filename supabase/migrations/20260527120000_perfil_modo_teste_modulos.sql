-- Quais chaves de system_feature (em modo teste no app) o sandbox pode usar — null = todas as elegíveis.

alter table public.profiles
  add column if not exists perfil_modo_teste_modulos jsonb;

comment on column public.profiles.perfil_modo_teste_modulos is
  'Lista de chaves (ex.: ["locais","torneios"]) entre os módulos globalmente em modo teste; null = todos. Só service role altera.';

create or replace function public.profiles_block_client_perfil_modo_teste_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if coalesce(new.perfil_modo_teste, false) is distinct from coalesce(old.perfil_modo_teste, false) then
    if (select auth.role()) = 'service_role' then
      return new;
    end if;
    raise exception 'perfil_modo_teste só pode ser alterado pelo painel administrativo (service role).';
  end if;
  if new.perfil_modo_teste_modulos is distinct from old.perfil_modo_teste_modulos then
    if (select auth.role()) = 'service_role' then
      return new;
    end if;
    raise exception 'perfil_modo_teste_modulos só pode ser alterado pelo painel administrativo (service role).';
  end if;
  return new;
end;
$$;

drop trigger if exists tr_profiles_block_client_modo_teste on public.profiles;
create trigger tr_profiles_block_client_modo_teste
  before update of perfil_modo_teste, perfil_modo_teste_modulos on public.profiles
  for each row
  execute function public.profiles_block_client_perfil_modo_teste_change();
