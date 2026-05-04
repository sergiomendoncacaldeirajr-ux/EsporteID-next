-- Termos 1.5.0 e Política de Privacidade 1.3.0 (texto no app: /termos e /privacidade).

update public.documentos_legais
set ativo = false
where tipo = 'termos_uso';

update public.documentos_legais
set ativo = false
where tipo = 'politica_privacidade';

insert into public.documentos_legais (tipo, versao, notas, ativo)
values
  (
    'termos_uso',
    '1.5.0',
    $n$Painel/dashboard, desafio dedicado e radar; reservas; tempo quase real; recrutamento e vagas em formações$n$,
    true
  ),
  (
    'politica_privacidade',
    '1.3.0',
    $n$Realtime/eventos; dados do painel e sugestões; compartilhamento em equipes e notificações$n$,
    true
  )
on conflict (tipo, versao) do update set
  notas = excluded.notas,
  ativo = excluded.ativo;
