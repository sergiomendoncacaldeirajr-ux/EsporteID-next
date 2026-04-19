-- Buckets usados pelo app (upload de avatar, logos e documentos de espaço).
-- Rode no projeto Supabase após aplicar migrations locais.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
  ),
  (
    'espaco-logos',
    'espaco-logos',
    true,
    5242880,
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
  ),
  (
    'espaco-documentos',
    'espaco-documentos',
    false,
    15728640,
    array[
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/octet-stream'
    ]::text[]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública dos buckets públicos
drop policy if exists "storage_avatars_select_public" on storage.objects;
create policy "storage_avatars_select_public"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "storage_espaco_logos_select_public" on storage.objects;
create policy "storage_espaco_logos_select_public"
on storage.objects for select
to public
using (bucket_id = 'espaco-logos');

-- Upload apenas na pasta do próprio usuário (primeiro segmento do path = uuid)
drop policy if exists "storage_avatars_insert_own" on storage.objects;
create policy "storage_avatars_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_avatars_update_own" on storage.objects;
create policy "storage_avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_avatars_delete_own" on storage.objects;
create policy "storage_avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_logos_insert_own" on storage.objects;
create policy "storage_espaco_logos_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'espaco-logos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_logos_update_own" on storage.objects;
create policy "storage_espaco_logos_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'espaco-logos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'espaco-logos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_logos_delete_own" on storage.objects;
create policy "storage_espaco_logos_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'espaco-logos'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Documentos: leitura só do dono do path (admin pode estender depois)
drop policy if exists "storage_espaco_docs_select_own" on storage.objects;
create policy "storage_espaco_docs_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_docs_insert_own" on storage.objects;
create policy "storage_espaco_docs_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_docs_update_own" on storage.objects;
create policy "storage_espaco_docs_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_docs_delete_own" on storage.objects;
create policy "storage_espaco_docs_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
);
