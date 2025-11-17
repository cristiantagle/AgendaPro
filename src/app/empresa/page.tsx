import { redirect } from "next/navigation";

import { AdminReportPanel } from "@/components/dashboard/AdminReportPanel";
import { KioskPanel } from "@/components/dashboard/KioskPanel";
import { TimeRecordsManager } from "@/components/dashboard/TimeRecordsManager";
import { WorkersTable } from "@/components/dashboard/WorkersTable";
import { CreateWorkerForm } from "@/components/forms/CreateWorkerForm";
import { PaySettingsForm } from "@/components/forms/PaySettingsForm";
import { CompanyLogoUploader } from "@/components/forms/CompanyLogoUploader";
import { ScheduleForm } from "@/components/forms/ScheduleForm";
import { DashboardTopBar } from "@/components/navigation/DashboardTopBar";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default async function EmpresaPage() {
  const session = await getSession();
  if (!session || session.role !== "company_admin") {
    redirect("/");
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId! },
    include: {
      paySettings: true,
      schedules: {
        orderBy: { diaSemana: "asc" },
      },
      employees: {
        include: {
          user: { select: { email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      kioskDevices: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) {
    redirect("/login");
  }

  const paySettingsForForm = company.paySettings
    ? {
        sueldoMensualBase:
          company.paySettings.sueldoMensualBase.toNumber(),
        factorExtraSemana: company.paySettings.factorExtraSemana,
        weekendDayRate: company.paySettings.weekendDayRate.toNumber(),
        weekendExtraHourRate:
          company.paySettings.weekendExtraHourRate.toNumber(),
      }
    : null;

  const records = await prisma.timeRecord.findMany({
    where: { companyId: company.id },
    include: {
      employee: { select: { nombreCompleto: true } },
    },
    orderBy: { fecha: "desc" },
    take: 15,
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <DashboardTopBar role="company_admin" />
        <header className="rounded-3xl bg-gradient-to-r from-emerald-600 to-blue-700 p-8 text-white shadow-lg">
          <div className="flex items-center gap-4">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logoUrl}
                alt={`Logo de ${company.name}`}
                className="h-20 w-20 rounded-2xl bg-white/20 object-contain p-2"
              />
            ) : null}
            <div>
              <h1 className="text-3xl font-semibold">{company.name}</h1>
              <p className="text-sm text-emerald-100">
                Administra trabajadores, parámetros de pago y reportes mensuales.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-emerald-200">Trabajadores activos</p>
              <p className="text-2xl font-bold">
                {company.employees.filter((emp) => emp.isActive).length}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <CreateWorkerForm />
          <PaySettingsForm settings={paySettingsForForm} />
        </section>

        <CompanyLogoUploader initialLogo={company.logoUrl} />

        <section>
          <ScheduleForm schedules={company.schedules} />
        </section>

        <KioskPanel
          slug={company.kioskSlug}
          pin={company.kioskPin}
          devices={company.kioskDevices.map((device) => ({
            id: device.id,
            name: device.name,
            createdAt: device.createdAt.toISOString(),
            lastUsedAt: device.lastUsedAt ? device.lastUsedAt.toISOString() : null,
          }))}
        />

        <WorkersTable
          sueldoBase={company.paySettings?.sueldoMensualBase?.toNumber() ?? 0}
          workers={company.employees.map((employee) => ({
            id: employee.id,
            nombre: employee.nombreCompleto,
            email: employee.user.email,
            isActive: employee.isActive,
            sueldoMensual: employee.sueldoMensual
              ? employee.sueldoMensual.toNumber()
              : null,
          }))}
        />

        <TimeRecordsManager
          records={records.map((record) => ({
            id: record.id,
            fecha: record.fecha.toISOString(),
            empleado: record.employee.nombreCompleto,
            horaEntrada: record.horaEntrada?.toISOString() ?? null,
            horaInicioAlmuerzo:
              record.horaInicioAlmuerzo?.toISOString() ?? null,
            horaFinAlmuerzo: record.horaFinAlmuerzo?.toISOString() ?? null,
            horaSalida: record.horaSalida?.toISOString() ?? null,
            esManual: record.esManual,
          }))}
        />

        <AdminReportPanel
          workers={company.employees.map((employee) => ({
            id: employee.id,
            nombre: employee.nombreCompleto,
          }))}
          initialWorkerId={company.employees[0]?.id}
        />
      </div>
    </main>
  );
}
