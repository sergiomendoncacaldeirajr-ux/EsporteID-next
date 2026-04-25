alter table public.espaco_horarios_semanais
  add column if not exists liberar_professor boolean not null default false,
  add column if not exists liberar_torneio boolean not null default false,
  add column if not exists liberar_para_usuario_id uuid references public.profiles (id) on delete set null;

comment on column public.espaco_horarios_semanais.liberar_professor is
  'Quando true, a faixa pode ser usada para reserva tipo professor.';
comment on column public.espaco_horarios_semanais.liberar_torneio is
  'Quando true, a faixa pode ser usada para reserva tipo torneio.';
comment on column public.espaco_horarios_semanais.liberar_para_usuario_id is
  'Opcional: limita o uso da faixa para um usuário específico (professor/organizador).';
