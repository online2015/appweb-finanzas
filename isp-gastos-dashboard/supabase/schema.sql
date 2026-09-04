-- NETINNOVADORA — Gestor de Gastos Operativos
-- Ejecutar en el SQL editor del proyecto de Supabase Cloud dedicado a esta app.

create extension if not exists "pgcrypto";

-- ============ TABLAS ============

-- id es interno y estable; user_id se completa recién cuando la persona
-- inicia sesión por primera vez con Google (permite invitar por email antes
-- de que exista el usuario en auth.users).
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  email text not null unique,
  nombre text,
  rol text not null check (rol in ('admin', 'empleado')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expense_types (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  color text not null default '#64748b',
  created_at timestamptz not null default now()
);

create table if not exists expense_concepts (
  id uuid primary key default gen_random_uuid(),
  tipo_id uuid not null references expense_types (id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (tipo_id, nombre)
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  tipo_id uuid not null references expense_types (id),
  concepto_id uuid not null references expense_concepts (id),
  detalle text,
  proveedor text,
  monto numeric(12, 2) not null check (monto > 0),
  moneda text not null default 'ARS',
  fecha_vencimiento date not null,
  ventana_pago text not null check (ventana_pago in ('1-10', '10-20', '20-fin')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  recurrente boolean not null default false,
  periodicidad text check (periodicidad in ('mensual')),
  fecha_pago date,
  comprobante_url text,
  pagado_por uuid references profiles (id),
  mp_payment_id text,
  creado_por uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_fecha_vencimiento_idx on expenses (fecha_vencimiento);
create index if not exists expenses_estado_idx on expenses (estado);
create index if not exists expenses_tipo_idx on expenses (tipo_id);

-- ============ HELPER: rol del usuario actual ============

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

-- ============ RLS ============

alter table profiles enable row level security;
alter table expense_types enable row level security;
alter table expense_concepts enable row level security;
alter table expenses enable row level security;

-- profiles: cualquier usuario dado de alta (con fila en profiles) puede ver su propio perfil
-- y el de los demás (necesario para saber quién pagó, mostrar nombres, etc).
-- Alguien que inicia sesión con Google pero no fue invitado no tiene fila -> no ve nada.
create policy "profiles_select_authenticated" on profiles
  for select using (current_user_rol() is not null);

create policy "profiles_insert_admin" on profiles
  for insert with check (is_admin());

create policy "profiles_update_admin" on profiles
  for update using (is_admin());

create policy "profiles_delete_admin" on profiles
  for delete using (is_admin());

-- expense_types / expense_concepts: lectura para cualquier usuario dado de alta, escritura solo admin
create policy "expense_types_select" on expense_types
  for select using (auth.uid() is not null and current_user_rol() is not null);

create policy "expense_types_write_admin" on expense_types
  for all using (is_admin()) with check (is_admin());

create policy "expense_concepts_select" on expense_concepts
  for select using (auth.uid() is not null and current_user_rol() is not null);

create policy "expense_concepts_write_admin" on expense_concepts
  for all using (is_admin()) with check (is_admin());

-- expenses: admin full CRUD; empleado solo SELECT + INSERT (sin marcar pagado/editar/borrar)
create policy "expenses_select_all" on expenses
  for select using (current_user_rol() in ('admin', 'empleado'));

create policy "expenses_insert_all" on expenses
  for insert with check (current_user_rol() in ('admin', 'empleado'));

create policy "expenses_update_admin" on expenses
  for update using (is_admin());

create policy "expenses_delete_admin" on expenses
  for delete using (is_admin());

-- ============ TRIGGER: crear/actualizar profile al hacer login con Google ============
-- Nota: no asigna rol. El admin debe dar de alta el email en la tabla profiles
-- (desde la pantalla de Usuarios) ANTES de que la persona inicie sesión, con el
-- id todavía nulo. Este trigger sólo completa el id cuando el email coincide.

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- Es solo un helper de trigger: no tiene uso legítimo llamado directamente,
-- así que se le saca la exposición como RPC público (no afecta al trigger).
revoke execute on function handle_new_auth_user() from public, anon, authenticated;

-- ============ STORAGE ============
-- Crear manualmente en Supabase Storage un bucket privado llamado "comprobantes".
-- Policies sugeridas (Storage > comprobantes > Policies):
--   SELECT/INSERT/UPDATE/DELETE solo si auth.uid() está en profiles con rol admin.
