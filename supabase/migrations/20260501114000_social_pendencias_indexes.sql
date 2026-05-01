-- Índices de apoio para leituras da página /comunidade e badge do footer Social.
-- Mudança segura: apenas CREATE INDEX IF NOT EXISTS (sem alterar dados).

create index if not exists idx_matches_adversario_status
  on public.matches (adversario_id, status);

create index if not exists idx_matches_usuario_status
  on public.matches (usuario_id, status);

create index if not exists idx_match_sugestoes_alvo_status
  on public.match_sugestoes (alvo_dono_id, status);

create index if not exists idx_match_sugestoes_sugeridor_status_oculto
  on public.match_sugestoes (sugeridor_id, status, oculto_sugeridor);

create index if not exists idx_time_convites_convidado_status
  on public.time_convites (convidado_usuario_id, status);

create index if not exists idx_time_convites_convidador_status
  on public.time_convites (convidado_por_usuario_id, status);

create index if not exists idx_time_candidaturas_time_status
  on public.time_candidaturas (time_id, status);

create index if not exists idx_time_candidaturas_candidato_status
  on public.time_candidaturas (candidato_usuario_id, status);

create index if not exists idx_partidas_jogador1_status
  on public.partidas (jogador1_id, status);

create index if not exists idx_partidas_jogador2_status
  on public.partidas (jogador2_id, status);

