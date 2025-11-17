import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkerSelfSignupForm } from "@/components/forms/WorkerSelfSignupForm";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WorkerSignupPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-200 p-6 text-slate-900">
      <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl bg-white p-8 shadow-2xl md:grid-cols-2">
        <div className="space-y-5">
          <Image
            src="/tagle-labs-logo.svg"
            alt="Tagle Labs"
            width={220}
            height={64}
            className="h-12 w-auto"
            priority
          />
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
            Registro de trabajadores
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Únete a la red de asistencia de tu empresa
          </h1>
          <p className="text-sm text-slate-600">
            El administrador general ya configuró las empresas disponibles. Solo
            elige la tuya, ingresa tus datos y comenzarás a registrar
            asistencias desde la app móvil o web.
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>• Validación automática con tu empresa</li>
            <li>• Contraseña segura definida por ti</li>
            <li>• Acceso inmediato al panel de trabajador</li>
          </ul>
          <p className="text-xs text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 underline-offset-4 hover:underline"
            >
              Inicia sesión aquí
            </Link>
          </p>
          <p className="text-xs text-slate-500">
            Soporte directo:{" "}
            <a
              href="https://wa.me/56956804513"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-600 hover:underline"
            >
              +56 9 5680 4513
            </a>{" "}
            ·{" "}
            <a
              href="mailto:cristian.gonzalez.gt@gmail.com"
              className="font-semibold text-emerald-600 hover:underline"
            >
              cristian.gonzalez.gt@gmail.com
            </a>
          </p>
        </div>

        <WorkerSelfSignupForm companies={companies} />
      </div>
    </main>
  );
}
