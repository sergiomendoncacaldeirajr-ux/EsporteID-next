drop policy if exists "tst_read" on public.torneio_staff;
drop policy if exists "tst_organizer" on public.torneio_staff;

create policy "tst_select_access"
  on public.torneio_staff for select
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
    or (usuario_id = auth.uid() and status = 'ativo')
  );

create policy "tst_manage_organizer"
  on public.torneio_staff for all
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
  )
  with check (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
  );

drop policy if exists "tjg_read" on public.torneio_jogos;
drop policy if exists "tjg_organizer" on public.torneio_jogos;

create policy "tjg_select_access"
  on public.torneio_jogos for select
  to authenticated
  using (true);

create policy "tjg_manage_access"
  on public.torneio_jogos for all
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
    or exists (
      select 1
      from public.torneio_staff ts
      where ts.torneio_id = torneio_id
        and ts.usuario_id = auth.uid()
        and ts.papel = 'lancador_placar'
        and ts.status = 'ativo'
    )
  )
  with check (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
    or exists (
      select 1
      from public.torneio_staff ts
      where ts.torneio_id = torneio_id
        and ts.usuario_id = auth.uid()
        and ts.papel = 'lancador_placar'
        and ts.status = 'ativo'
    )
  );

drop policy if exists "tch_read" on public.torneio_chaves;
drop policy if exists "tch_organizer" on public.torneio_chaves;

create policy "tch_select_access"
  on public.torneio_chaves for select
  to authenticated
  using (
    true
  );

create policy "tch_manage_organizer"
  on public.torneio_chaves for all
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
  )
  with check (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
  );

drop policy if exists "er_own" on public.espaco_reivindicacoes;

create policy "er_select_access"
  on public.espaco_reivindicacoes for select
  to authenticated
  using (
    solicitante_id = auth.uid()
    or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
  );

create policy "er_insert_own"
  on public.espaco_reivindicacoes for insert
  to authenticated
  with check (
    solicitante_id = auth.uid()
  );

create policy "er_update_admin"
  on public.espaco_reivindicacoes for update
  to authenticated
  using (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
  );
