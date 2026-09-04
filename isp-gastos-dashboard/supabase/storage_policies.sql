-- Policies del bucket privado "comprobantes".
-- Correr después de haber creado el bucket en Storage y de haber corrido schema.sql
-- (necesita la función is_admin()).

create policy "comprobantes_select_admin" on storage.objects
  for select using (bucket_id = 'comprobantes' and is_admin());

create policy "comprobantes_insert_admin" on storage.objects
  for insert with check (bucket_id = 'comprobantes' and is_admin());

create policy "comprobantes_update_admin" on storage.objects
  for update using (bucket_id = 'comprobantes' and is_admin());

create policy "comprobantes_delete_admin" on storage.objects
  for delete using (bucket_id = 'comprobantes' and is_admin());
