import { redirect } from "next/navigation";

import { CreateCompanyAdminForm } from "@/components/forms/CreateCompanyAdminForm";
import { CreateCompanyForm } from "@/components/forms/CreateCompanyForm";
import { PromoteWorkerToAdminForm } from "@/components/forms/PromoteWorkerToAdminForm";
import { DashboardTopBar } from "@/components/navigation/DashboardTopBar";
import { getSession } from "@/lib/auth";
import { listCompaniesWithEmployees } from "@/lib/repos/companies";

export default async function SuperadminPage() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    redirect("/");
  }

  const companies = await listCompaniesWithEmployees();

  const companiesForAdminForm = companies.map((company) => ({
    id: company.id,
    name: company.name,
  }));

  const companiesForPromotion = companies.map((company) => ({
    id: company.id,
    name: company.name,
    workers:
      company.employees
        ?.filter((employee) => employee.user?.role === "worker")
        .map((employee) => ({
          id: employee.id,
          nombreCompleto: employee.nombreCompleto,
          email: employee.user?.email ?? "",
        })) ?? [],
  }));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-gray-100">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-violet-700/25 blur-[150px]" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-cyan-400/20 blur-[180px]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <DashboardTopBar role="superadmin" appearance="dark" />
        <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-violet-900/50 via-black/40 to-slate-900/50 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.35em] text-cyan-200">
            Control maestro
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-white">
            Panel Administrador General
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200/85">
            Gestiona empresas, administradores y estado de cada tenant con la
            misma estética glassmorphism que el panel de empresa y kioscos.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <CreateCompanyForm />
          <CreateCompanyAdminForm companies={companiesForAdminForm} />
          <PromoteWorkerToAdminForm companies={companiesForPromotion} />
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">
              Empresas registradas
            </h2>
            <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.35em] text-gray-300">
              {companies.length} tenants
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-sm text-gray-100">
              <thead>
                <tr className="bg-white/5 text-left font-mono uppercase tracking-[0.3em] text-[11px] text-gray-400">
                  <th className="p-3">Nombre</th>
                  <th className="p-3">RUT</th>
                  <th className="p-3">Contacto</th>
                  <th className="p-3">Trabajadores</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="border-t border-white/5 bg-black/30 transition hover:bg-white/5"
                  >
                    <td className="p-3 font-medium text-white">
                      {company.name}
                    </td>
                    <td className="p-3 text-slate-200">{company.rut ?? "-"}</td>
                    <td className="p-3">
                      <p>{company.emailContacto ?? "Sin email"}</p>
                      <p className="text-xs text-slate-400">
                        {company.telefonoContacto ?? ""}
                      </p>
                    </td>
                    <td className="p-3">
                      {company.employees?.length ?? 0}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          company.isActive
                            ? "border border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                            : "border border-white/10 bg-white/5 text-slate-200"
                        }`}
                      >
                        {company.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
