# Asistencia Pro

Sistema multiempresa para control de asistencia, horas extra y cálculo automático de sueldos. Incluye una Progressive Web App optimizada para móviles, backend en Next.js/TypeScript y base de datos PostgreSQL operada directamente vía Supabase (sin Prisma).

> Prisma fue removido completamente del proyecto; todas las consultas y migraciones se realizan con SQL/raw repos y Supabase.

> Nota: toda la plataforma opera exclusivamente en la zona horaria de Chile (`America/Santiago`), por lo que no es necesario configurarla por empresa.

[![Tagle Labs](./public/tagle-labs-logo.svg)](https://github.com/)

## Estado actual

- Migración completa a Supabase (DB, Realtime y seed scripts) con despliegue en Vercel funcionando.
- Kiosco PWA con autorización persistente, bloqueo de botones, contadores en vivo y bitácora de marcaciones recientes.
- Panel de empresa con creación/edición de trabajadores, actualización de sueldos y ahora activación/desactivación sin eliminar registros.
- Rediseño completo "glassmorphism" tanto en el dashboard de empresa como en el kiosco, con overlays, ruido y animaciones coherentes en toda la app.
- Selector de tema en dashboard: Cinemático (default), Claro y Minimal (sin blur ni sombras). El kiosco siempre usa el tema cinematográfico para asegurar contraste en tablets.

## Release estable 1.0

Esta versión en producción queda marcada como **release 1.0** y se considera estable. Incluye:

- Kioscos sincronizados en tiempo real (Supabase Realtime + service worker optimizado).
- Control completo de horarios, sueldos y pay settings desde el dashboard (sin tocar código).
- Branding, PWA y despliegue productivo listo para clientes finales bajo la marca Tagle Labs.

## Novedades recientes (noviembre 2025)

- **UI Cinemática unificada:** dashboard de empresa, kiosco y formularios principales adoptan la estética “Cinematic Dark Glassmorphism” (Inter + JetBrains Mono, blobs, ruido y neon glows).
- **Kiosco biométrico reforzado:** el flujo ahora exige desbloquear acciones con reconocimiento facial antes de permitir marcaciones o modo administrador, y cada acción muestra feedback en tarjetas translúcidas.
- **Modelos empaquetados y logs mejorados:** los modelos face-api se sirven desde `public/face-models` con índices y botones de “copiar” para URL/PIN, y se documentaron los pasos para depurar la carga en tablets con hardware limitado.
- **Documentación ampliada:** README y `ai.md` incluyen instrucciones para operar el kiosco, enrolar rostros (incluidos administradores existentes) y reproducir todo el stack sin Prisma.
- **Exportes con deducciones:** los reportes mensuales (PDF/CSV) ahora muestran monto bruto, adelantos/quincenas y el total neto a pagar; el PDF incluye detalle de pagos deducibles con fecha/tipo/nota.
- **Dashboard con menú colapsable:** el panel de empresa suma un sidebar hamburguesa (mobile/desktop) con scroll a secciones clave (pagos, kiosco, horarios, reportes) para limpiar la vista principal.

## Características

- **Roles separados**: superadmin, administrador de empresa y trabajador.
- **Multi-tenant seguro**: cada solicitud valida `company_id` y rol antes de acceder a datos.
- **Marcaciones completas**: entrada, inicio/fin almuerzo y salida con validaciones de flujo.
- **Cálculo de horas**:
  - Jornadas L–J (9 horas pagadas) y viernes (8 horas) calculadas con sueldo base y factor de hora extra.
  - Fines de semana con lógica separada: defines cuánto paga cada día trabajado y cuánto paga cada hora extra y esos montos se suman directamente al total mensual.
  - Descuento automático de 1 hora no pagada para almuerzo.
  - Reportes mensuales con horas normales, extra y montos. El valor hora se deriva automáticamente desde el sueldo mensual configurado.
- **Exportaciones**: reportes mensuales descargables en PDF o CSV.
- **Terminales de marcación (kiosco)**: cada empresa posee una URL/pin únicos y puede autorizar tablets permanentes.
- **Reconocimiento facial local**: el kiosco identifica trabajadores con la cámara de la tablet sin APIs externas; las plantillas se guardan como descriptores matemáticos por empleado.
- **Logos por empresa**: cada administrador puede subir el logo que aparecerá en su dashboard y kiosco.
- **Sueldo mensual configurable por trabajador**: el sistema prorratea automáticamente horas normales, extras y fines de semana en base al sueldo líquido de cada empleado.
- **PWA lista para producción**: manifest, service worker e íconos para instalar en dispositivos móviles.
- **Seeds con datos reales**: 1 superadmin, 2 empresas, administradores, trabajadores y marcaciones de ejemplo.

## Stack principal

- Next.js 16 App Router + TypeScript + Tailwind CSS (modo mobile-first).
- Supabase (REST + SQL directo) sobre PostgreSQL, sin Prisma.
- Autenticación basada en JWT con cookies HTTP-only.
- Zod para validaciones de payload.
- PDFKit y json2csv para exportes.

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- Para elegir tema en el dashboard usa el selector en la barra superior. Minimal desactiva blur/sombras para equipos con menos recursos. El kiosco permanece siempre en modo cinematográfico (sin selector).

## Configuración

1. Copia el archivo de variables de entorno y ajusta los valores:

   ```bash
   cp .env.example .env
   ```

2. Define la base de datos a utilizar:

   - **Modo local (recomendado para desarrollo actual):**
     - Instala PostgreSQL (Ubuntu) con `sudo apt-get install postgresql postgresql-contrib`.
     - Asegúrate de levantar el servicio: `sudo systemctl enable --now postgresql`.
     - Cambia la contraseña del usuario `postgres` si es necesario:

       ```bash
       sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'TuPasswordSeguro';"
       ```

     - Deja en `.env`:

       ```env
       DATABASE_URL="postgresql://postgres:TuPasswordSeguro@localhost:5432/postgres"
       ```

   - **Modo Supabase:** usa la cadena que aparece en Project Settings → Database → Connection string (URI). Si te conectas desde una red sólo IPv4, copia la URL del *Session pooler* (`...:6543/postgres?pgbouncer=true`).

3. Instala dependencias:

   ```bash
   npm install
   ```

4. Configura también las variables públicas que consumirá el kiosco para el cliente Realtime:

   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-clave-anon"
   ```

   > En Supabase habilita **Database → Replication → Realtime** para la tabla `TimeRecord`, así los kioscos reciben las marcaciones al instante.

5. Aplica las migraciones SQL directamente en tu base (local o Supabase). Un ejemplo rápido:

   ```bash
   set -a && source .env && set +a
   for file in prisma/migrations/*/migration.sql; do
     echo "Aplicando $file"
     psql "$DATABASE_URL" -f "$file"
   done
   ```

6. Ejecuta el seed (crea superadmin, empresas y trabajadores demo):

   ```bash
   npm run db:seed
   ```

   > Si tu entorno muestra `self-signed certificate in certificate chain`, puedes exportar temporalmente `NODE_TLS_REJECT_UNAUTHORIZED=0` (el script ya lo hace automáticamente).

   - Usuario superadmin: `superadmin@demo.com`
   - Contraseña de ejemplo (para todos los usuarios seed): `CambioSeguro123!`

7. Levanta la aplicación:

   ```bash
   npm run dev
   ```

La PWA estará disponible en `http://localhost:3000`. Agrega a la pantalla principal desde tu móvil para utilizarla offline.

8. (Opcional) Para habilitar el reconocimiento facial en kioscos, aplica las migraciones para crear la tabla `EmployeeFace` y luego registra rostros desde el panel “Reconocimiento facial” dentro del propio kiosco (sección visible tras autorizar la tablet). No se suben fotografías: sólo se almacenan descriptores en tu base Supabase.

> **Nota sobre acceso local:** Si el navegador no abre `http://localhost:3000` pero el servidor está corriendo, prueba con `http://127.0.0.1:3000` o usa la opción **Ports → Open in Browser** de VS Code. En entornos basados en WSL/containers, esa opción crea el túnel correcto automáticamente.

## Scripts útiles

| Script             | Descripción                                     |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Servidor Next.js en modo desarrollo             |
| `npm run build`    | Compila la aplicación para producción           |
| `npm run start`    | Levanta la versión compilada                    |
| `npm run lint`     | Ejecuta ESLint                                  |
| `npm run db:migrate` | Aplica las migraciones SQL secuenciales (sin Prisma) |
| `npm run db:seed`  | Rellena la base de datos con datos demo         |

## Flujo estándar (antes de push)

1. Instala dependencias si es la primera vez: `npm install`.
2. Corre el linter siempre: `npm run lint`.
3. Ejecuta los tests: `npm test`.
4. Verifica la compilación: `npm run build`.
5. Revisa y commitea: `git status`, `git add ...`, `git commit -m "..."` y `git push`.

Siempre sigue estos pasos antes de cualquier push/PR para mantener el repo limpio, compilable y versionado.

### Hook pre-push (automático)

- Usa el hook incluido para que no se pueda hacer `git push` sin pasar lint/test/build:
  - Configura una vez: `npm run setup:hooks`.
  - El hook ejecuta `npm run prepush` (lint + test + build) antes de cada push.
  - Si falla algo, se cancela el push y puedes corregir.

## Estructura relevante

- `src/app/api/*`: Route handlers para autenticación, empresas, trabajadores, marcaciones y reportes.
- `src/app/superadmin`, `src/app/empresa`, `src/app/trabajador`: Dashboards por rol.
- `src/components/dashboard/KioskPanel.tsx`, `src/components/kiosk/KioskTerminal.tsx`: experiencia de kiosco con autorización por PIN, tablets persistentes y marcaciones sin credenciales.
- `src/components/forms/CompanyLogoUploader.tsx`: carga de logotipos por empresa.
- `src/lib/time-calculations.ts`: Reglas de negocio para horas normales/extra (documentado en el código).
- `src/lib/report-service.ts`: Generación de resúmenes y exportes (PDF/CSV).
- `public/manifest.json`, `public/sw.js`, `public/icons/*`: Configuración PWA.

## Próximos pasos sugeridos

1. **Recuperación de contraseñas y 2FA:** flujo completo para restablecer claves y agregar segundo factor a admins/trabajadores.
2. **Alertas proactivas:** correo o push cuando un trabajador no marca entrada/salida o supera las horas configuradas.
3. **Historial avanzado en kioscos:** filtros por día/turno y exportar las últimas marcaciones directamente desde la tablet.
4. **Integraciones contables:** exportar automáticamente datos a ERP/contabilidad (SII, libro de remuneraciones, imposiciones).
5. **Campos custom por empresa:** permitir turnos especiales, ubicaciones o centros de costo definidos por cada cliente.
6. **Modo offline en kioscos:** cachear marcaciones cuando no haya red y sincronizarlas al recuperar conexión.
7. **Enrolamiento nativo para administradores:** exponer un flujo UI que permita registrar rostros de `company_admin` sin pasos manuales ni cambios temporales de rol.

Con esto tendrás una plataforma sólida para operar hoy y con una hoja de ruta clara hacia funcionalidades más avanzadas.

## Supabase nativo (sin Prisma)

El proyecto ya opera 100% sin Prisma: no quedan dependencias, migraciones ni clientes ORM. Toda la persistencia usa repositorios SQL propios y los SDK/REST de Supabase.

### Implementado

- Variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_DB_URL` listas en `.env` / `.env.example`.
- Utilidades dedicadas para REST (`@supabase/supabase-js`) y SQL directo (`pg` vía pooler) en `src/lib/supabase.ts` y `src/lib/db.ts`.
- Repositorios (`src/lib/repos`) para usuarios, empleados, empresas, kioscos y marcaciones; todos los endpoints y páginas consumen esas capas sin Prisma.
- Migraciones SQL aplicadas con `psql` sobre Supabase y seed (`npm run db:seed`) que usa los repositorios/SQL nativos.

### Próximos pasos

1. **Automatizar las migraciones SQL:** hoy se aplican con el loop de `psql`. Puedes empaquetarlo mejor en `npm run db:migrate` (ordenar los archivos, validar estado) o usar la UI/Tunnels de Supabase.
2. **Datasets adicionales:** el seed actual carga datos mínimos. Para escenarios históricos o masivos, agrega scripts en `scripts/` reutilizando los repos existentes.
3. **Optimización/pooling:** las consultas pesadas (reportes grandes) podrían moverse a RPCs, funciones SQL o vistas materializadas para reducir latencia futura.

## Reconocimiento facial en kioscos

- La sección “Reconocimiento facial” ya viene integrada en el kiosco (`/terminal/[slug]`). Tras autorizar la tablet con el PIN, puedes:
  1. Seleccionar al trabajador en la lista principal.
  2. Posicionarlo frente a la cámara y presionar **Guardar rostro** para generar su descriptor.
  3. Usar **Identificar trabajador** para que el kiosco seleccione automáticamente al colaborador con mayor coincidencia.
- Todos los cálculos se ejecutan localmente en el navegador con `@vladmandic/face-api` y modelos empaquetados en `public/face-models`, por lo que no depende de APIs externas ni envíos de fotografías. Sólo se almacenan descriptores numéricos en la tabla `EmployeeFace`.
- Puedes refrescar o regenerar rostros en cualquier momento; cada trabajador mantiene un único descriptor activo y se puede reentrenar directamente desde la tablet.

### Flujo para enrolar administradores existentes

1. **Asegura que el administrador tenga registro en `Employee`:**
   ```sql
   INSERT INTO "Employee"
     ("id","companyId","userId","nombreCompleto","rut","valorHoraBase","isActive","createdAt","updatedAt")
   SELECT
     gen_random_uuid(),
     "companyId",
     "id",
     'Nombre del Admin',
     NULL,
     NULL,
     true,
     NOW(),
     NOW()
   FROM "User"
   WHERE "email" = 'admin@empresa.cl';
   ```
2. **Primer enrolamiento:** si todavía no hay ningún rostro guardado para ese admin, cámbiale temporalmente el `role` a `worker`, selecciónalo en la lista del kiosco y pulsa **Guardar rostro**. Una vez grabado, vuelve a dejar su `role` en `company_admin`.
3. **Desbloqueo posterior:** con el descriptor ya almacenado, bastará con que mire la cámara en “Paso 1 · Escaneo” para activar el modo administrador y enrolar a otros trabajadores desde la tablet.

## Autoría y branding

- Proyecto diseñado y desarrollado por **Cristian Tagle** bajo la marca **Tagle Labs**.
- Identidad visual (colores, logos y lineamientos) documentada en `BRANDING.md`.
- Para prensa o despliegues comerciales, utiliza los assets de `public/tagle-labs-logo.svg` y `public/tagle-labs-icon.svg`.
- Contacto directo: **WhatsApp +56 9 5680 4513** y **cristian.gonzalez.gt@gmail.com**.
