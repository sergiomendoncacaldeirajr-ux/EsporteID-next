-- Gênero da formação para segmentação de ranking (masculino/feminino/misto).
alter table public.times
  add column if not exists genero text;

update public.times
set genero = coalesce(nullif(lower(trim(genero)), ''), 'misto')
where genero is null
   or nullif(lower(trim(genero)), '') is null;

alter table public.times
  alter column genero set default 'misto';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'times_genero_check'
  ) then
    alter table public.times
      add constraint times_genero_check
      check (lower(trim(genero)) in ('masculino', 'feminino', 'misto'));
  end if;
end
$$;
