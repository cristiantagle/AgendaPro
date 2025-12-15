-- Módulo de Combustible
-- Tablas para control de vehículos y registros de carga de combustible

-- Crear tipo enum para tipos de combustible
CREATE TYPE "FuelType" AS ENUM ('bencina_93', 'bencina_95', 'bencina_97', 'diesel', 'electrico', 'otro');

-- Tabla de Vehículos
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "anio" INTEGER,
    "tipoCombustible" "FuelType" NOT NULL DEFAULT 'bencina_95',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- Tabla de Registros de Combustible
CREATE TABLE "FuelRecord" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "vehicleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "litros" DECIMAL(10,2) NOT NULL,
    "kilometraje" INTEGER,
    "tipoCombustible" "FuelType" NOT NULL,
    "costoTotal" DECIMAL(12,2),
    "precioLitro" DECIMAL(10,2),
    "estacion" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelRecord_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE UNIQUE INDEX "Vehicle_companyId_patente_key" ON "Vehicle"("companyId", "patente");
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");
CREATE INDEX "FuelRecord_companyId_fecha_idx" ON "FuelRecord"("companyId", "fecha");
CREATE INDEX "FuelRecord_vehicleId_idx" ON "FuelRecord"("vehicleId");

-- Foreign Keys
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelRecord" ADD CONSTRAINT "FuelRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
