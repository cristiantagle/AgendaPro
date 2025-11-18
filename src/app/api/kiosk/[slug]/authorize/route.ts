import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { generateDeviceToken, kioskCookieName } from "@/lib/kiosk";
import {
  createDevice,
  getDeviceByToken,
} from "@/lib/repos/kiosk-devices";
import { getCompanyBySlug } from "@/lib/repos/companies";
import { listActiveEmployeesForCompany } from "@/lib/repos/employees";
import { getTodayRecordForEmployee } from "@/lib/repos/time-records";
import { kioskAuthorizeSchema } from "@/lib/validation";

type Params = {
  slug: string;
};

const extractToken = async (request: Request, slug: string) => {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(kioskCookieName(slug))?.value;
  const headerToken =
    request.headers.get("authorization") ??
    request.headers.get("x-kiosk-token");
  const normalizedHeader =
    headerToken?.startsWith("Bearer ")
      ? headerToken.slice(7)
      : headerToken ?? null;
  return cookieToken ?? normalizedHeader ?? null;
};

export async function POST(
  request: Request,
  context: { params: Promise<Params> },
) {
  const params = await context.params;
  const data = kioskAuthorizeSchema.parse(await request.json());
  const company = await getCompanyBySlug(params.slug);

  if (!company) {
    return NextResponse.json(
      { error: "Empresa no encontrada" },
      { status: 404 },
    );
  }

  if (company.kioskPin !== data.pin) {
    return NextResponse.json(
      { error: "PIN inválido" },
      { status: 401 },
    );
  }

  const token = generateDeviceToken();
  const device = await createDevice({
    companyId: company.id,
    token,
    name: data.deviceName ?? `Terminal ${new Date().toLocaleDateString()}`,
  });

  const response = NextResponse.json({
    device: device ? { id: device.id, name: device.name } : null,
    token,
  });
  response.cookies.set({
    name: kioskCookieName(company.kioskSlug),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function GET(
  request: Request,
  context: { params: Promise<Params> },
) {
  const params = await context.params;
  const company = await getCompanyBySlug(params.slug);

  if (!company) {
    return NextResponse.json(
      { error: "Empresa no encontrada" },
      { status: 404 },
    );
  }

  const token = await extractToken(request, params.slug);

  if (!token) {
    return NextResponse.json(
      { device: null, workers: [] },
      { status: 401 },
    );
  }

  const device = await getDeviceByToken(token);

  if (!device || device.companyId !== company.id) {
    return NextResponse.json(
      { device: null, workers: [] },
      { status: 401 },
    );
  }

  const today = new Date();
  const employees = await listActiveEmployeesForCompany(company.id);
  const workers: Array<{
    id: string;
    runningSince: string | null;
    workedMs: number;
    lastAction?: string;
    lastTime?: string;
  }> = [];

  for (const employee of employees) {
    const record = await getTodayRecordForEmployee(
      employee.id,
      company.id,
      today,
    );
    if (!record) {
      workers.push({
        id: employee.id,
        runningSince: null,
        workedMs: 0,
      });
      continue;
    }
    let workedMs = 0;
    if (record.horaEntrada && record.horaInicioAlmuerzo) {
      workedMs +=
        record.horaInicioAlmuerzo.getTime() -
        record.horaEntrada.getTime();
    }
    if (record.horaFinAlmuerzo && record.horaSalida) {
      workedMs +=
        record.horaSalida.getTime() -
        record.horaFinAlmuerzo.getTime();
    }
    const runningSince =
      record.horaFinAlmuerzo && !record.horaSalida
        ? record.horaFinAlmuerzo.toISOString()
        : record.horaEntrada &&
            !record.horaInicioAlmuerzo
          ? record.horaEntrada.toISOString()
          : null;
    const lastAction =
      record.horaSalida
        ? "Salida"
        : record.horaFinAlmuerzo
          ? "Fin almuerzo"
          : record.horaInicioAlmuerzo
            ? "Inicio almuerzo"
            : record.horaEntrada
              ? "Entrada"
              : undefined;
    const lastTime =
      record.horaSalida ??
      record.horaFinAlmuerzo ??
      record.horaInicioAlmuerzo ??
      record.horaEntrada;

    workers.push({
      id: employee.id,
      runningSince,
      workedMs,
      lastAction,
      lastTime: lastTime ? lastTime.toISOString() : undefined,
    });
  }

  return NextResponse.json({
    device: { id: device.id, name: device.name },
    workers,
  });
}
