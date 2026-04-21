drop policy if exists "professor_solicitacoes_participantes_update" on public.professor_solicitacoes_aula;

create policy "professor_solicitacoes_professor_update"
  on public.professor_solicitacoes_aula for update to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_aula_alunos_owner_insert_update" on public.professor_aula_alunos;

create policy "professor_aula_alunos_professor_manage"
  on public.professor_aula_alunos for all to authenticated
  using (
    exists (
      select 1
      from public.professor_aulas pa
      where pa.id = professor_aula_alunos.aula_id
        and pa.professor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.professor_aulas pa
      where pa.id = professor_aula_alunos.aula_id
        and pa.professor_id = auth.uid()
    )
  );
