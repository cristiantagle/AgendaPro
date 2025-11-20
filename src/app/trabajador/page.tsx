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
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-gray-100">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-violet-700/25 blur-[150px]" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-cyan-400/20 blur-[180px]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-[140px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <DashboardTopBar role="worker" appearance="dark" />
        <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-800/40 via-black/40 to-slate-900/50 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.35em] text-cyan-200">
            {company.name}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {employee.nombreCompleto}
          </h1>
          <p className="text-sm text-slate-200/85">
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
