import { NextResponse } from "next/server";

import { assertRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateKioskPin, generateKioskSlug } from "@/lib/kiosk";
import { createCompanySchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { employees: true },
      },
    },
  });

  return NextResponse.json({ companies });
}

export async function POST(request: Request) {
  const session = await getSession();
  assertRole(session, ["superadmin"]);

  const payload = await request.json();
  const data = createCompanySchema.parse(payload);

  const company = await prisma.company.create({
    data: {
      name: data.name,
      rut: data.rut,
      emailContacto: data.emailContacto,
      telefonoContacto: data.telefonoContacto,
      paySettings: {
        create: {
          valorHoraBaseGlobal: 4500,
          sueldoMensualBase: 500000,
          factorExtraSemana: 1.5,
          weekendDayRate: 60000,
          weekendExtraHourRate: 8000,
        },
      },
      schedules: {
        create: [
          { diaSemana: 1, horaInicio: "08:00", horaFin: "18:00" },
          { diaSemana: 2, horaInicio: "08:00", horaFin: "18:00" },
          { diaSemana: 3, horaInicio: "08:00", horaFin: "18:00" },
          { diaSemana: 4, horaInicio: "08:00", horaFin: "18:00" },
          {
            diaSemana: 5,
            horaInicio: "08:00",
            horaFin: "17:00",
            tipo: "viernes",
          },
          { diaSemana: 6, horaInicio: "08:00", horaFin: "18:00", tipo: "finde" },
          { diaSemana: 0, horaInicio: "08:00", horaFin: "18:00", tipo: "finde" },
        ],
      },
      kioskSlug: generateKioskSlug(data.name),
      kioskPin: generateKioskPin(),
    },
  });

  return NextResponse.json({ company });
}
