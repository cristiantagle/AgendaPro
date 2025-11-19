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

  const activeEmployees = employees.filter((emp) => emp.isActive).length;
  const inactiveEmployees = employees.length - activeEmployees;
  const stats = [
    {
      label: "Activos",
      value: activeEmployees,
      hint: "Personal operativo",
    },
    {
      label: "Inactivos",
      value: inactiveEmployees,
      hint: "En pausa",
    },
    {
      label: "Kioscos",
      value: kioskDevices.length,
      hint: "Dispositivos biométricos",
    },
    {
      label: "Marcaciones",
      value: records.length,
      hint: "Últimas 24h",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-gray-100">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-72 w-72 rounded-full bg-violet-700/30 blur-[140px]" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-cyan-400/20 blur-[160px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-500/20 blur-[140px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <DashboardTopBar role="company_admin" appearance="dark" />
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  {company.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={company.logoUrl}
                      alt={`Logo de ${company.name}`}
                      className="h-16 w-16 rounded-2xl border border-white/15 bg-black/30 object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-2xl font-bold">
                      {company.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-300">
                      Empresa
                    </p>
                    <h1 className="text-3xl font-semibold text-white tracking-tight">
                      {company.name}
                    </h1>
                    <p className="text-sm text-gray-400">
                      Control biométrico, jornadas y reportes centralizados.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-black/30 p-3"
                    >
                      <p className="text-[11px] font-mono uppercase tracking-[0.35em] text-gray-400">
                        {item.label}
                      </p>
                      <p className="text-3xl font-semibold text-white">{item.value}</p>
                      <p className="text-xs text-gray-500">{item.hint}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <CompanyLogoUploader initialLogo={company.logoUrl} />
            <ScheduleForm schedules={schedules} />
          </aside>
          <section className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <CreateWorkerForm />
              <PaySettingsForm settings={paySettingsForForm} />
            </div>
            <KioskPanel
              slug={company.kioskSlug}
              pin={company.kioskPin}
              devices={kioskDevices.map((device) => ({
                id: device.id,
                name: device.name,
                createdAt: device.createdAt.toISOString(),
                lastUsedAt: device.lastUsedAt
                  ? device.lastUsedAt.toISOString()
                  : null,
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
          </section>
        </div>
      </div>
    </main>
  );
}
