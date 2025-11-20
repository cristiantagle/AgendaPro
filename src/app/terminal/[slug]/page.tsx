import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { kioskCookieName } from "@/lib/kiosk";
import { KioskTerminal } from "@/components/kiosk/KioskTerminal";
import { getCompanyBySlug } from "@/lib/repos/companies";
import { getDeviceByToken } from "@/lib/repos/kiosk-devices";
import { listActiveEmployeesForCompany } from "@/lib/repos/employees";

type Params = {
  slug: string;
};

export default async function KioskPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const company = await getCompanyBySlug(resolved.slug);

  if (!company) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(kioskCookieName(company.kioskSlug))?.value;
  let deviceName: string | null = null;

  if (token) {
    const device = await getDeviceByToken(token);
    if (device && device.companyId === company.id) {
      deviceName = device.name ?? null;
    }
  }

  const employees = await listActiveEmployeesForCompany(company.id);
  const sortedEmployees = employees.slice().sort((a, b) => {
    if (a.role === b.role) {
      return a.nombreCompleto.localeCompare(b.nombreCompleto);
    }
    return a.role === "company_admin" ? -1 : 1;
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-gray-100">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-violet-700/25 blur-[140px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-cyan-400/20 blur-[160px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-400/20 blur-[150px]" />
      </div>
      <div className="relative z-10 px-4 py-8 sm:px-6 lg:px-8">
        <KioskTerminal
          companyId={company.id}
          slug={company.kioskSlug}
          companyName={company.name}
          logoUrl={company.logoUrl ?? undefined}
          employees={sortedEmployees}
          initialDeviceName={deviceName}
        />
      </div>
    </main>
  );
}
