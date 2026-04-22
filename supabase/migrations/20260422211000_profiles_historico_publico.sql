alter table public.profiles
add column if not exists mostrar_historico_publico boolean not null default true;

