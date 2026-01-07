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
  afp: string | null;
  salud: string | null;
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
  tipoJornada: TipoJornada;
};

// Tipos para marcaciones manuales
export type TipoJornada =
  | "completa"           // Jornada completa trabajada
  | "media"              // Media jornada
  | "permiso_con_goce"   // Permiso con goce de sueldo
  | "permiso_sin_goce"   // Permiso sin goce de sueldo
  | "vacaciones"         // Día de vacaciones
  | "licencia_medica"    // Licencia médica
  | "falta"              // Falta injustificada
  | "feriado";           // Feriado legal (pagado)



// Módulo de Combustible
export type FuelType = "bencina_93" | "bencina_95" | "bencina_97" | "diesel" | "electrico" | "otro";

export type Vehicle = {
  id: string;
  companyId: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  tipoCombustible: FuelType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FuelRecord = {
  id: string;
  vehicleId: string;
  companyId: string;
  employeeId: string | null;
  fecha: Date;
  litros: number;
  kilometraje: number | null;
  tipoCombustible: FuelType;
  costoTotal: number | null;
  precioLitro: number | null;
  estacion: string | null;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
};

