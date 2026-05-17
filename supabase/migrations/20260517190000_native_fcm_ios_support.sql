alter table public.android_fcm_tokens
  add column if not exists platform text not null default 'android';

alter table public.android_fcm_tokens
  drop constraint if exists android_fcm_tokens_platform_check;

alter table public.android_fcm_tokens
  add constraint android_fcm_tokens_platform_check
  check (platform in ('android', 'ios'));

create index if not exists idx_android_fcm_tokens_usuario_plataforma_ativo
  on public.android_fcm_tokens(usuario_id, platform, ativo);

update public.android_fcm_tokens
set platform = 'android'
where platform is null or btrim(platform) = '';
