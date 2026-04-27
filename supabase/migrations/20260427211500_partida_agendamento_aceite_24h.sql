alter table public.partidas
  add column if not exists agendamento_proposto_por uuid references public.profiles (id) on delete set null,
  add column if not exists agendamento_aceite_deadline timestamptz,
  add column if not exists agendamento_aceito_por uuid references public.profiles (id) on delete set null;

create index if not exists idx_partidas_agendamento_aceite_deadline
  on public.partidas (agendamento_aceite_deadline)
  where status = 'aguardando_aceite_agendamento';

