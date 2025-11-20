import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(3),
  rut: z.string().optional().nullable(),
  emailContacto: z.string().email().optional().nullable(),
  telefonoContacto: z.string().optional().nullable(),
});

export const updateCompanySchema = createCompanySchema.extend({
  isActive: z.boolean().optional(),
});

const passwordMessage = "La contraseña debe tener al menos 8 caracteres.";

export const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: passwordMessage }),
  companyId: z.string().uuid(),
});

export const createWorkerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: passwordMessage }),
  nombreCompleto: z.string().min(3),
  rut: z
    .string()
    .trim()
    .min(3, { message: "El RUT es obligatorio." }),
  sueldoMensual: z.number().min(0).optional().nullable(),
});

export const workerSelfSignupSchema = createWorkerSchema.extend({
  companyId: z.string().uuid(),
});

export const promoteWorkerSchema = z.object({
  employeeId: z.string().uuid(),
});

export const kioskAuthorizeSchema = z.object({
  pin: z.string().min(4),
  deviceName: z.string().min(3).max(50).optional(),
});

export const updateWorkerSchema = z.object({
  nombreCompleto: z.string().min(3).optional(),
  rut: z.string().optional().nullable(),
  sueldoMensual: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const paySettingsSchema = z.object({
  sueldoMensualBase: z.number().min(0),
  factorExtraSemana: z.number().min(1),
  weekendDayRate: z.number().min(0),
  weekendExtraHourRate: z.number().min(0),
});

export const timeRecordCorrectionSchema = z.object({
  fecha: z.string(),
  horaEntrada: z.string().nullable(),
  horaInicioAlmuerzo: z.string().nullable(),
  horaFinAlmuerzo: z.string().nullable(),
  horaSalida: z.string().nullable(),
  notas: z.string().optional().nullable(),
});

export const markActionSchema = z.object({
  action: z.enum([
    "entrada",
    "inicio_almuerzo",
    "fin_almuerzo",
    "salida",
  ]),
});

export const kioskMarkSchema = markActionSchema.extend({
  employeeId: z.string().uuid(),
});

const descriptorValueSchema = z
  .number()
  .refine((value) => Number.isFinite(value), "Descriptor inválido");

export const kioskFaceEnrollmentSchema = z.object({
  employeeId: z.string().uuid(),
  descriptor: z
    .array(descriptorValueSchema)
    .min(64, { message: "Descriptor inválido" })
    .max(512, { message: "Descriptor inválido" }),
});

export const reportQuerySchema = z.object({
  employeeId: z.string().uuid(),
  year: z.coerce.number().min(2000),
  month: z.coerce.number().min(1).max(12),
});

export const scheduleSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/),
  tipo: z.enum(["normal", "viernes", "finde"]),
});

export const scheduleListSchema = z.object({
  schedules: z.array(scheduleSchema).min(1),
});
