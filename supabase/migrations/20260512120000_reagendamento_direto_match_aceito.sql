-- Reagendamento direto de desafio aceito.
-- A logica fica no Server Action para evitar CREATE FUNCTION em runners
-- que quebram PL/pgSQL ao separar comandos por ponto e virgula.

alter table public.matches
  add column if not exists reschedule_requested_by uuid references public.profiles (id) on delete set null,
  add column if not exists reschedule_requested_at timestamptz,
  add column if not exists reschedule_kind text not null default 'cancelamento'
    check (reschedule_kind in ('cancelamento', 'direto'));
