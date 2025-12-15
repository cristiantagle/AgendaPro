"use client";

import { useState } from "react";

import { AdminReportPanel } from "@/components/dashboard/AdminReportPanel";
import { KioskPanel } from "@/components/dashboard/KioskPanel";
import { PaymentsPanel } from "@/components/dashboard/PaymentsPanel";
import { TimeRecordsManager } from "@/components/dashboard/TimeRecordsManager";
import { WorkersTable } from "@/components/dashboard/WorkersTable";
import { FuelPanel } from "@/components/dashboard/FuelPanel";
import { DashboardTopBar } from "@/components/navigation/DashboardTopBar";
import { CreateWorkerForm } from "@/components/forms/CreateWorkerForm";
import { PaySettingsForm } from "@/components/forms/PaySettingsForm";
import { CompanyLogoUploader } from "@/components/forms/CompanyLogoUploader";
import { ScheduleForm } from "@/components/forms/ScheduleForm";

type CompanyInfo = {
  id: string;
  name: string;
  logoUrl: string | null;
  kioskSlug: string;
  kioskPin: string;
};

type StatsItem = { label: string; value: number; hint: string };

type PaymentsInput = {
  id: string;
  employeeId: string;
  employeeNombre: string;
  employeeEmail: string;
  amount: number;
  type: "adelanto" | "quincena" | "pago";
  note: string | null;
  paidAt: string;
};

type DeviceInput = {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type RecordInput = {
  id: string;
  fecha: string;
  empleado: string;
  horaEntrada: string | null;
  horaInicioAlmuerzo: string | null;
  horaFinAlmuerzo: string | null;
  horaSalida: string | null;
  esManual: boolean;
};

type EmployeeInput = {
  id: string;
  nombreCompleto: string;
  user: { email: string };
  isActive: boolean;
  sueldoMensual: number | null;
};

type PaySettingsFormData = {
  sueldoMensualBase: number;
  factorExtraSemana: number;
  weekendDayRate: number;
  weekendExtraHourRate: number;
} | null;

type PaySettings = {
  sueldoMensualBase: number;
} | null;

type Schedule = {
  id: string;
  companyId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipo: "normal" | "viernes" | "finde";
};

type Props = {
  company: CompanyInfo;
  stats: StatsItem[];
  paySettingsForForm: PaySettingsFormData;
  paySettings: PaySettings;
  schedules: Schedule[];
  employees: EmployeeInput[];
  kioskDevices: DeviceInput[];
  records: RecordInput[];
  payments: PaymentsInput[];
};

const sections = [
  { id: "overview", label: "Overview" },
  { id: "combustible", label: "Combustible" },
  { id: "pagos", label: "Pagos" },
  { id: "reportes", label: "Reportes" },
  { id: "kiosco", label: "Kiosco" },
  { id: "trabajadores", label: "Trabajadores" },
  { id: "horarios", label: "Horarios" },
  { id: "marcaciones", label: "Marcaciones" },
  { id: "logo", label: "Logo" },
] as const;

export function EmpresaDashboardShell({
  company,
  stats,
  paySettingsForForm,
  paySettings,
  schedules,
  employees,
  kioskDevices,
  records,
  payments,
}: Props) {
  const [currentSection, setCurrentSection] = useState<(typeof sections)[number]["id"]>("overview");

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <DashboardTopBar role="company_admin" appearance="dark" />

      <div className="no-scrollbar flex gap-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-2xl shadow-[0_12px_50px_rgba(0,0,0,0.45)]">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setCurrentSection(section.id)}
            className={`flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${currentSection === section.id
                ? "border border-cyan-400/60 bg-cyan-500/15 text-cyan-50 shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                : "border border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
              }`}
          >
            <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide">
              {section.label.slice(0, 2)}
            </span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {currentSection === "overview" ? (
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
        ) : null}

        {currentSection === "combustible" ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <FuelPanel />
          </section>
        ) : null}

        {currentSection === "pagos" ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
              <PaySettingsForm settings={paySettingsForForm} />
            </section>
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
              <PaymentsPanel
                employees={employees.map((employee) => ({
                  id: employee.id,
                  nombre: employee.nombreCompleto,
                }))}
                initialPayments={payments}
              />
            </section>
          </div>
        ) : null}

        {currentSection === "reportes" ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <AdminReportPanel
              workers={employees.map((employee) => ({
                id: employee.id,
                nombre: employee.nombreCompleto,
              }))}
              initialWorkerId={employees[0]?.id}
            />
          </section>
        ) : null}

        {currentSection === "kiosco" ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <KioskPanel slug={company.kioskSlug} pin={company.kioskPin} devices={kioskDevices} />
          </section>
        ) : null}

        {currentSection === "trabajadores" ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
              <CreateWorkerForm />
            </section>
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
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
            </section>
          </div>
        ) : null}

        {currentSection === "horarios" ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <ScheduleForm schedules={schedules} />
          </section>
        ) : null}

        {currentSection === "marcaciones" ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <TimeRecordsManager records={records} />
          </section>
        ) : null}

        {currentSection === "logo" ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <CompanyLogoUploader initialLogo={company.logoUrl} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
