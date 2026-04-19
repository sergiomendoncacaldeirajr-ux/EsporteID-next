-- Termos de Uso v1.1.0 — obrigatoriedade de WhatsApp e canal principal de comunicação (texto em /termos).

update public.documentos_legais
set ativo = false
where tipo = 'termos_uso' and versao = '1.0.0';

insert into public.documentos_legais (tipo, versao, notas, ativo)
values (
  'termos_uso',
  '1.1.0',
  'Obrigatoriedade de número WhatsApp; canal principal de comunicação operacional',
  true
)
on conflict (tipo, versao) do update set
  notas = excluded.notas,
  ativo = excluded.ativo;
