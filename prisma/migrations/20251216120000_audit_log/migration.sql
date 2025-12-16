-- Add AuditLog table for tracking changes to TimeRecord
CREATE TABLE "AuditLog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID,
    "userName" VARCHAR(255),
    "action" VARCHAR(50) NOT NULL,
    "tableName" VARCHAR(50) NOT NULL,
    "recordId" UUID NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries by recordId
CREATE INDEX "idx_auditlog_recordid" ON "AuditLog" ("recordId");

-- Index for faster queries by tableName and createdAt
CREATE INDEX "idx_auditlog_table_date" ON "AuditLog" ("tableName", "createdAt" DESC);
