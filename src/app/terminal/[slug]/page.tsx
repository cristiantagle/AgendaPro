import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { kioskCookieName } from "@/lib/kiosk";
import { prisma } from "@/lib/prisma";
import { KioskTerminal } from "@/components/kiosk/KioskTerminal";

type Params = {
  slug: string;
};

export default async function KioskPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const company = await prisma.company.findFirst({
    where: { kioskSlug: resolved.slug },
    include: {
      employees: {
        where: { isActive: true },
        select: {
          id: true,
          nombreCompleto: true,
        },
        orderBy: { nombreCompleto: "asc" },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(kioskCookieName(company.kioskSlug))?.value;
  let deviceName: string | null = null;

  if (token) {
    const device = await prisma.kioskDevice.findUnique({
      where: { token },
      select: { name: true, companyId: true },
    });
    if (device && device.companyId === company.id) {
      deviceName = device.name ?? null;
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 p-6 text-slate-900">
      <KioskTerminal
        slug={company.kioskSlug}
        companyName={company.name}
        logoUrl={company.logoUrl ?? undefined}
        employees={company.employees.map((employee) => ({
          id: employee.id,
          nombreCompleto: employee.nombreCompleto,
        }))}
        initialDeviceName={deviceName}
      />
    </main>
  );
}
