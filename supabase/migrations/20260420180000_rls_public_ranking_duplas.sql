-- Permite que usuários autenticados vejam EIDs e elencos para perfis públicos (radar, ranking, páginas de perfil).
-- Mantém escrita restrita às políticas existentes (own).

drop policy if exists "usuario_eid_select_own" on public.usuario_eid;

create policy "usuario_eid_select_ranking_public"
  on public.usuario_eid for select
  to authenticated
  using (true);

-- Roster de times visível no perfil da formação (além da regra por membro).
drop policy if exists "mt_read_roster_public" on public.membros_time;
create policy "mt_read_roster_public"
  on public.membros_time for select
  to authenticated
  using (true);

-- Duplas cadastrais (dois atletas) visíveis para perfil público.
drop policy if exists "duplas_read_public" on public.duplas;
create policy "duplas_read_public"
  on public.duplas for select
  to authenticated
  using (true);
