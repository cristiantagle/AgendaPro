import { describe, it, expect } from "vitest";

import {
  createCompanySchema,
  updateCompanySchema,
  createAdminSchema,
  createWorkerSchema,
  workerSelfSignupSchema,
  promoteWorkerSchema,
  kioskAuthorizeSchema,
  kioskAdminUnlockSchema,
  updateWorkerSchema,
  paySettingsSchema,
  timeRecordCorrectionSchema,
  markActionSchema,
  kioskMarkSchema,
  kioskFaceEnrollmentSchema,
  reportQuerySchema,
  paymentCreateSchema,
  scheduleSchema,
  scheduleListSchema,
} from "@/lib/validation";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

const expectValid = (result: { success: boolean }) => {
  expect(result.success).toBe(true);
};

const expectInvalid = (result: { success: boolean }) => {
  expect(result.success).toBe(false);
};

describe("validation schemas", () => {
  describe("createCompanySchema", () => {
    it("accepts valid company data", () => {
      expectValid(
        createCompanySchema.safeParse({
          name: "ACME SpA",
          rut: null,
          emailContacto: "contacto@acme.com",
          telefonoContacto: "123456789",
        }),
      );
    });

    it("rejects invalid company data", () => {
      expectInvalid(createCompanySchema.safeParse({ name: "AB" }));
    });
  });

  describe("updateCompanySchema", () => {
    it("accepts valid company update data", () => {
      expectValid(
        updateCompanySchema.safeParse({
          name: "ACME SpA",
          rut: null,
          emailContacto: null,
          telefonoContacto: null,
          isActive: false,
        }),
      );
    });

    it("rejects invalid company update data", () => {
      expectInvalid(
        updateCompanySchema.safeParse({
          name: "ACME SpA",
          isActive: "true",
        }),
      );
    });
  });

  describe("createAdminSchema", () => {
    it("accepts valid admin data", () => {
      expectValid(
        createAdminSchema.safeParse({
          email: "admin@test.com",
          password: "12345678",
          companyId: UUID,
          nombreCompleto: "Admin User",
        }),
      );
    });

    it("rejects invalid admin data", () => {
      expectInvalid(
        createAdminSchema.safeParse({
          email: "not-an-email",
          password: "12345678",
          companyId: UUID,
          nombreCompleto: "Admin User",
        }),
      );
    });
  });

  describe("createWorkerSchema", () => {
    it("accepts valid worker data", () => {
      expectValid(
        createWorkerSchema.safeParse({
          email: "worker@test.com",
          password: "12345678",
          nombreCompleto: "Juan Perez",
          rut: " 12.345.678-9 ",
          sueldoMensual: null,
        }),
      );
    });

    it("rejects invalid worker data", () => {
      expectInvalid(
        createWorkerSchema.safeParse({
          email: "worker@test.com",
          password: "12345678",
          nombreCompleto: "Juan Perez",
          rut: " 12 ",
        }),
      );
    });
  });

  describe("workerSelfSignupSchema", () => {
    it("accepts valid self-signup data", () => {
      expectValid(
        workerSelfSignupSchema.safeParse({
          email: "worker@test.com",
          password: "12345678",
          nombreCompleto: "Juan Perez",
          rut: "12.345.678-9",
          companyId: UUID,
        }),
      );
    });

    it("rejects invalid self-signup data", () => {
      expectInvalid(
        workerSelfSignupSchema.safeParse({
          email: "worker@test.com",
          password: "12345678",
          nombreCompleto: "Juan Perez",
          rut: "12.345.678-9",
          companyId: "not-a-uuid",
        }),
      );
    });
  });

  describe("promoteWorkerSchema", () => {
    it("accepts valid promotion data", () => {
      expectValid(promoteWorkerSchema.safeParse({ employeeId: UUID }));
    });

    it("rejects invalid promotion data", () => {
      expectInvalid(promoteWorkerSchema.safeParse({ employeeId: "abc" }));
    });
  });

  describe("kioskAuthorizeSchema", () => {
    it("accepts valid kiosk authorization data", () => {
      expectValid(kioskAuthorizeSchema.safeParse({ pin: "1234" }));
      expectValid(
        kioskAuthorizeSchema.safeParse({ pin: "1234", deviceName: "Front Desk" }),
      );
    });

    it("rejects invalid kiosk authorization data", () => {
      expectInvalid(kioskAuthorizeSchema.safeParse({ pin: "123" }));
      expectInvalid(
        kioskAuthorizeSchema.safeParse({ pin: "1234", deviceName: "AB" }),
      );
    });
  });

  describe("kioskAdminUnlockSchema", () => {
    it("accepts valid kiosk admin unlock data", () => {
      expectValid(kioskAdminUnlockSchema.safeParse({ pin: "1234", employeeId: UUID }));
    });

    it("rejects invalid kiosk admin unlock data", () => {
      expectInvalid(
        kioskAdminUnlockSchema.safeParse({ pin: "1234", employeeId: "not-uuid" }),
      );
    });
  });

  describe("updateWorkerSchema", () => {
    it("accepts valid worker update data", () => {
      expectValid(updateWorkerSchema.safeParse({}));
      expectValid(updateWorkerSchema.safeParse({ isActive: true, rut: null }));
    });

    it("rejects invalid worker update data", () => {
      expectInvalid(updateWorkerSchema.safeParse({ sueldoMensual: -1 }));
    });
  });

  describe("paySettingsSchema", () => {
    it("accepts valid pay settings", () => {
      expectValid(
        paySettingsSchema.safeParse({
          sueldoMensualBase: 500000,
          factorExtraSemana: 1.5,
          weekendDayRate: 20000,
          weekendExtraHourRate: 10000,
        }),
      );
    });

    it("rejects invalid pay settings", () => {
      expectInvalid(
        paySettingsSchema.safeParse({
          sueldoMensualBase: 500000,
          factorExtraSemana: 0.9,
          weekendDayRate: 20000,
          weekendExtraHourRate: 10000,
        }),
      );
    });
  });

  describe("timeRecordCorrectionSchema", () => {
    it("accepts valid correction data", () => {
      expectValid(
        timeRecordCorrectionSchema.safeParse({
          fecha: "2024-01-15",
          horaEntrada: null,
          horaInicioAlmuerzo: null,
          horaFinAlmuerzo: null,
          horaSalida: null,
          notas: null,
        }),
      );
    });

    it("rejects invalid correction data", () => {
      expectInvalid(
        timeRecordCorrectionSchema.safeParse({
          fecha: 123,
          horaEntrada: null,
          horaInicioAlmuerzo: null,
          horaFinAlmuerzo: null,
          horaSalida: null,
        }),
      );
    });
  });

  describe("markActionSchema", () => {
    it("accepts valid mark actions", () => {
      expectValid(markActionSchema.safeParse({ action: "entrada" }));
      expectValid(markActionSchema.safeParse({ action: "fin_almuerzo" }));
    });

    it("rejects invalid mark actions", () => {
      expectInvalid(markActionSchema.safeParse({ action: "foo" }));
    });
  });

  describe("kioskMarkSchema", () => {
    it("accepts valid kiosk mark payloads", () => {
      expectValid(kioskMarkSchema.safeParse({ action: "entrada", employeeId: UUID }));
    });

    it("rejects invalid kiosk mark payloads", () => {
      expectInvalid(
        kioskMarkSchema.safeParse({ action: "entrada", employeeId: "not-uuid" }),
      );
    });
  });

  describe("kioskFaceEnrollmentSchema", () => {
    it("accepts a valid face enrollment descriptor", () => {
      expectValid(
        kioskFaceEnrollmentSchema.safeParse({
          employeeId: UUID,
          descriptor: Array.from({ length: 64 }, (_, i) => i * 0.01),
        }),
      );
    });

    it("rejects invalid face enrollment descriptors", () => {
      expectInvalid(
        kioskFaceEnrollmentSchema.safeParse({
          employeeId: UUID,
          descriptor: Array.from({ length: 63 }, () => 0.1),
        }),
      );
      expectInvalid(
        kioskFaceEnrollmentSchema.safeParse({
          employeeId: UUID,
          descriptor: Array.from({ length: 64 }, () => Number.POSITIVE_INFINITY),
        }),
      );
    });
  });

  describe("reportQuerySchema", () => {
    it("accepts valid report queries (including coercion)", () => {
      expectValid(
        reportQuerySchema.safeParse({
          employeeId: UUID,
          year: "2024",
          month: "1",
        }),
      );
    });

    it("rejects invalid report queries", () => {
      expectInvalid(
        reportQuerySchema.safeParse({
          employeeId: UUID,
          year: "2024",
          month: "13",
        }),
      );
    });
  });

  describe("paymentCreateSchema", () => {
    it("accepts valid payments (including coercion)", () => {
      expectValid(
        paymentCreateSchema.safeParse({
          employeeId: UUID,
          amount: "1000",
          type: "pago",
          note: null,
          paidAt: "2024-01-15",
        }),
      );
    });

    it("rejects invalid payments", () => {
      expectInvalid(
        paymentCreateSchema.safeParse({
          employeeId: UUID,
          amount: "0",
          type: "pago",
        }),
      );
      expectInvalid(
        paymentCreateSchema.safeParse({
          employeeId: UUID,
          amount: "1000",
          type: "invalid",
        }),
      );
    });
  });

  describe("scheduleSchema", () => {
    it("accepts valid schedules", () => {
      expectValid(
        scheduleSchema.safeParse({
          diaSemana: 1,
          horaInicio: "09:00",
          horaFin: "18:00",
          tipo: "normal",
        }),
      );
    });

    it("rejects invalid schedules", () => {
      expectInvalid(
        scheduleSchema.safeParse({
          diaSemana: 7,
          horaInicio: "09:00",
          horaFin: "18:00",
          tipo: "normal",
        }),
      );
      expectInvalid(
        scheduleSchema.safeParse({
          diaSemana: 1,
          horaInicio: "9:00",
          horaFin: "18:00",
          tipo: "normal",
        }),
      );
    });
  });

  describe("scheduleListSchema", () => {
    it("accepts valid schedule lists", () => {
      expectValid(
        scheduleListSchema.safeParse({
          schedules: [
            { diaSemana: 1, horaInicio: "09:00", horaFin: "18:00", tipo: "normal" },
          ],
        }),
      );
    });

    it("rejects invalid schedule lists", () => {
      expectInvalid(scheduleListSchema.safeParse({ schedules: [] }));
    });
  });
});

