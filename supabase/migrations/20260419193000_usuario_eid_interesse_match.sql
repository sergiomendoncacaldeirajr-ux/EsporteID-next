alter table public.usuario_eid
add column if not exists interesse_match text not null default 'ranking_e_amistoso';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuario_eid_interesse_match_check'
  ) then
    alter table public.usuario_eid
    add constraint usuario_eid_interesse_match_check
    check (interesse_match in ('ranking', 'ranking_e_amistoso'));
  end if;
end $$;
