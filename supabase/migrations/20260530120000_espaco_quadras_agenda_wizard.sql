alter table public.espaco_unidades
  add column if not exists modo_reserva text not null default 'herdar',
  add column if not exists intervalo_minutos integer not null default 60,
  add column if not exists configuracao_agenda_json jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'espaco_unidades_modo_reserva_ck'
  ) then
    alter table public.espaco_unidades
      add constraint espaco_unidades_modo_reserva_ck
      check (modo_reserva in ('herdar', 'gratuita', 'paga', 'mista'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'espaco_unidades_intervalo_minutos_ck'
  ) then
    alter table public.espaco_unidades
      add constraint espaco_unidades_intervalo_minutos_ck
      check (intervalo_minutos between 15 and 360);
  end if;
end $$;

alter table public.espaco_feriados_personalizados
  add column if not exists hora_inicio time,
  add column if not exists hora_fim time;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'espaco_feriados_personalizados_horario_ck'
  ) then
    alter table public.espaco_feriados_personalizados
      add constraint espaco_feriados_personalizados_horario_ck
      check (hora_inicio is null or hora_fim is null or hora_fim > hora_inicio);
  end if;
end $$;

comment on column public.espaco_unidades.modo_reserva is
  'Regra de reserva da unidade no wizard: herdar, gratuita, paga ou mista.';
comment on column public.espaco_unidades.intervalo_minutos is
  'Intervalo padrão dos horários gerados para esta unidade.';
comment on column public.espaco_unidades.configuracao_agenda_json is
  'Preferências do wizard para montagem da agenda da unidade.';
comment on column public.espaco_feriados_personalizados.hora_inicio is
  'Horário de abertura quando o espaço operar no feriado.';
comment on column public.espaco_feriados_personalizados.hora_fim is
  'Horário de fechamento quando o espaço operar no feriado.';
