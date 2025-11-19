# AI Prompt: Asistencia Pro (Full Stack)

Tu objetivo es recrear **Asistencia Pro**, una plataforma multiempresa para control de asistencia, sueldos y kioscos PWA. Debes entregar un proyecto funcional con las mismas características ya implementadas y considerar los pendientes listados al final.

## Stack y lineamientos

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS (mobile-first), Service Worker + manifest para PWA.
- **Backend:** Next.js API routes, repositorios SQL propios (sin Prisma) sobre PostgreSQL/Supabase. Autenticación via JWT + cookies HTTP-only.
- **Realtime:** Supabase Realtime para sincronizar kioscos.
- **Validaciones:** Zod.
- **Exportes:** PDFKit, json2csv.
- **Zona horaria fija:** `America/Santiago` en todo el backend.
- **Variables Supabase obligatorias:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Conexiones:** `src/lib/supabase.ts` expone cliente REST (`@supabase/supabase-js`) y `src/lib/db.ts` expone pool `pg` contra `SUPABASE_DB_URL`.
- **Patrón repositorios:** todos los accesos a datos viven en `src/lib/repos/*` para companies, employees, kiosk devices, employee faces, time records, reports, etc.
- **Plantilla `.env`** (carga estos valores al iniciar el proyecto):
  ```env
  DATABASE_URL="postgresql://USER.PROJECT:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?sslmode=require"
  JWT_SECRET="define-un-secreto-aqui"
  SUPABASE_URL="https://tu-proyecto.supabase.co"
  SUPABASE_ANON_KEY="tu-clave-anon"
  SUPABASE_SERVICE_ROLE_KEY="tu-clave-service-role"
  SUPABASE_DB_URL="postgresql://USER.PROJECT:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?sslmode=require"
  NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-clave-anon"
  ```
  Explica en la documentación cómo obtener cada valor desde Supabase Project Settings y recuerda que en entornos locales puedes apuntar a PostgreSQL nativo cambiando `DATABASE_URL`.

## Funcionalidades actuales que debes replicar

1. **Roles y dashboards**
   - Superadmin: gestiona empresas y admins.
   - Company admin: CRUD de trabajadores, sueldos, logos, horarios, pay settings.
   - Trabajador: panel de su jornada e historial.

2. **Kiosco PWA**
   - Autorización por PIN único por empresa; kioscos persistentes guardan token y se pueden revocar.
   - Marcaciones en flujos ordenados (entrada, inicio almuerzo, fin almuerzo, salida) con validaciones de negocio (`markEmployeeAttendance`).
   - Realtime mediante Supabase para actualizar estados y bitácora de marcaciones.
   - **Reconocimiento facial local:** cámara en el kiosco, captura y enrolamiento por trabajador, comparación offline usando `@vladmandic/face-api` + TensorFlow. Descriptores se almacenan en la tabla `EmployeeFace`.

3. **Cálculo de horas y reportes**
   - Lógica para jornadas normales, viernes y fines de semana, con pay settings configurables.
   - Reportes mensuales descargables (PDF/CSV) con horas normales/extra y montos.
   - Archivo clave: `src/lib/time-calculations.ts` (deriva valor hora, descuentos de almuerzo, factor extra).
   - Servicio `src/lib/time-records-service.ts` controla `markEmployeeAttendance` (validación de orden de marcaciones, cutoff antes de jornada con `getScheduleBoundaries`, creación/actualización `TimeRecord`).
   - Repos `src/lib/repos/time-records.ts` implementan `listTodayStatusesForCompany`, `listRecentMarksByCompany`, `createTimeRecord`, etc.

4. **Multi-tenant seguro**
   - Cada request valida `companyId` y rol antes de acceder a datos.

5. **Branding/PWA**
   - Logos por empresa, manifest, service worker, íconos listos para producción.

6. **Seeds y scripts**
   - Migraciones SQL en `prisma/migrations` (sólo archivos SQL, sin Prisma).
   - Script `npm run db:seed` para crear superadmin, empresas y trabajadores demo.

7. **Supabase nativo**
   - Conexiones REST y SQL directo (`src/lib/supabase.ts`, `src/lib/db.ts`).
   - Repositorios en `src/lib/repos` (companies, employees, kiosk devices, time records, employee faces, etc.).

## Infraestructura/Tareas técnicas clave

- Tabla `EmployeeFace` con FK a `Employee` (tipo TEXT). Endpoints `GET/POST /api/kiosk/[slug]/faces`.
- Kiosco `FaceRecognitionPanel`: carga modelos desde `public/face-models`, maneja cámara, enrolamiento y reconocimiento (bloqueos, mensajes, historial).
- Kiosk panel admin (`src/components/dashboard/KioskPanel.tsx`): muestra PIN vigente, URL, dispositivos autorizados.
- Migraciones aplicadas mediante loop `psql` (sin Prisma CLI).
- Repositorios adicionales:
  - `src/lib/repos/companies.ts`: CRUD, update del PIN, slugs/kiosk config.
  - `src/lib/repos/employees.ts`: listados activos, obtener horarios (`getEmployeeCompanyWithSchedules`), update sueldos.
  - `src/lib/repos/kiosk-devices.ts`: creación/actualización de tokens, `deleteDevice`.
  - `src/lib/repos/employee-faces.ts`: `upsertEmployeeFace`, `listFacesByCompany`.
  - `src/lib/repos/pay-settings`, `src/lib/repos/work-schedules` (para pay settings y calendarización).
- `src/lib/timezone.ts` fuerza `America/Santiago`; `src/lib/datetime.ts` tiene helpers como `startOfDayUtc`.
- `src/lib/auth.ts`: gestión JWT, `assertRole`, `getSession`.
- `src/lib/report-service.ts`: compone PDF/CSV desde los cálculos.
- Scripts npm relevantes:
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run lint`
  - `npm run db:migrate` (loop SQL)
  - `npm run db:seed`

## Pendientes / Roadmap a considerar

1. Automatizar migraciones SQL (CLI dedicado o tool en scripts).
2. Dataset/seed más amplio (historias mensuales, escenarios adicionales).
3. Optimización de consultas pesadas (RPCs, vistas materializadas).
4. Mejoras al reconocimiento facial:
   - Múltiples capturas por trabajador, métricas de intentos, logs y auditoría.
   - Flujo remoto para revisar/eliminar descriptores desde el panel.
   - Ajustes low-end (backend CPU, control de iluminación, etc.).
5. Funcionalidades roadmap del README:
   - Recuperación de contraseñas + 2FA.
   - Alertas cuando un trabajador no marca o excede horas.
   - Historial avanzado en kioscos (filtros/exports).
   - Integraciones contables.
   - Campos custom por empresa.
   - Modo offline en kioscos (cola de marcaciones).

## Entregable esperado

Un repositorio que replique fielmente todas las características listadas, con la misma organización de carpetas, endpoints y componentes. Debe incluir las migraciones SQL, assets PWA, modelos de reconocimiento facial en `public/face-models`, documentación actualizada (`README.md`, `ai.md`) y cumplir con las pruebas básicas (`npm run lint`, `npm run build`). Además, deja preparadas las tareas pendientes como issues/documentación para futuras iteraciones.

> **Nota:** No es necesario copiar literalmente la UI; lo crítico es la lógica de negocio, API, cálculos, seguridad multi-tenant y flujo completo del kiosco con reconocimiento facial local. Documenta toda configuración (env vars, scripts) para que otro agente pueda levantar la app sin depender de Prisma ni de servicios externos distintos a Supabase.
