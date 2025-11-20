import crypto from "crypto";

import { runQuery, runSingle } from "@/lib/db";

type PaymentRow = {
  id: string;
  companyId: string;
  employeeId: string;
  amount: number;
  type: string;
  note: string | null;
  paidAt: Date;
  createdAt: Date;
  employeeNombre: string;
  employeeEmail: string | null;
};

type CreatePaymentInput = {
  companyId: string;
  employeeId: string;
  amount: number;
  type: string;
  note?: string | null;
  paidAt?: Date | null;
};

const mapPayment = (row: Record<string, unknown>): PaymentRow => ({
  id: row.id as string,
  companyId: row.companyId as string,
  employeeId: row.employeeId as string,
  amount: Number(row.amount),
  type: row.type as string,
  note: (row.note as string) ?? null,
  paidAt: new Date(row.paidAt as string),
  createdAt: new Date(row.createdAt as string),
  employeeNombre: (row.employeeNombre as string) ?? "",
  employeeEmail: (row.employeeEmail as string) ?? null,
});

export const createPayment = async (data: CreatePaymentInput) => {
  const id = crypto.randomUUID();
  const row = await runSingle<Record<string, unknown>>(
    'INSERT INTO "Payment" ("id","companyId","employeeId","amount","type","note","paidAt","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
    [
      id,
      data.companyId,
      data.employeeId,
      data.amount,
      data.type,
      data.note ?? null,
      data.paidAt ?? new Date(),
    ],
  );
  if (!row) return null;
  const withMeta = await runSingle<Record<string, unknown>>(
    'SELECT p.*, e."nombreCompleto" AS "employeeNombre", u."email" AS "employeeEmail" FROM "Payment" p JOIN "Employee" e ON e."id" = p."employeeId" LEFT JOIN "User" u ON u."id" = e."userId" WHERE p."id" = $1',
    [id],
  );
  return withMeta ? mapPayment(withMeta) : mapPayment(row);
};

export const listPaymentsByCompany = async (
  companyId: string,
  limit = 50,
) => {
  const rows = await runQuery<Record<string, unknown>>(
    'SELECT p.*, e."nombreCompleto" AS "employeeNombre", u."email" AS "employeeEmail" FROM "Payment" p JOIN "Employee" e ON e."id" = p."employeeId" LEFT JOIN "User" u ON u."id" = e."userId" WHERE p."companyId" = $1 ORDER BY p."paidAt" DESC LIMIT $2',
    [companyId, limit],
  );
  return rows.map(mapPayment);
};
