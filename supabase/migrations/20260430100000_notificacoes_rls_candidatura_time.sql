-- RLS de notificações só permitia insert com usuario_id = auth.uid().
-- Candidatura ao elenco precisa notificar o líder (e o líder precisa notificar o candidato na resposta).

create policy "notif_insert_candidatura_pedido_para_lider"
  on public.notificacoes for insert to authenticated
  with check (
    coalesce(tipo, '') = 'candidatura_time'
    and remetente_id = auth.uid()
    and referencia_id is not null
    and exists (
      select 1
      from public.times t
      inner join public.time_candidaturas c
        on c.time_id = t.id
       and c.candidato_usuario_id = auth.uid()
       and lower(trim(coalesce(c.status, ''))) = 'pendente'
      where t.criador_id = usuario_id
        and t.id = referencia_id
    )
  );

create policy "notif_insert_candidatura_resposta_lider_para_candidato"
  on public.notificacoes for insert to authenticated
  with check (
    coalesce(tipo, '') = 'candidatura_time'
    and remetente_id = auth.uid()
    and referencia_id is not null
    and exists (
      select 1
      from public.time_candidaturas c
      inner join public.times t on t.id = c.time_id
      where c.id = referencia_id
        and t.criador_id = auth.uid()
        and c.candidato_usuario_id = usuario_id
    )
  );

create policy "notif_insert_candidatura_cancelamento_para_lider"
  on public.notificacoes for insert to authenticated
  with check (
    coalesce(tipo, '') = 'candidatura_time'
    and remetente_id = auth.uid()
    and referencia_id is not null
    and exists (
      select 1
      from public.time_candidaturas c
      inner join public.times t on t.id = c.time_id
      where c.id = referencia_id
        and c.candidato_usuario_id = auth.uid()
        and t.criador_id = usuario_id
    )
  );
