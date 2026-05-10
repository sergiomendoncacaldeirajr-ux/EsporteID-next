-- Alinha o catálogo PaaS aos níveis comerciais usados no wizard/admin:
-- Básico: somente reservas gratuitas para associados, sem fila e sem mensalidades.
-- Intermediário: reservas gratuitas e pagas com fila; por ser misto, exige mensalidade PaaS.
-- Completo: tudo incluso, incluindo recebimento de mensalidades.

update public.espaco_plano_mensal_plataforma
set nome = 'Básico · reservas gratuitas',
    socios_mensal_modo = 'nenhum',
    atualizado_em = now()
where espaco_generico_id is null
  and categoria_espaco = 'condominio'
  and min_unidades = 1
  and coalesce(max_unidades, -1) = 1;

update public.espaco_plano_mensal_plataforma
set nome = 'Intermediário · reservas gratuitas e pagas',
    socios_mensal_modo = 'nenhum',
    atualizado_em = now()
where espaco_generico_id is null
  and categoria_espaco = 'condominio'
  and min_unidades = 2
  and coalesce(max_unidades, -1) = 3;

update public.espaco_plano_mensal_plataforma
set nome = 'Completo · gestão total do espaço',
    socios_mensal_modo = 'disponivel',
    liberacao = 'publico',
    atualizado_em = now()
where espaco_generico_id is null
  and categoria_espaco = 'condominio'
  and min_unidades = 4
  and max_unidades is null;

update public.espaco_plano_mensal_plataforma
set nome = 'Completo · clube com mensalidades',
    socios_mensal_modo = 'disponivel',
    liberacao = 'publico',
    atualizado_em = now()
where espaco_generico_id is null
  and categoria_espaco = 'clube'
  and socios_mensal_modo in ('em_breve', 'disponivel');
