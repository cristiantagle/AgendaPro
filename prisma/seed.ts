import { Prisma, PrismaClient, Role, ScheduleType } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const defaultPassword = "CambioSeguro123!";
const slugifyValue = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "empresa";
const randomSuffix = () => Math.random().toString(36).slice(2, 6);
const buildKioskSlug = (name: string) =>
  `${slugifyValue(name)}-${randomSuffix()}`;
const buildKioskPin = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const buildSchedule = () => {
  const schedules: Array<{
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
    tipo: ScheduleType;
  }> = [];

  for (let day = 1; day <= 4; day += 1) {
    schedules.push({
      diaSemana: day,
      horaInicio: "08:00",
      horaFin: "18:00",
      tipo: ScheduleType.normal,
    });
  }

  schedules.push({
    diaSemana: 5,
    horaInicio: "08:00",
    horaFin: "17:00",
    tipo: ScheduleType.viernes,
  });

  schedules.push(
    {
      diaSemana: 6,
      horaInicio: "08:00",
      horaFin: "18:00",
      tipo: ScheduleType.finde,
    },
    {
      diaSemana: 0,
      horaInicio: "08:00",
      horaFin: "18:00",
      tipo: ScheduleType.finde,
    },
  );

  return schedules;
};

async function createCompany(
  name: string,
  rut: string,
  adminEmail: string,
) {
  let company = await prisma.company.findFirst({
    where: { rut },
  });

  if (company) {
    const existingCompanyId = company.id;

    await prisma.company.update({
      where: { id: existingCompanyId },
      data: {
        emailContacto: `${name.toLowerCase().replace(/\s/g, "")}@demo.com`,
        telefonoContacto: "+56 2 2999 9999",
        kioskSlug: company.kioskSlug ?? buildKioskSlug(name),
        kioskPin: company.kioskPin ?? buildKioskPin(),
      },
    });

    await prisma.companyPaySetting.upsert({
      where: { companyId: existingCompanyId },
      update: {
        valorHoraBaseGlobal: 4500,
        sueldoMensualBase: 500000,
        factorExtraSemana: 1.5,
        weekendDayRate: new Prisma.Decimal(60000),
        weekendExtraHourRate: new Prisma.Decimal(8000),
      },
      create: {
        companyId: existingCompanyId,
        valorHoraBaseGlobal: 4500,
        sueldoMensualBase: 500000,
        factorExtraSemana: 1.5,
        weekendDayRate: new Prisma.Decimal(60000),
        weekendExtraHourRate: new Prisma.Decimal(8000),
      },
    });

    const schedulesCount = await prisma.companyWorkSchedule.count({
      where: { companyId: existingCompanyId },
    });

    if (schedulesCount === 0) {
      await prisma.companyWorkSchedule.createMany({
        data: buildSchedule().map((schedule) => ({
          ...schedule,
          companyId: existingCompanyId,
        })),
      });
    }
  } else {
    company = await prisma.company.create({
      data: {
        name,
        rut,
        emailContacto: `${name.toLowerCase().replace(/\s/g, "")}@demo.com`,
        telefonoContacto: "+56 2 2999 9999",
        paySettings: {
          create: {
            valorHoraBaseGlobal: 4500,
            sueldoMensualBase: 500000,
            factorExtraSemana: 1.5,
            weekendDayRate: new Prisma.Decimal(60000),
            weekendExtraHourRate: new Prisma.Decimal(8000),
          },
        },
        schedules: {
          create: buildSchedule(),
        },
        kioskSlug: buildKioskSlug(name),
        kioskPin: buildKioskPin(),
      },
    });
  }

  const ensuredCompany = company;
  if (!ensuredCompany) {
    throw new Error("Company could not be created");
  }

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      companyId: ensuredCompany.id,
      role: Role.company_admin,
    },
    create: {
      email: adminEmail,
      passwordHash: await hash(defaultPassword, 10),
      role: Role.company_admin,
      companyId: ensuredCompany.id,
    },
  });

  return { company: ensuredCompany, adminUser };
}

async function main() {
  console.info("🌱 Starting Prisma seed...");

  const passwordHash = await hash(defaultPassword, 10);

  await prisma.user.upsert({
    where: { email: "superadmin@demo.com" },
    update: {},
    create: {
      email: "superadmin@demo.com",
      passwordHash,
      role: Role.superadmin,
    },
  });

  const { company: companyA } = await createCompany(
    "Constructora Andes",
    "76.123.456-7",
    "admin.andes@demo.com",
  );
  const { company: companyB } = await createCompany(
    "Servicios Pacifico",
    "76.987.654-3",
    "admin.pacifico@demo.com",
  );

  const companies = [companyA, companyB];

  for (const company of companies) {
    for (let i = 1; i <= 3; i += 1) {
      const workerEmail = `worker${i}.${company.name
        .split(" ")[0]
        .toLowerCase()}@demo.com`;

      const workerUser = await prisma.user.upsert({
        where: { email: workerEmail },
        update: {
          companyId: company.id,
          role: Role.worker,
        },
        create: {
          email: workerEmail,
          passwordHash,
          role: Role.worker,
          companyId: company.id,
        },
      });

      const employee = await prisma.employee.upsert({
        where: { userId: workerUser.id },
        update: {
          companyId: company.id,
          nombreCompleto: `Trabajador ${i} ${company.name}`,
          sueldoMensual: i % 2 === 0 ? 520000 : 480000,
        },
        create: {
          companyId: company.id,
          userId: workerUser.id,
          nombreCompleto: `Trabajador ${i} ${company.name}`,
          sueldoMensual: i % 2 === 0 ? 520000 : 480000,
        },
      });

      const today = new Date();
      const baseDate = new Date(today.getFullYear(), today.getMonth(), 1, 8);

      const timeEntries = Array.from({ length: 5 }).map((_, idx) => {
        const fecha = new Date(baseDate);
        fecha.setDate(fecha.getDate() + idx);
        const entrada = new Date(fecha);
        const salida = new Date(fecha);
        salida.setHours(salida.getHours() + 10);
        const inicioAlmuerzo = new Date(entrada);
        inicioAlmuerzo.setHours(inicioAlmuerzo.getHours() + 4);
        const finAlmuerzo = new Date(inicioAlmuerzo);
        finAlmuerzo.setHours(finAlmuerzo.getHours() + 1);

        return {
          fecha,
          horaEntrada: entrada,
          horaInicioAlmuerzo: inicioAlmuerzo,
          horaFinAlmuerzo: finAlmuerzo,
          horaSalida: salida,
          esManual: idx === 0,
          notas: idx === 0 ? "Carga inicial" : null,
        };
      });

      await prisma.timeRecord.createMany({
        data: timeEntries.map((entry) => ({
          ...entry,
          employeeId: employee.id,
          companyId: company.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  console.info("✅ Seed completed. Default password:", defaultPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
