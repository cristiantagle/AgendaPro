-- Agregar valor 'feriado' al enum TipoJornada
-- Los feriados se pagan como día completo según ley chilena

ALTER TYPE "TipoJornada" ADD VALUE 'feriado';
