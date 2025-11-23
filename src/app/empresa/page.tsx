import { redirect } from "next/navigation";

import { EmpresaDashboardShell } from "@/components/dashboard/EmpresaDashboardShell";
import { getSession } from "@/lib/auth";
import {
  getCompanyById,
  getCompanyPaySettings,
  listSchedules,
} from "@/lib/repos/companies";
import { listEmployeesByCompany } from "@/lib/repos/employees";
import { listDevices } from "@/lib/repos/kiosk-devices";
import { listPaymentsByCompany } from "@/lib/repos/payments";
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
  const payments = await listPaymentsByCompany(company.id, 30);

  const paySettingsForForm = paySettings
    ? {
        sueldoMensualBase: paySettings.sueldoMensualBase,
        factorExtraSemana: paySettings.factorExtraSemana,
        weekendDayRate: paySettings.weekendDayRate,
        weekendExtraHourRate: paySettings.weekendExtraHourRate,
      }
    : null;

  const stats = (() => {
    const activeEmployees = employees.filter((emp) => emp.isActive).length;
    const inactiveEmployees = employees.length - activeEmployees;
    return [
      { label: "Activos", value: activeEmployees, hint: "Personal operativo" },
      { label: "Inactivos", value: inactiveEmployees, hint: "En pausa" },
      { label: "Kioscos", value: kioskDevices.length, hint: "Dispositivos biométricos" },
      { label: "Marcaciones", value: records.length, hint: "Últimas 24h" },
    ];
  })();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(80,117,255,0.14),transparent_45%),radial-gradient(circle_at_78%_15%,rgba(34,211,238,0.16),transparent_40%),#04060c] text-gray-100">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="grid-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-72 w-72 rounded-full bg-violet-700/25 blur-[140px]" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-cyan-400/18 blur-[160px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-500/18 blur-[140px]" />
      </div>
      <EmpresaDashboardShell
        company={{
          id: company.id,
          name: company.name,
          logoUrl: company.logoUrl,
          kioskSlug: company.kioskSlug,
          kioskPin: company.kioskPin,
        }}
        stats={stats}
        paySettingsForForm={paySettingsForForm}
        paySettings={paySettings}
        schedules={schedules}
        employees={employees}
        kioskDevices={kioskDevices.map((device) => ({
          id: device.id,
          name: device.name,
          createdAt: device.createdAt.toISOString(),
          lastUsedAt: device.lastUsedAt ? device.lastUsedAt.toISOString() : null,
        }))}
        records={records.map((record) => ({
          id: record.id,
          fecha: record.fecha.toISOString(),
          empleado: record.employee.nombreCompleto,
          horaEntrada: record.horaEntrada?.toISOString() ?? null,
          horaInicioAlmuerzo: record.horaInicioAlmuerzo?.toISOString() ?? null,
          horaFinAlmuerzo: record.horaFinAlmuerzo?.toISOString() ?? null,
          horaSalida: record.horaSalida?.toISOString() ?? null,
          esManual: record.esManual,
        }))}
        payments={payments.map((payment) => ({
          id: payment.id,
          employeeId: payment.employeeId,
          employeeNombre: payment.employeeNombre,
          employeeEmail: payment.employeeEmail,
          amount: payment.amount,
          type: payment.type as "adelanto" | "quincena" | "pago",
          note: payment.note,
          paidAt: payment.paidAt.toISOString(),
        }))}
      />
    </main>
  );
}
