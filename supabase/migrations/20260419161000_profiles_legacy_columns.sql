-- Campos extras do legado PHP (`usuarios`) para não perder dados na importação.
-- Opcionais e nullable; o app Next pode evoluir para expor/editar depois.

alter table public.profiles add column if not exists genero text;
alter table public.profiles add column if not exists foto_capa text;
alter table public.profiles add column if not exists altura_cm smallint;
alter table public.profiles add column if not exists peso_kg smallint;
alter table public.profiles add column if not exists lado text;
alter table public.profiles add column if not exists tempo_experiencia text;
alter table public.profiles add column if not exists tipo_perfil text;
alter table public.profiles add column if not exists status_conta text;
alter table public.profiles add column if not exists esportes_interesses text;
alter table public.profiles add column if not exists onboarding_completo boolean not null default false;
alter table public.profiles add column if not exists conta_verificada_legacy boolean not null default false;

comment on column public.profiles.conta_verificada_legacy is 'Espelho OR(verified,verificado) do MySQL; login novo usa Auth';
