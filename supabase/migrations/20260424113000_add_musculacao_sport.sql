-- Adiciona Musculação ao catálogo caso ainda não exista.
-- A governança de rank/desafio/torneio é feita em `lib/sport-capabilities.ts`.
insert into esportes (nome, slug, categoria_processamento, permite_individual, permite_dupla, permite_time, ativo)
select
  'Musculação',
  'musculacao',
  'confronto',
  false,
  false,
  false,
  true
where not exists (
  select 1
  from esportes
  where lower(nome) in ('musculação', 'musculacao')
     or lower(coalesce(slug, '')) = 'musculacao'
);
