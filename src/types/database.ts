export type Role = "superadmin" | "company_admin" | "worker";

export type ScheduleType = "normal" | "viernes" | "finde";

export type Company = {
  id: string;
  name: string;
  rut: string | null;
  emailContacto: string | null;
  telefonoContacto: string | null;
  isActive: boolean;
  logoUrl: string | null;
  kioskSlug: string;
  kioskPin: string;
};

export type CompanyPaySetting = {
  id: string;
  companyId: string;
  valorHoraBaseGlobal: number;
  sueldoMensualBase: number;
  factorExtraSemana: number;
  weekendDayRate: number;
  weekendExtraHourRate: number;
};

export type CompanyWorkSchedule = {
  id: string;
  companyId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipo: ScheduleType;
};

export type Employee = {
  id: string;
  companyId: string;
  userId: string;
  nombreCompleto: string;
  rut: string | null;
  valorHoraBase: number | null;
  sueldoMensual: number | null;
  isActive: boolean;
};

export type EmployeeFace = {
  id: string;
  employeeId: string;
  descriptor: number[];
  createdAt: Date;
  updatedAt: Date;
};

export type TimeRecord = {
  id: string;
  employeeId: string;
  companyId: string;
  fecha: Date;
  horaEntrada: Date | null;
  horaInicioAlmuerzo: Date | null;
  horaFinAlmuerzo: Date | null;
  horaSalida: Date | null;
  esManual: boolean;
  notas: string | null;
};
