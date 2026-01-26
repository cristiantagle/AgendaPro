# Walkthrough: Horas Extra Manuales y Corrección de Timezones

## Resumen del Cambio
Se implementó la funcionalidad completa para registrar y visualizar horas extra de forma manual en el panel de asistencia, y se resolvieron errores críticos de visualización de datos en producción causados por inconsistencias de zona horaria.

## 1. Funcionalidad de Horas Extra
- **Base de Datos:** Nuevo campo `horasExtra` (Decimal 4,1) en tabla `TimeRecord`.
- **Backend:** API `/api/time-records/manual` y repositorio `time-records.ts` actualizados para leer/escribir este campo.
- **Frontend (`ManualAttendancePanel`):**
  - Input numérico en el modal de edición de día.
  - Indicador visual (+Xh) en el calendario.
  - Columna de resumen total en el panel lateral.
  - Inclusión en reportes (Impresión y PDF).

## 2. Solución de Bugs Críticos (Timezones)
Se detectaron y corrigieron dos problemas graves que afectaban el despliegue en Vercel:

### A. Datos Invisibles en Calendario (Backend)
- **Síntoma:** El calendario aparecía vacío en producción a pesar de existir datos en la BD.
- **Causa:** El servidor de producción (Vercel) retornaba las fechas de la consulta SQL como objetos `Date` nativos (debido al driver de Postgres), mientras que el entorno local las retornaba como `Strings`. El código original hacía `String(row.fecha).substring(...)`, lo cual corrompía los objetos Date convertidos a texto, rompiendo el mapeo de días.
- **Solución (`src/lib/repos/time-records.ts`):** Se implementó una lógica híbrida que detecta si el valor es `Date` o `String` y lo normaliza correctamente a `YYYY-MM-DD`.

### B. Fecha Incorrecta en Modal (Frontend)
- **Síntoma:** Al hacer clic en un día (ej. Viernes 23), el modal mostraba el día anterior (Jueves 22).
- **Causa:** El uso de `new Date("2026-01-23")` en el navegador del cliente interpretaba la fecha como UTC medianoche. En zonas horarias occidentales (como Chile UTC-3), esto restaba horas, cayendo al día anterior.
- **Solución (`ManualAttendancePanel.tsx`):** Se reemplazó el parseo directo por una construcción manual de fecha local (`new Date(y, m-1, d, 12, 0, 0)`), asegurando que la fecha visualizada coincida con la seleccionada.

## Archivos Clave
- `TIMEZONE_AND_DATES.md` (¡NUEVO!): Protocolo estricto para manejo de fechas.
- `src/lib/repos/time-records.ts`
- `src/components/dashboard/ManualAttendancePanel.tsx`
- `prisma/schema.prisma`

## Estado Final
- ✅ Funcionalidad implementada.
- ✅ Bug de backend corregido y validado.
- ✅ Bug de frontend corregido y validado.
- ✅ Documentación de prevención creada.
