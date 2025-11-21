import { describe, it, expect } from "vitest";
import { calculateDaySummary } from "./time-calculations";
import { CHILE_TIMEZONE } from "./timezone";
import { fromZonedTime } from "date-fns-tz";

// Helper to create dates in Chile timezone
const createDate = (dateStr: string, timeStr: string) => {
    return fromZonedTime(`${dateStr}T${timeStr}`, CHILE_TIMEZONE);
};

describe("calculateDaySummary", () => {
    const mockCompany = {
        id: "comp-1",
        name: "Test Corp",
        emailContacto: "test@corp.com",
        telefonoContacto: "123456789",
        createdAt: new Date(),
        updatedAt: new Date(),
        schedules: [],
        rut: "76.543.210-K",
        isActive: true,
        logoUrl: null,
        kioskSlug: "test-kiosk",
        kioskPin: "1234",
    };

    const mockEmployee = {
        id: "emp-1",
        companyId: "comp-1",
        userId: "user-1",
        nombreCompleto: "Juan Perez",
        rut: "12.345.678-9",
        email: "juan@test.com",
        cargo: "Developer",
        sueldoMensual: 1000000,
        valorHoraBase: null,
        fechaIngreso: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockPaySettings = {
        id: "pay-1",
        companyId: "comp-1",
        sueldoMensualBase: 500000,
        valorHoraBaseGlobal: 5000,
        factorExtraSemana: 1.5,
        weekendDayRate: 20000,
        weekendExtraHourRate: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const valorHora = 5000;

    it("should calculate normal hours correctly for a standard weekday", () => {
        const dateStr = "2023-10-04"; // Wednesday
        const record = {
            id: "rec-1",
            employeeId: "emp-1",
            companyId: "comp-1",
            fecha: createDate(dateStr, "00:00:00"),
            horaEntrada: createDate(dateStr, "09:00:00"),
            horaSalida: createDate(dateStr, "18:00:00"), // 9 hours work
            horaInicioAlmuerzo: createDate(dateStr, "13:00:00"),
            horaFinAlmuerzo: createDate(dateStr, "14:00:00"),
            esManual: false,
            notas: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = calculateDaySummary(
            record,
            mockEmployee,
            mockCompany,
            mockPaySettings,
            valorHora
        );

        // 9 hours total - 1 hour lunch = 8 worked hours
        // Weekday limit is 9 hours, so all 8 are normal
        expect(result.horasNormales).toBe(8);
        expect(result.horasExtra).toBe(0);
        expect(result.montoNormal).toBe(8 * valorHora);
    });

    it("should calculate overtime hours correctly for a long weekday", () => {
        const dateStr = "2023-10-04"; // Wednesday
        const record = {
            id: "rec-1",
            employeeId: "emp-1",
            companyId: "comp-1",
            fecha: createDate(dateStr, "00:00:00"),
            horaEntrada: createDate(dateStr, "08:00:00"),
            horaSalida: createDate(dateStr, "20:00:00"), // 12 hours work
            horaInicioAlmuerzo: null,
            horaFinAlmuerzo: null,
            esManual: false,
            notas: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = calculateDaySummary(
            record,
            mockEmployee,
            mockCompany,
            mockPaySettings,
            valorHora
        );

        // 12 hours total - 1 hour lunch (automatic deduction) = 11 worked hours
        // Limit is 9 hours.
        // Normal: 9
        // Extra: 2
        expect(result.horasNormales).toBe(9);
        expect(result.horasExtra).toBe(2);
        expect(result.montoExtra).toBe(2 * valorHora * mockPaySettings.factorExtraSemana);
    });

    it("should calculate weekend hours correctly", () => {
        const dateStr = "2023-10-07"; // Saturday
        const record = {
            id: "rec-1",
            employeeId: "emp-1",
            companyId: "comp-1",
            fecha: createDate(dateStr, "00:00:00"),
            horaEntrada: createDate(dateStr, "10:00:00"),
            horaSalida: createDate(dateStr, "15:00:00"), // 5 hours work
            horaInicioAlmuerzo: null,
            horaFinAlmuerzo: null,
            esManual: false,
            notas: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = calculateDaySummary(
            record,
            mockEmployee,
            mockCompany,
            mockPaySettings,
            valorHora
        );

        // Weekend logic is different.
        // It seems to use a fixed rate for the day + extra hours logic based on ranges.
        // Based on code:
        // normalRangeStart = 8, normalRangeEnd = 18.
        // 10:00 to 15:00 is fully within normal range.
        // 5 hours total.
        // subtractLunchFromSegments will remove 1 hour if applicable?
        // Let's check subtractLunchFromSegments logic in the file.
        // It subtracts 1 hour from normal hours first.
        // So 5 - 1 = 4 normal hours.

        expect(result.horasFindeNormales).toBe(4);
        expect(result.montoFindeNormal).toBe(mockPaySettings.weekendDayRate);
    });
});
