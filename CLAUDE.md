# CLAUDE.md — Gestor de Gastos Operativos NETINNOVADORA

## Objetivo
Reemplazar el proceso manual actual (memoria + transferencias sueltas en Mercado Pago + envío de comprobantes) por una app web donde el equipo carga los gastos operativos del mes, los marca como pagados a medida que los abonan, y Mauricio puede ver la evolución del gasto mensual con filtros por tipo, fecha y rango.

## Contexto de negocio
- Cooperativa de internet inalámbrico (NETINNOVADORA), Santa Fe.
- Gastos operativos típicos: alquileres, servicios, luz, combustible, proveedores mayoristas (ej. Gigared), soporte técnico/consultoría.
- El pago se hace en tres ventanas dentro del mes: días 1–10, 10–20 y 20–fin de mes, cada una con gastos distintos.
- Uso multiusuario: Mauricio (dueño, lleva las finanzas) y Lorena (administrativa) van a cargar/marcar pagos. El resto del equipo (técnicos de campo) no necesita acceso.

## Stack técnico
- **Frontend**: React + Vite (sin framework pesado, fácil de mantener).
- **Backend/DB**: proyecto nuevo y dedicado en **Supabase Cloud** (cuenta separada, no el Supabase self-hosted del VPS) — Postgres + Auth + Storage.
- **Storage de comprobantes**: Supabase Storage (bucket privado `comprobantes`) en ese mismo proyecto.
- **Repositorio y deploy**: código en **GitHub**, conectado a **Vercel** para build y deploy automático de la app (cada push a la rama principal dispara un deploy).
- **Dominio**: subdominio propio (ej. `finanzas.netinnovadora.com.ar`) agregado en Vercel → Domains, apuntado por DNS, para acceder por URL pública.

## Modelo de datos (Postgres / Supabase)

### `expense_types`
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| nombre | text | Alquiler, Servicios, Luz, Combustible, Proveedores, Soporte técnico, etc. |
| color | text | para diferenciar en el dashboard |

### `expense_concepts`
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| tipo_id | uuid | FK → expense_types (el concepto pertenece a un tipo) |
| nombre | text | ej. "Internet mayorista", "Alquiler oficina", "Consultoría IT" |

### `expenses`
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| tipo_id | uuid | FK → expense_types |
| concepto_id | uuid | FK → expense_concepts |
| detalle | text | opcional, para aclarar algo puntual (ej. "ajuste por suba de tarifa") |
| proveedor | text | |
| monto | numeric | |
| moneda | text | default 'ARS' |
| fecha_vencimiento | date | |
| ventana_pago | text | '1-10' / '10-20' / '20-fin', derivada de fecha_vencimiento o cargada a mano |
| estado | text | 'pendiente' / 'pagado' |
| recurrente | boolean | si se repite todos los meses |
| periodicidad | text | 'mensual', nullable si no es recurrente |
| fecha_pago | date | nullable, se completa al marcar pagado |
| comprobante_url | text | path en Supabase Storage, nullable |
| pagado_por | uuid | FK → profiles, quién lo marcó |
| mp_payment_id | text | nullable — reservado para fase 2 (Payouts de Mercado Pago), no usar todavía |
| created_at / updated_at | timestamptz | |

### `profiles` (extiende `auth.users` de Supabase)
| campo | tipo | notas |
|---|---|---|
| id | uuid | FK → auth.users |
| nombre | text | |
| rol | text | 'admin' (Mauricio) / 'empleado' (Lorena y el resto que necesite cargar gastos) |

## Autenticación
- Login y registro con **Google (cuenta de Gmail)** vía Supabase Auth (provider `google`), sin manejo propio de contraseñas.
- Flujo: pantalla de login con botón "Iniciar sesión con Google" → OAuth de Google → Supabase crea el usuario en `auth.users` en el primer ingreso (registro implícito) → se crea/actualiza automáticamente su fila en `profiles`.
- Alta de usuarios nuevos: la app tiene una pantalla de **gestión de usuarios** (ver sección de Ajustes) donde admin invita a una persona por email y le asigna su rol (`admin` o `empleado`) antes de que inicie sesión por primera vez. Si alguien intenta entrar con Google y su email no fue dado de alta ahí, queda sin rol y sin acceso a los datos.
- Configuración necesaria en Supabase: habilitar el provider Google en Authentication → Providers, y crear credenciales OAuth (Client ID/Secret) en Google Cloud Console con el redirect URI que da Supabase.
- Sesión persistente en el frontend con `supabase-js` (`onAuthStateChange`), rutas protegidas para todo lo que no sea la pantalla de login.

## Roles y permisos (Row Level Security)
- **admin** (Mauricio): permisos full — ver todos los gastos, editarlos, marcarlos como pagados, subir comprobante, borrar registros, administrar tipos de gasto, conceptos y usuarios.
- **empleado** (ej. Lorena y quien más cargue gastos): permisos restringidos — solo puede **registrar (crear)** gastos nuevos y ver el listado. No puede editar ni borrar ningún gasto ya cargado, ni marcarlo como pagado, ni subir comprobante — esas acciones quedan exclusivamente para admin.
- Nadie más tiene acceso a este proyecto (técnicos de campo quedan afuera).
- A nivel base de datos (RLS): admin tiene policies de SELECT/INSERT/UPDATE/DELETE sobre `expenses`; empleado tiene solo SELECT e INSERT (sin UPDATE ni DELETE), así la restricción no depende de que el frontend "no muestre el botón" sino que la base de datos la rechaza aunque alguien intente forzarla.
- Asignación de rol: se hace desde la pantalla de usuarios en Ajustes (no editando la tabla a mano) — admin da de alta el email de la persona junto con su rol (`admin` o `empleado`) antes de compartirle el acceso; también puede cambiar el rol de alguien ya cargado o desactivarlo.
- Solo admin puede ver y usar la gestión de usuarios; un usuario con rol empleado no tiene ninguna acción disponible sobre `profiles` más allá de leer su propio registro.

