insert into public.espaco_plano_mensal_plataforma (
  espaco_generico_id,
  nome,
  categoria_espaco,
  min_unidades,
  max_unidades,
  valor_mensal_centavos,
  socios_mensal_modo,
  liberacao,
  assinatura_recorrencia_auto,
  confirmar_pagamento_automatico,
  ativo,
  ordem
)
select
  null,
  base.nome,
  categoria.categoria_espaco,
  base.min_unidades,
  base.max_unidades,
  base.valor_mensal_centavos,
  base.socios_mensal_modo,
  'publico',
  true,
  true,
  true,
  base.ordem
from (
  values
    ('Básico · reservas gratuitas', 1, 1, 4990, 'nenhum', 10),
    ('Intermediário · reservas gratuitas e pagas', 2, 3, 7990, 'nenhum', 20),
    ('Completo · gestão total do espaço', 4, null, 9990, 'disponivel', 30)
) as base(nome, min_unidades, max_unidades, valor_mensal_centavos, socios_mensal_modo, ordem)
cross join (
  values ('quadra'), ('centro_esportivo'), ('outro')
) as categoria(categoria_espaco)
where not exists (
  select 1
  from public.espaco_plano_mensal_plataforma p
  where p.espaco_generico_id is null
    and p.categoria_espaco = categoria.categoria_espaco
    and p.min_unidades = base.min_unidades
    and coalesce(p.max_unidades, -1) = coalesce(base.max_unidades, -1)
);
