import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { fromZonedTime } from "date-fns-tz";

import { CHILE_TIMEZONE } from "../src/lib/timezone";

const prisma = new PrismaClient();

const TARGET_COMPANY = "Constructora Andes";
const TARGET_MONTH_INDEX = 9; // Octubre (0-based)
const YEAR = new Date().getFullYear();
const DEFAULT_SAMPLE_PASSWORD = "CambioSeguro123!";

const pad = (value: number) => String(value).padStart(2, "0");

const toZonedDate = (
  dateLabel: string,
  time: string,
  timezone: string = CHILE_TIMEZONE,
) => fromZonedTime(`${dateLabel}T${time}`, timezone);

const addMinutes = (date: Date, minutes: number) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
};

const addHours = (date: Date, hours: number) => addMinutes(date, hours * 60);

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: TARGET_COMPANY },
    include: { employees: true },
  });

  if (!company) {
    throw new Error(
      `No se encontró la empresa ${TARGET_COMPANY}. Crea los seeds primero.`,
    );
  }

  const timezone = CHILE_TIMEZONE;
  let employees = company.employees;

  if (employees.length === 0) {
    const passwordHash = await hash(DEFAULT_SAMPLE_PASSWORD, 10);
    const sampleDefinitions = [
      {
        nombre: "Trabajador 1 Andes",
        email: "worker1.constructora@demo.com",
        rut: "11.111.111-1",
        sueldoMensual: 550000,
      },
      {
        nombre: "Trabajador 2 Andes",
        email: "worker2.constructora@demo.com",
        rut: "22.222.222-2",
        sueldoMensual: 520000,
      },
      {
        nombre: "Trabajador 3 Andes",
        email: "worker3.constructora@demo.com",
        rut: "33.333.333-3",
        sueldoMensual: 500000,
      },
    ];

    const createdEmployees = [];
    for (const definition of sampleDefinitions) {
      const user = await prisma.user.upsert({
        where: { email: definition.email },
        update: {
          passwordHash,
          role: "worker",
          companyId: company.id,
        },
        create: {
          email: definition.email,
          passwordHash,
          role: "worker",
          companyId: company.id,
        },
      });

      const employee = await prisma.employee.upsert({
        where: { userId: user.id },
        update: {
          nombreCompleto: definition.nombre,
          companyId: company.id,
          rut: definition.rut,
          sueldoMensual: definition.sueldoMensual ?? undefined,
        },
        create: {
          userId: user.id,
          companyId: company.id,
          nombreCompleto: definition.nombre,
          rut: definition.rut,
          sueldoMensual: definition.sueldoMensual ?? undefined,
        },
      });

      createdEmployees.push(employee);
    }

    employees = createdEmployees;
    console.info(
      `ℹ️ No se encontraron trabajadores. Se crearon ${employees.length} ejemplos.`,
    );
  }
  const monthStartLabel = `${YEAR}-${pad(TARGET_MONTH_INDEX + 1)}-01`;
  const nextMonth = (TARGET_MONTH_INDEX + 1) % 12;
  const nextMonthYear = nextMonth === 0 ? YEAR + 1 : YEAR;
  const nextMonthLabel = `${nextMonthYear}-${pad(nextMonth + 1)}-01`;

  const monthStartUtc = toZonedDate(monthStartLabel, "00:00:00", timezone);
  const monthEndUtc = toZonedDate(nextMonthLabel, "00:00:00", timezone);

  await prisma.timeRecord.deleteMany({
    where: {
      companyId: company.id,
      fecha: {
        gte: monthStartUtc,
        lt: monthEndUtc,
      },
    },
  });

  for (const employee of employees) {
    const entries: Array<{
      fecha: Date;
      horaEntrada: Date;
      horaInicioAlmuerzo: Date;
      horaFinAlmuerzo: Date;
      horaSalida: Date;
      esManual: boolean;
      notas: string | null;
      employeeId: string;
      companyId: string;
    }> = [];

    for (let day = 1; day <= 31; day += 1) {
      const date = new Date(Date.UTC(YEAR, TARGET_MONTH_INDEX, day));
      if (date.getUTCMonth() !== TARGET_MONTH_INDEX) {
        break;
      }

      const weekday = date.getUTCDay();
      const dateLabel = `${YEAR}-${pad(TARGET_MONTH_INDEX + 1)}-${pad(day)}`;
      const isWeekend = weekday === 0 || weekday === 6;
      const isFriday = weekday === 5;
      const shouldSkip =
        (!isWeekend && day % 11 === 0) ||
        (isWeekend && day % 2 === 0);
      if (shouldSkip) {
        continue;
      }

      const startMinutesOffset = (day * 7) % 30; // variación de minutos
      const baseStartHour = isWeekend ? 9 : 8;
      const entrada = toZonedDate(
        dateLabel,
        `${pad(baseStartHour)}:${pad(startMinutesOffset)}`,
        timezone,
      );
      const inicioAlmuerzo = addHours(entrada, 4);
      const finAlmuerzo = addHours(inicioAlmuerzo, 1);
      const jornadaHoras = isWeekend ? 8 : isFriday ? 8 : 10;
      const salida = addHours(entrada, jornadaHoras);

      entries.push({
        fecha: toZonedDate(dateLabel, "00:00:00", timezone),
        horaEntrada: entrada,
        horaInicioAlmuerzo: inicioAlmuerzo,
        horaFinAlmuerzo: finAlmuerzo,
        horaSalida: salida,
        esManual: day % 7 === 0,
        notas:
          day % 7 === 0
            ? "Corrección manual para ajustar marcación."
            : null,
        employeeId: employee.id,
        companyId: company.id,
      });
    }

    if (entries.length > 0) {
      await prisma.timeRecord.createMany({
        data: entries,
        skipDuplicates: true,
      });
    }
  }

  console.info(
    `✅ Registros de octubre generados para ${employees.length} trabajadores.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
