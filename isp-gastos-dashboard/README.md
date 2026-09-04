# Gastos Operativos — NETINNOVADORA

App para cargar y controlar el pago de los gastos operativos mensuales de la cooperativa.
Ver `../CLAUDE.md` para el spec completo.

## Setup

1. Crear un proyecto en [Supabase Cloud](https://supabase.com) (cuenta dedicada, no el self-hosted del VPS).
2. En el SQL editor de ese proyecto, correr `supabase/schema.sql` (crea tablas, RLS y trigger).
3. En **Authentication → Providers**, habilitar Google e ingresar el Client ID/Secret de Google Cloud Console (con el redirect URI que da Supabase).
4. En **Storage**, crear un bucket privado llamado `comprobantes` y agregar policies para que solo admin pueda leer/escribir (ver comentario al final de `schema.sql`).
5. Copiar `.env.example` a `.env.local` y completar `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
6. Insertar tu propio email en la tabla `profiles` con `rol = 'admin'` (desde el SQL editor, una única vez, ya que todavía no hay usuarios):
   ```sql
   insert into profiles (email, nombre, rol) values ('tu-email@gmail.com', 'Tu Nombre', 'admin');
   ```
7. Instalar dependencias y levantar el proyecto:
   ```bash
   npm install
   npm run dev
   ```
8. Iniciar sesión con Google. Desde Ajustes → Usuarios podés invitar al resto del equipo.

## Deploy

Repositorio privado en GitHub conectado a Vercel. Cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Project Settings → Environment Variables de Vercel (nunca committear `.env.local`).
