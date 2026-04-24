-- Termos 1.4.0 e Política de Privacidade 1.2.0 (texto no app: /termos e /privacidade).
-- Garante administrador da plataforma pelo e-mail indicado (idempotente).

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
    '1.4.0',
    'Inventário de funcionalidades (agenda, painel social, push); verificação de idade e biometria; fluxos de desafio e ranking',
    true
  ),
  (
    'politica_privacidade',
    '1.2.0',
    'Push Web; dados de verificação de idade e comparação facial (Rekognition); visibilidade entre usuários e partidas',
    true
  )
on conflict (tipo, versao) do update set
  notas = excluded.notas,
  ativo = excluded.ativo;

insert into public.platform_admins (user_id)
select id
from auth.users
where lower(trim(email)) = lower(trim('sergiomendoncacaldeirajr@gmail.com'))
on conflict (user_id) do nothing;
