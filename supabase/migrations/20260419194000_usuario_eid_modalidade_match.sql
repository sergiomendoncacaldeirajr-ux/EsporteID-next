alter table public.usuario_eid
add column if not exists modalidade_match text not null default 'individual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuario_eid_modalidade_match_check'
  ) then
    alter table public.usuario_eid
    add constraint usuario_eid_modalidade_match_check
    check (modalidade_match in ('individual', 'dupla', 'time'));
  end if;
end $$;
