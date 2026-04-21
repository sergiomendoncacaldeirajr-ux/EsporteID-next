alter table public.torneio_inscricoes
  add column if not exists tipo_inscricao text not null default 'atleta',
  add column if not exists dupla_id bigint references public.duplas (id) on delete set null,
  add column if not exists time_id bigint references public.times (id) on delete set null,
  add column if not exists pagante_usuario_id uuid references public.profiles (id) on delete set null,
  add column if not exists pagamento_confirmado_em timestamptz,
  add column if not exists cancelado_em timestamptz,
  add column if not exists cancelado_por_usuario_id uuid references public.profiles (id) on delete set null,
  add column if not exists estornado_em timestamptz,
  add column if not exists substituido_por_inscricao_id bigint references public.torneio_inscricoes (id) on delete set null;

alter table public.torneio_inscricoes
  drop constraint if exists torneio_inscricoes_tipo_inscricao_ck;

alter table public.torneio_inscricoes
  add constraint torneio_inscricoes_tipo_inscricao_ck
  check (tipo_inscricao in ('atleta', 'dupla', 'time'));

create index if not exists idx_torneio_inscricoes_pagante on public.torneio_inscricoes (pagante_usuario_id);
create index if not exists idx_torneio_inscricoes_dupla on public.torneio_inscricoes (dupla_id);
create index if not exists idx_torneio_inscricoes_time on public.torneio_inscricoes (time_id);
