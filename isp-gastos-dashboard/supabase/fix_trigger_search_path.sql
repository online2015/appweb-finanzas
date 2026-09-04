-- Fix: las funciones SECURITY DEFINER no encontraban la tabla "profiles"
-- porque heredaban el search_path del contexto que las llama (schema auth),
-- que no incluye "public". Se agrega "set search_path = public" a cada una.

create or replace function current_user_rol()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select rol from profiles where user_id = auth.uid() and activo;
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select rol from profiles where user_id = auth.uid() and activo) = 'admin', false);
$$;

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set user_id = new.id, updated_at = now()
  where email = new.email and user_id is distinct from new.id;
  return new;
end;
$$;
