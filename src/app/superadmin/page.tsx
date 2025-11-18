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
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <DashboardTopBar role="superadmin" />
        <header className="rounded-3xl bg-gradient-to-r from-blue-900 to-slate-900 p-8 text-white shadow-lg">
          <h1 className="text-3xl font-semibold">
            Panel Administrador General
          </h1>
          <p className="max-w-2xl text-sm text-slate-200">
            Gestiona empresas, administradores y estado de cada tenant.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <CreateCompanyForm />
          <CreateCompanyAdminForm companies={companiesForAdminForm} />
          <PromoteWorkerToAdminForm companies={companiesForPromotion} />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">
            Empresas registradas
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="p-2">Nombre</th>
                  <th className="p-2">RUT</th>
                  <th className="p-2">Contacto</th>
                  <th className="p-2">Trabajadores</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-t border-slate-100">
                    <td className="p-2 font-medium text-slate-800">
                      {company.name}
                    </td>
                    <td className="p-2">{company.rut ?? "-"}</td>
                    <td className="p-2">
                      <p>{company.emailContacto ?? "Sin email"}</p>
                      <p className="text-xs text-slate-500">
                        {company.telefonoContacto ?? ""}
                      </p>
                    </td>
                    <td className="p-2">
                      {company.employees?.length ?? 0}
                    </td>
                    <td className="p-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          company.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
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
