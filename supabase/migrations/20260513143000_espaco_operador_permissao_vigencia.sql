alter table public.espaco_horarios_semanais
  add column if not exists vigencia_inicio date,
  add column if not exists vigencia_fim date;

comment on column public.espaco_horarios_semanais.vigencia_inicio is
  'Data inicial da liberação de professor/organizador para usar a faixa semanal.';

comment on column public.espaco_horarios_semanais.vigencia_fim is
  'Data final da liberação de professor/organizador; nulo significa prazo indeterminado.';

create index if not exists idx_espaco_horarios_semanais_operador_vigencia
  on public.espaco_horarios_semanais (
    espaco_generico_id,
    liberar_para_usuario_id,
    espaco_unidade_id,
    dia_semana,
    vigencia_inicio,
    vigencia_fim
  );
