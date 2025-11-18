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

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 p-6 text-slate-900">
      <KioskTerminal
        companyId={company.id}
        slug={company.kioskSlug}
        companyName={company.name}
        logoUrl={company.logoUrl ?? undefined}
        employees={employees}
        initialDeviceName={deviceName}
      />
    </main>
  );
}
