-- Remove EID do usuário em um esporte + histórico de notas, logs de EID e linhas de ranking de desafio.
-- Necessário porque `historico_eid` e `eid_logs` não têm política de delete para o cliente.

create or replace function public.remover_usuario_eid_esporte(p_esporte_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ue_id bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_esporte_id is null or p_esporte_id <= 0 then
    raise exception 'invalid sport';
  end if;

  select ue.id
  into v_ue_id
  from public.usuario_eid ue
  where ue.usuario_id = v_uid
    and ue.esporte_id = p_esporte_id;

  if v_ue_id is null then
    return;
  end if;

  delete from public.historico_eid h
  where h.tipo_entidade = 'usuario_eid'
    and h.entidade_id = v_ue_id;

  delete from public.eid_logs el
  where el.entity_kind = 'usuario'
    and el.entity_profile_id = v_uid
    and el.esporte_id = p_esporte_id;

  delete from public.usuario_ranking_match urm
  where urm.usuario_id = v_uid
    and urm.esporte_id = p_esporte_id;

  delete from public.usuario_eid ue
  where ue.id = v_ue_id;
end;
$$;

revoke all on function public.remover_usuario_eid_esporte(bigint) from public;
grant execute on function public.remover_usuario_eid_esporte(bigint) to authenticated;

comment on function public.remover_usuario_eid_esporte(bigint) is
  'Dono remove seu usuario_eid no esporte: zera EID, histórico de notas, logs e ranking de desafio desse esporte.';
