-- Desempenho em listagens/contagens e fluxo de torneios: organizador pode atualizar inscrições
-- (status, pagamento) sem furar RLS; participante continua com ti_own.

-- Índices (FKs e filtros frequentes no app)
-- unique (torneio_id, usuario_id) já cobre buscas por torneio_id (prefixo B-tree)
create index if not exists idx_torneio_inscricoes_usuario on public.torneio_inscricoes (usuario_id);
create index if not exists idx_torneio_jogos_torneio on public.torneio_jogos (torneio_id);
create index if not exists idx_torneios_criador on public.torneios (criador_id);
create index if not exists idx_torneios_esporte on public.torneios (esporte_id);
create index if not exists idx_notificacoes_usuario on public.notificacoes (usuario_id);
create index if not exists idx_notificacoes_usuario_nao_lida on public.notificacoes (usuario_id) where lida = false;
create index if not exists idx_matches_adversario_status on public.matches (adversario_id, status);

-- Antes do UPDATE: impede troca de torneio/usuario; atualiza atualizado_em
create or replace function public.torneio_inscricoes_before_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.torneio_id is distinct from old.torneio_id or new.usuario_id is distinct from old.usuario_id then
    raise exception 'alteração de torneio_id ou usuario_id da inscrição não permitida';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists tr_torneio_inscricoes_before_update on public.torneio_inscricoes;
create trigger tr_torneio_inscricoes_before_update
  before update on public.torneio_inscricoes
  for each row
  execute function public.torneio_inscricoes_before_update();

-- Organizador do torneio pode atualizar linhas de inscrição (ex.: status_inscricao, payment_status)
drop policy if exists "ti_organizer_update" on public.torneio_inscricoes;
create policy "ti_organizer_update"
  on public.torneio_inscricoes for update
  to authenticated
  using (
    exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
  )
  with check (
    exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
  );

comment on policy "ti_organizer_update" on public.torneio_inscricoes is
  'Organizador altera status/pagamento; trigger bloqueia mudança de usuario_id/torneio_id.';
