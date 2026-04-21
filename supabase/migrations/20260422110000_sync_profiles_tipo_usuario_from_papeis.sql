-- Torna usuario_papeis a fonte de verdade dos papéis e mantém profiles.tipo_usuario
-- apenas como coluna legada/somente leitura para compatibilidade.

create or replace function public.profile_tipo_usuario_from_papeis(p_usuario_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select
    case
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'espaco'
      ) then 'espaco'
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'organizador'
      ) then 'organizador'
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'professor'
      ) then 'professor'
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'atleta'
      ) then 'atleta'
      else 'atleta'
    end;
$$;

create or replace function public.sync_profile_tipo_usuario_from_papeis()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_usuario_id uuid;
begin
  v_usuario_id := coalesce(new.usuario_id, old.usuario_id);

  if v_usuario_id is null then
    return coalesce(new, old);
  end if;

  update public.profiles
  set
    tipo_usuario = public.profile_tipo_usuario_from_papeis(v_usuario_id),
    atualizado_em = now()
  where id = v_usuario_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_sync_profile_tipo_usuario_from_papeis on public.usuario_papeis;

create trigger tr_sync_profile_tipo_usuario_from_papeis
after insert or update or delete on public.usuario_papeis
for each row
execute function public.sync_profile_tipo_usuario_from_papeis();

update public.profiles p
set
  tipo_usuario = public.profile_tipo_usuario_from_papeis(p.id),
  atualizado_em = now();
