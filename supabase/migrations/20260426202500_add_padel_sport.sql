-- Adiciona Padel ao catálogo de esportes (individual e dupla), usando lançador por sets.
insert into public.esportes (
  nome,
  slug,
  tipo,
  tipo_lancamento,
  categoria_processamento,
  permite_individual,
  permite_dupla,
  permite_time,
  ordem,
  ativo
)
select
  'Padel',
  'padel',
  'individual',
  'sets',
  'confronto',
  true,
  true,
  false,
  19,
  true
where not exists (
  select 1
  from public.esportes
  where lower(coalesce(slug, '')) = 'padel'
     or lower(nome) = 'padel'
);
