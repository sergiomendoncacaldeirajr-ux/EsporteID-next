alter table public.espaco_feriados_personalizados
  add column if not exists operar_no_feriado boolean not null default false,
  add column if not exists sobrepor_grade boolean not null default true;

comment on column public.espaco_feriados_personalizados.operar_no_feriado is
  'Se true, o espaço abre nesse feriado; se false, bloqueia agenda e sobrepõe grade.';

comment on column public.espaco_feriados_personalizados.sobrepor_grade is
  'Se true, o feriado sobrepõe a grade padrão do espaço.';
