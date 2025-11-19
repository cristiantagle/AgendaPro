CREATE TABLE IF NOT EXISTS "EmployeeFace" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL UNIQUE REFERENCES "Employee"("id") ON DELETE CASCADE,
  "descriptor" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "EmployeeFace_employeeId_idx" ON "EmployeeFace" ("employeeId");
