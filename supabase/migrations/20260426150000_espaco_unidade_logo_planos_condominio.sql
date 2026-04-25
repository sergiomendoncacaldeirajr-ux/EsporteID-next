-- Logo/foto por unidade (quadra) e rótulos de plano PaaS para condomínio (Básico / Intermediário / Avançado).

alter table public.espaco_unidades
  add column if not exists logo_arquivo text;

comment on column public.espaco_unidades.logo_arquivo is
  'URL pública (storage) da foto ou logo da quadra/unidade.';

comment on column public.espacos_genericos.paas_primeiro_pagamento_mensal_recebido_em is
  'Primeiro pagamento recebido (Asaas) da mensalidade PaaS — exigido em reservas 100% gratuitas e em modo monetização mensalidade_plataforma antes de criar quadras/grade.';

update public.espaco_plano_mensal_plataforma
set nome = 'Básico · até 1 quadra/unidade',
    atualizado_em = now()
where espaco_generico_id is null
  and categoria_espaco = 'condominio'
  and min_unidades = 1
  and coalesce(max_unidades, -1) = 1;

update public.espaco_plano_mensal_plataforma
set nome = 'Intermediário · até 3 quadras/unidades',
    atualizado_em = now()
where espaco_generico_id is null
  and categoria_espaco = 'condominio'
  and min_unidades = 2
  and coalesce(max_unidades, -1) = 3;

update public.espaco_plano_mensal_plataforma
set nome = 'Avançado · 4 ou mais quadras/unidades',
    atualizado_em = now()
where espaco_generico_id is null
  and categoria_espaco = 'condominio'
  and min_unidades = 4
  and max_unidades is null;