## Funcionalidades del MVP
1. **Listado de gastos** con filtros combinables: mes/año, rango de fechas, tipo de gasto, estado, ventana de pago.
2. **Alta de gasto**: elegir tipo y concepto (de los catálogos configurados en Ajustes), proveedor, monto, fecha de vencimiento, si es recurrente o no, y un campo "detalle" opcional para aclarar algo puntual.
3. **Marcar como pagado** (solo admin): cambia estado a "pagado", pide fecha de pago y permite subir el comprobante (imagen o PDF) a Supabase Storage. Los usuarios con rol empleado no ven estos controles (y la RLS los bloquea igual si se intentaran forzar).
4. **Dashboard**: gráfico de torta con la distribución del gasto por tipo del mes seleccionado, y un gráfico de evolución mensual (líneas o barras) comparando el total mes a mes.
5. **Ajustes / Configuración** (solo admin): alta, edición y baja de tipos de gasto y de conceptos (cada concepto asociado a un tipo), y gestión de usuarios — dar de alta a una persona por email asignándole rol `admin` o `empleado`, cambiar el rol de alguien ya cargado, o desactivar su acceso.
6. **Gastos recurrentes**: en el MVP, un botón "duplicar del mes anterior" en la pantalla de Gastos para no volver a tipear los que se repiten todos los meses. Automatizarlo del todo (que se generen solos el día 1) es opcional y queda para más adelante con un workflow chico en n8n, si en algún momento se vuelve tedioso hacerlo a mano.

## Fuera de alcance en el MVP (fase 2, después de validar el registro)
- Integración con la API de **Payouts de Mercado Pago** para ejecutar el pago real al proveedor y completar `mp_payment_id` automáticamente. Requiere aprobación comercial de MP y conviene arrancarla en sandbox con importes chicos.
- Recordatorios automáticos por WhatsApp (vía Evolution API / n8n) al abrir cada ventana de pago, leyendo directo de esta base.

## Diseño / UI
- Estética **minimalista**: layout limpio, mucho espacio en blanco, sin elementos decorativos que no aporten información.
- Paleta de colores acotada (2–3 colores + escala de grises), reservando color solo para diferenciar estado (pendiente/pagado) y tipo de gasto en los gráficos.
- Tipografía simple con jerarquía clara: un título por sección, números grandes para las cifras clave.
- **Menú lateral izquierdo**, simple y con pocos ítems: Dashboard, Gastos, y Ajustes (este último visible solo para admin, con las pantallas de tipos de gasto, conceptos y usuarios).
- **Dashboard principal**: arriba, las cifras clave (total del mes, total pendiente vs. pagado); debajo, dos gráficos — un **gráfico de torta** con la distribución del gasto del mes por tipo, y un gráfico de líneas/barras con la evolución del gasto total mes a mes — sin widgets ni tarjetas de relleno.
- Tabla de gastos compacta, filtros en una sola barra (mes/año, rango de fechas, tipo, estado) sin abrir modales para filtrar.
- Ajustes: pantalla simple con tres listas (tipos de gasto, conceptos y usuarios con su rol) y un formulario chico para dar de alta cada uno, sin pasos adicionales.

## Consideraciones de despliegue
- Repositorio en GitHub, **privado** (maneja datos financieros de la cooperativa).
- Conectar el repo a Vercel: cada push a la rama principal dispara un build y deploy automático del frontend (Vite).
- Variables de entorno (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) cargadas en Vercel → Project Settings → Environment Variables — nunca committeadas al repo.
- Dominio: agregar el subdominio deseado en Vercel → Domains y crear el registro CNAME correspondiente en el proveedor de DNS de NETINNOVADORA, para tener una URL pública propia en vez del dominio `.vercel.app` por defecto.
- Gastos recurrentes: el MVP lo resuelve con el botón "duplicar del mes anterior" en la propia app, sin depender de nada externo. Si más adelante se quiere automatizar del todo, se puede sumar un workflow chico en el n8n que ya tenés en el VPS (llamando a la API de este Supabase el día 1 de cada mes) — es una mejora opcional, no un requisito para que la app funcione.

## Próximos pasos sugeridos
1. Crear las tablas de este spec en el nuevo proyecto de Supabase Cloud y activar RLS según los roles.
2. Configurar el provider Google en ese proyecto (Authentication → Providers) con credenciales OAuth de Google Cloud Console.
3. Armar el frontend con Vite + React + `supabase-js`: login con Google, listado con filtros, alta de gasto, marcar pagado, dashboard y Ajustes (tipos, conceptos, usuarios).
4. Subir el proyecto a un repo de GitHub privado y conectarlo a Vercel, cargando ahí las variables de entorno.
5. Agregar el subdominio deseado en Vercel y apuntar el DNS para tener la URL pública definitiva.
6. Desde la pantalla de usuarios, dar de alta tu propio email como admin y el de Lorena (u otros) como empleado.
7. Cargar los tipos de gasto, los conceptos y los primeros gastos recurrentes del mes.
8. Probar el flujo completo de punta a punta: cargar → marcar pagado → subir comprobante → verlo reflejado en el dashboard.
9. (Opcional, más adelante) Automatizar del todo la generación de gastos recurrentes con un workflow en n8n, si el botón manual se vuelve tedioso.
10. Recién ahí evaluar la integración de Payouts de Mercado Pago (fase 2).
