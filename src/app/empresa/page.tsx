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
import {
  getCompanyById,
  getCompanyPaySettings,
  listSchedules,
} from "@/lib/repos/companies";
import { listEmployeesByCompany } from "@/lib/repos/employees";
import { listDevices } from "@/lib/repos/kiosk-devices";
import { listRecentRecordsByCompany } from "@/lib/repos/time-records";

export default async function EmpresaPage() {
  const session = await getSession();
  if (!session || session.role !== "company_admin") {
    redirect("/");
  }

  const company = await getCompanyById(session.companyId!);

  if (!company) {
    redirect("/login");
  }

  const paySettings = await getCompanyPaySettings(company.id);
  const schedules = await listSchedules(company.id);
  const employees = await listEmployeesByCompany(company.id);
  const kioskDevices = await listDevices(company.id);
  const records = await listRecentRecordsByCompany(company.id, 15);

  const paySettingsForForm = paySettings
    ? {
        sueldoMensualBase: paySettings.sueldoMensualBase,
        factorExtraSemana: paySettings.factorExtraSemana,
        weekendDayRate: paySettings.weekendDayRate,
        weekendExtraHourRate: paySettings.weekendExtraHourRate,
      }
    : null;

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
                {employees.filter((emp) => emp.isActive).length}
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
          <ScheduleForm schedules={schedules} />
        </section>

        <KioskPanel
          slug={company.kioskSlug}
          pin={company.kioskPin}
          devices={kioskDevices.map((device) => ({
            id: device.id,
            name: device.name,
            createdAt: device.createdAt.toISOString(),
            lastUsedAt: device.lastUsedAt ? device.lastUsedAt.toISOString() : null,
          }))}
        />

        <WorkersTable
          sueldoBase={paySettings?.sueldoMensualBase ?? 0}
          workers={employees.map((employee) => ({
            id: employee.id,
            nombre: employee.nombreCompleto,
            email: employee.user.email,
            isActive: employee.isActive,
            sueldoMensual: employee.sueldoMensual,
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
          workers={employees.map((employee) => ({
            id: employee.id,
            nombre: employee.nombreCompleto,
          }))}
          initialWorkerId={employees[0]?.id}
        />
      </div>
    </main>
  );
}
