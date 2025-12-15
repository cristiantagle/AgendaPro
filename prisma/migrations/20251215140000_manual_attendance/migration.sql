-- Panel de Marcaciones Manuales
-- Agregar campo tipoJornada a TimeRecord para soportar diferentes tipos de día

-- Crear enum para tipo de jornada
CREATE TYPE "TipoJornada" AS ENUM (
  'completa',           -- Jornada completa trabajada
  'media',              -- Media jornada
  'permiso_con_goce',   -- Permiso con goce de sueldo
  'permiso_sin_goce',   -- Permiso sin goce de sueldo
  'vacaciones',         -- Día de vacaciones
  'licencia_medica',    -- Licencia médica
  'falta'               -- Falta injustificada
);

-- Agregar columna tipoJornada a TimeRecord (default completa para registros existentes)
ALTER TABLE "TimeRecord" ADD COLUMN "tipoJornada" "TipoJornada" NOT NULL DEFAULT 'completa';
