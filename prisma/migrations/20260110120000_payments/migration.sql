CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "amount" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "note" TEXT,
  "paidAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Payment_companyId_paidAt_idx" ON "Payment" ("companyId", "paidAt" DESC);
CREATE INDEX IF NOT EXISTS "Payment_employeeId_idx" ON "Payment" ("employeeId");
