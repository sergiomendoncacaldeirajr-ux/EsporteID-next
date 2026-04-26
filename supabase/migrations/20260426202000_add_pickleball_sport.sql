-- Adiciona Pickleball ao catálogo de esportes (individual e dupla).
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
  'Pickleball',
  'pickleball',
  'individual',
  'sets',
  'confronto',
  true,
  true,
  false,
  57,
  true
where not exists (
  select 1
  from public.esportes
  where lower(coalesce(slug, '')) = 'pickleball'
     or lower(nome) in ('pickleball', 'pickeball')
);
