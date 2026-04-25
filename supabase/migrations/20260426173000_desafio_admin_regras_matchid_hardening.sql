-- Desafio: configuração de modo/regras de placar por esporte + vínculo forte partida->match.

alter table public.esportes
  add column if not exists desafio_modo_lancamento text not null default 'simples',
  add column if not exists desafio_regras_placar_json jsonb not null default '{}'::jsonb;

comment on column public.esportes.desafio_modo_lancamento is
  'Modo de lançamento de placar no desafio (simples, sets, games, pontos_corridos).';
comment on column public.esportes.desafio_regras_placar_json is
  'Regras de validação de placar no desafio por esporte (jsonb).';

alter table public.partidas
  add column if not exists match_id bigint references public.matches (id) on delete set null;

create index if not exists idx_partidas_match_id on public.partidas (match_id);

create or replace function public.partidas_vincular_match_default ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id bigint;
  v_p1 uuid;
  v_p2 uuid;
begin
  if new.torneio_id is not null or new.match_id is not null then
    return new;
  end if;

  v_p1 := coalesce(new.desafiante_id, new.jogador1_id, new.usuario_id);
  v_p2 := coalesce(new.desafiado_id, new.jogador2_id);

  if v_p1 is null or v_p2 is null or new.esporte_id is null then
    return new;
  end if;

  select m.id
  into v_match_id
  from public.matches m
  where m.esporte_id = new.esporte_id
    and m.finalidade = 'ranking'
    and m.status in ('Aceito', 'CancelamentoPendente', 'ReagendamentoPendente', 'Concluido')
    and (
      (m.usuario_id = v_p1 and m.adversario_id = v_p2)
      or
      (m.usuario_id = v_p2 and m.adversario_id = v_p1)
    )
  order by m.data_confirmacao desc nulls last, m.id desc
  limit 1;

  if v_match_id is not null then
    new.match_id := v_match_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_partidas_vincular_match_default on public.partidas;
create trigger tr_partidas_vincular_match_default
before insert or update on public.partidas
for each row
execute function public.partidas_vincular_match_default ();

with candidatos as (
  select
    p.id as partida_id,
    (
      select m.id
      from public.matches m
      where m.esporte_id = p.esporte_id
        and m.finalidade = 'ranking'
        and m.status in ('Aceito', 'CancelamentoPendente', 'ReagendamentoPendente', 'Concluido')
        and (
          (
            m.usuario_id = coalesce(p.desafiante_id, p.jogador1_id, p.usuario_id)
            and m.adversario_id = coalesce(p.desafiado_id, p.jogador2_id)
          )
          or
          (
            m.usuario_id = coalesce(p.desafiado_id, p.jogador2_id)
            and m.adversario_id = coalesce(p.desafiante_id, p.jogador1_id, p.usuario_id)
          )
        )
      order by m.data_confirmacao desc nulls last, m.id desc
      limit 1
    ) as match_id
  from public.partidas p
  where p.match_id is null
    and p.torneio_id is null
    and p.esporte_id is not null
)
update public.partidas p
set match_id = c.match_id
from candidatos c
where p.id = c.partida_id
  and c.match_id is not null;
