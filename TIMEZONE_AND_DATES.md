# Protocolo de Manejo de Fechas y Timezones (CRÍTICO)

> **⚠ ADVERTENCIA PARA DESARROLLADORES E IAs**
> Este proyecto ha sufrido regresiones críticas debido al manejo incorrecto de zonas horarias entre Base de Datos, Servidor (Vercel) y Cliente (Navegador).
> **LEE ESTO ANTES DE TOCAR CUALQUIER LÓGICA DE FECHAS.**

## 1. El Problema Raíz
- **Vercel / Servidor:** Corre generalmente en UTC.
- **Base de Datos (Postgres/Supabase):** Columnas `DATE` o `TIMESTAMP`. El driver de Node puede devolverlas como `String` ("2026-01-01") O como `Date Object` (UTC Midnight), dependiendo de la configuración y librería.
- **Navegador (Cliente):** Corre en la zona horaria del usuario (ej. Chile UTC-3/UTC-4).
- **Javascript `Date`:**
  - `new Date("YYYY-MM-DD")` se interpreta como **UTC 00:00:00**.
  - En una zona horaria UTC-3, esto equivale al **día anterior a las 21:00:00**.
  - `date.getDate()` devolverá el día incorrecto.

## 2. Reglas de Backend (`src/lib/repos/*.ts`)
Al leer fechas de la base de datos (especialmente en consultas raw SQL):

**❌ NUNCA ASUMAS EL TIPO DE RETORNO:**
```typescript
// MAL: Asume que siempre es string
const fecha = String(row.fecha).substring(0, 10); 
// Si row.fecha es un Date object, esto retorna "Thu Jan 01..." basura.
```

**✅ SIEMPRE USA PARSEO HÍBRIDO ROBUSTO:**
```typescript
// BIEN: Maneja ambos casos
const val = row.fecha;
const fechaStr = (val instanceof Date) 
  ? val.toISOString().split('T')[0] // De Date Object a YYYY-MM-DD
  : String(val).substring(0, 10);   // De String a YYYY-MM-DD
```

## 3. Reglas de Frontend (`src/components/**/*.tsx`)
Al visualizar una fecha que viene del backend como string `YYYY-MM-DD`:

**❌ NUNCA USES EL CONSTRUCTOR DE STRING DIRECTO PARA DISPLAY:**
```typescript
// MAL: Desfase de día por zona horaria
const date = new Date("2026-01-23"); 
// En Chile (UTC-3) esto es "2026-01-22 21:00:00" -> Muestra Jueves 22.
```

**✅ USA CONSTRUCCIÓN LOCAL EXPLÍCITA:**
```typescript
// BIEN: Forzar interpretación local
const [y, m, d] = fechaStr.split('-').map(Number);
const localDate = new Date(y, m - 1, d, 12, 0, 0); // Mediodía es seguro
// O constructor simple (00:00 local)
const localDate = new Date(y, m - 1, d);
```

## 4. Archivos Críticos Parchados
Si tocas estos archivos, verifica no romper la lógica de fechas existente:
*   `src/lib/repos/time-records.ts`: `getMonthlyCalendar` usa el parseo híbrido.
*   `src/components/dashboard/ManualAttendancePanel.tsx`: `handleDayClick` y visualización de modal usan construcción local.
