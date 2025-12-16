import crypto from "node:crypto";

import { runQuery, runSingle } from "@/lib/db";

export type AuditLog = {
    id: string;
    userId: string | null;
    userName: string | null;
    action: "CREATE" | "UPDATE" | "DELETE";
    tableName: string;
    recordId: string;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    createdAt: Date;
};

const mapAuditLog = (row: Record<string, unknown>): AuditLog => ({
    id: row.id as string,
    userId: (row.userId as string) ?? null,
    userName: (row.userName as string) ?? null,
    action: row.action as AuditLog["action"],
    tableName: row.tableName as string,
    recordId: row.recordId as string,
    oldValues: row.oldValues ? (row.oldValues as Record<string, unknown>) : null,
    newValues: row.newValues ? (row.newValues as Record<string, unknown>) : null,
    createdAt: new Date(row.createdAt as string),
});

/**
 * Log an audit entry for tracking changes
 */
export const logAuditEntry = async (params: {
    userId?: string;
    userName?: string;
    action: AuditLog["action"];
    tableName: string;
    recordId: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
}): Promise<AuditLog | null> => {
    const row = await runSingle<Record<string, unknown>>(
        `INSERT INTO "AuditLog" 
            ("id", "userId", "userName", "action", "tableName", "recordId", "oldValues", "newValues", "createdAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
         RETURNING *`,
        [
            crypto.randomUUID(),
            params.userId ?? null,
            params.userName ?? null,
            params.action,
            params.tableName,
            params.recordId,
            params.oldValues ? JSON.stringify(params.oldValues) : null,
            params.newValues ? JSON.stringify(params.newValues) : null,
        ]
    );
    return row ? mapAuditLog(row) : null;
};

/**
 * Get audit log entries for a specific record
 */
export const getAuditLogByRecordId = async (
    recordId: string,
    limit = 50
): Promise<AuditLog[]> => {
    const rows = await runQuery<Record<string, unknown>>(
        `SELECT * FROM "AuditLog" 
         WHERE "recordId" = $1 
         ORDER BY "createdAt" DESC 
         LIMIT $2`,
        [recordId, limit]
    );
    return rows.map(mapAuditLog);
};

/**
 * Get recent audit log entries for a table
 */
export const getRecentAuditLogs = async (
    tableName: string,
    limit = 100
): Promise<AuditLog[]> => {
    const rows = await runQuery<Record<string, unknown>>(
        `SELECT * FROM "AuditLog" 
         WHERE "tableName" = $1 
         ORDER BY "createdAt" DESC 
         LIMIT $2`,
        [tableName, limit]
    );
    return rows.map(mapAuditLog);
};
