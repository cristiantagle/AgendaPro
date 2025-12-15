# Changelog - AsistenciaPro

Todos los cambios notables del proyecto están documentados aquí.

---

## [2025-12-15] - Módulo Combustible + Asistencia Manual

### ✨ Nuevas Funcionalidades

#### Módulo de Combustible
- **Gestión de vehículos:** CRUD completo con patente, marca, modelo, año y tipo de combustible
- **Registro de cargas:** Litros, costo, odómetro, fecha, notas
- **Estadísticas:** Total vehículos, cargas del mes, costo total
- **UI:** Nueva sección "Combustible" en dashboard de empresa

#### Panel de Asistencia Manual
- **Calendario mensual:** Vista compacta con colores por tipo de jornada
- **7 tipos de jornada:**
  - Jornada Completa (factor 1.0)
  - Media Jornada (factor 0.5)
  - Permiso con Goce (factor 1.0)
  - Permiso sin Goce (factor 0.0)
  - Vacaciones (factor 1.0)
  - Licencia Médica (factor 1.0)
  - Falta (factor 0.0)
- **Cálculo automático:** Sueldo proporcional según días pagados
- **Reporte imprimible:** Detalle completo del mes con cálculos
- **Eliminar registros:** Botón para borrar marcaciones

### 🐛 Correcciones

- **Fix crítico de timezone:** Corregido desfase de 1 día en calendario
  - Causa: `new Date("YYYY-MM-DD")` parseaba como UTC
  - Solución: Extraer día directamente del string sin usar Date

### 🔧 Cambios Técnicos

- **Actualizado Next.js:** Parche de seguridad CVE-2025-66478
- **Instalado lucide-react:** Iconos para nueva UI
- **Nuevas migraciones SQL:**
  - `20251215120000_fuel_module`
  - `20251215140000_manual_attendance`

---

## [Anterior] - Funcionalidades Base

- Sistema de kiosco biométrico
- Gestión de trabajadores
- Marcación de entrada/salida/almuerzo
- Reportes mensuales
- Pagos y adelantos
- Configuración de horarios

