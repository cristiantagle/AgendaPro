import { redirect } from "next/navigation";

import { DashboardTopBar } from "@/components/navigation/DashboardTopBar";
import { MarkAttendanceCard } from "@/components/worker/MarkAttendanceCard";
import { WorkerMonthlySummary } from "@/components/worker/MonthlySummary";
import { getSession } from "@/lib/auth";
import { startOfDayUtc } from "@/lib/datetime";
import { getMonthlySummaryForEmployee } from "@/lib/report-service";
import { getCompanyById } from "@/lib/repos/companies";
import { getEmployeeByUserId } from "@/lib/repos/employees";
import { findTimeRecord } from "@/lib/repos/time-records";

export default async function TrabajadorPage() {
  const session = await getSession();
  if (!session || session.role !== "worker") {
    redirect("/");
  }

  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    redirect("/login");
  }

  const company = await getCompanyById(employee.companyId);
  if (!company) {
    redirect("/login");
  }

  const today = new Date();
  const todayStart = startOfDayUtc(today);

  const todayRecord = await findTimeRecord({
    employeeId: employee.id,
    fecha: todayStart,
  });

  const summary = await getMonthlySummaryForEmployee(
    employee.id,
    today.getMonth() + 1,
    today.getFullYear(),
    session,
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <DashboardTopBar role="worker" />
        <header className="rounded-3xl bg-white p-6 shadow-md">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            {company.name}
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            {employee.nombreCompleto}
          </h1>
          <p className="text-sm text-slate-600">
            {today.toLocaleDateString("es-CL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </header>

        <MarkAttendanceCard
          todayRecord={
            todayRecord
              ? {
                  horaEntrada: todayRecord.horaEntrada?.toISOString(),
                  horaInicioAlmuerzo:
                    todayRecord.horaInicioAlmuerzo?.toISOString(),
                  horaFinAlmuerzo:
                    todayRecord.horaFinAlmuerzo?.toISOString(),
                  horaSalida: todayRecord.horaSalida?.toISOString(),
                }
              : null
          }
        />

        <WorkerMonthlySummary
          employeeId={employee.id}
          initialSummary={{
            ...summary,
            dias: summary.dias,
          }}
        />
      </div>
    </main>
  );
}
