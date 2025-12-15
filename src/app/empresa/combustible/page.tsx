import { redirect } from "next/navigation";
import { Fuel, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { FuelPanel } from "@/components/dashboard/FuelPanel";
import { getSession } from "@/lib/auth";
import { getCompanyById } from "@/lib/repos/companies";

export default async function CombustiblePage() {
    const session = await getSession();
    if (!session || session.role !== "company_admin") {
        redirect("/");
    }

    const company = await getCompanyById(session.companyId!);
    if (!company) {
        redirect("/login");
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(80,117,255,0.14),transparent_45%),radial-gradient(circle_at_78%_15%,rgba(34,211,238,0.16),transparent_40%),#04060c] text-gray-100">
            <div className="noise-overlay" aria-hidden="true" />
            <div className="grid-overlay" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-40 top-0 h-72 w-72 rounded-full bg-violet-700/25 blur-[140px]" />
                <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-cyan-400/18 blur-[160px]" />
                <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-500/18 blur-[140px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/empresa"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al Dashboard
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 p-3">
                            <Fuel className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Control de Combustible</h1>
                            <p className="text-gray-400">{company.name}</p>
                        </div>
                    </div>
                </div>

                {/* Panel */}
                <FuelPanel />
            </div>
        </main>
    );
}
