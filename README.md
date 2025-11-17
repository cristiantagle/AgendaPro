# Asistencia Pro

Sistema multiempresa para control de asistencia, horas extra y cálculo automático de sueldos. Incluye una Progressive Web App optimizada para móviles, backend en Next.js/TypeScript y base de datos PostgreSQL administrada con Prisma.

> Nota: toda la plataforma opera exclusivamente en la zona horaria de Chile (`America/Santiago`), por lo que no es necesario configurarla por empresa.

[![Tagle Labs](./public/tagle-labs-logo.svg)](https://github.com/)

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
- **Logos por empresa**: cada administrador puede subir el logo que aparecerá en su dashboard y kiosco.
- **Sueldo mensual configurable por trabajador**: el sistema prorratea automáticamente horas normales, extras y fines de semana en base al sueldo líquido de cada empleado.
- **PWA lista para producción**: manifest, service worker e íconos para instalar en dispositivos móviles.
- **Seeds con datos reales**: 1 superadmin, 2 empresas, administradores, trabajadores y marcaciones de ejemplo.

## Stack principal

- Next.js 16 App Router + TypeScript + Tailwind CSS (modo mobile-first).
- Prisma ORM con PostgreSQL.
- Autenticación basada en JWT con cookies HTTP-only.
- Zod para validaciones de payload.
- PDFKit y json2csv para exportes.

## Requisitos

- Node.js 20+
- PostgreSQL 14+

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

4. Genera el cliente de Prisma y aplica las migraciones:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Ejecuta los seeds (crea superadmin, empresas, trabajadores y marcaciones) y aplica las migraciones adicionales (kioscos, sueldos mensuales, logos). Si estás en PostgreSQL local, asegúrate de que el servicio esté levantado; si estás en Supabase, verifica que `DATABASE_URL` apunte al host correcto antes de ejecutar:

   ```bash
   npm run db:seed
   npx prisma migrate resolve --applied 20251219120000_kiosk_terminals
   npx prisma migrate resolve --applied 20251220110000_salary_based_pay
   npx prisma migrate resolve --applied 20251221100000_company_logo
   npx prisma migrate resolve --applied 20251222123000_remove_company_timezone
   npx prisma migrate resolve --applied 20251222130000_weekend_fixed_rates
   ```

   - Usuario superadmin: `superadmin@demo.com`
   - Contraseña de ejemplo (para todos los usuarios seed): `CambioSeguro123!`

5. Levanta la aplicación:

   ```bash
   npm run dev
   ```

La PWA estará disponible en `http://localhost:3000`. Agrega a la pantalla principal desde tu móvil para utilizarla offline.

> **Nota sobre acceso local:** Si el navegador no abre `http://localhost:3000` pero el servidor está corriendo, prueba con `http://127.0.0.1:3000` o usa la opción **Ports → Open in Browser** de VS Code. En entornos basados en WSL/containers, esa opción crea el túnel correcto automáticamente.

## Scripts útiles

| Script             | Descripción                                     |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Servidor Next.js en modo desarrollo             |
| `npm run build`    | Compila la aplicación para producción           |
| `npm run start`    | Levanta la versión compilada                    |
| `npm run lint`     | Ejecuta ESLint                                  |
| `npm run db:migrate` | Ejecuta migraciones de Prisma                |
| `npm run db:seed`  | Rellena la base de datos con datos demo         |

## Estructura relevante

- `src/app/api/*`: Route handlers para autenticación, empresas, trabajadores, marcaciones y reportes.
- `src/app/superadmin`, `src/app/empresa`, `src/app/trabajador`: Dashboards por rol.
- `src/components/dashboard/KioskPanel.tsx`, `src/components/kiosk/KioskTerminal.tsx`: experiencia de kiosco con autorización por PIN, tablets persistentes y marcaciones sin credenciales.
- `src/components/forms/CompanyLogoUploader.tsx`: carga de logotipos por empresa.
- `src/lib/time-calculations.ts`: Reglas de negocio para horas normales/extra (documentado en el código).
- `src/lib/report-service.ts`: Generación de resúmenes y exportes (PDF/CSV).
- `public/manifest.json`, `public/sw.js`, `public/icons/*`: Configuración PWA.

## Próximas mejoras sugeridas

1. **Recuperación de contraseñas y 2FA:** flujo completo para restablecer contraseñas y reforzar la seguridad con segundo factor.
2. **Alertas y notificaciones:** enviar correos o mensajes push cuando un trabajador no marca entrada/salida o acumula horas extra.
3. **Firmas y comprobantes:** permitir que los trabajadores firmen su resumen mensual o lo descarguen con firma electrónica.
4. **Sincronización contable:** exportar automáticamente los datos a ERP/contabilidad (SII, sueldo líquido, imposiciones).
5. **Reportes custom por empresa:** configurar campos adicionales por compañía (centros de costo, turnos especiales u otras etiquetas internas).
6. **Offline-first en kioscos:** almacenar temporalmente marcaciones si el kiosco pierde conexión y sincronizarlas cuando vuelva a estar en línea.

Con esto tendrás una plataforma sólida para operar hoy y con una hoja de ruta clara hacia funcionalidades más avanzadas.

## Autoría y branding

- Proyecto diseñado y desarrollado por **Cristian Tagle** bajo la marca **Tagle Labs**.
- Identidad visual (colores, logos y lineamientos) documentada en `BRANDING.md`.
- Para prensa o despliegues comerciales, utiliza los assets de `public/tagle-labs-logo.svg` y `public/tagle-labs-icon.svg`.
- Contacto directo: **WhatsApp +56 9 5680 4513** y **cristian.gonzalez.gt@gmail.com**.
