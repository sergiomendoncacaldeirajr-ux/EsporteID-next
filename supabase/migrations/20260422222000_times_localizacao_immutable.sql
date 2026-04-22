create or replace function public.block_times_localizacao_update()
returns trigger
language plpgsql
as $$
begin
  if new.localizacao is distinct from old.localizacao then
    raise exception 'A localização da formação é imutável após a criação. Crie outra equipe/dupla para mudar a cidade.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_times_localizacao_update on public.times;

create trigger trg_block_times_localizacao_update
before update on public.times
for each row
execute function public.block_times_localizacao_update();

