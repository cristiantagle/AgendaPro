import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkerSelfSignupForm } from "@/components/forms/WorkerSelfSignupForm";
import { getSession } from "@/lib/auth";
import { listCompanies } from "@/lib/repos/companies";

export default async function WorkerSignupPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const companies = (await listCompanies())
    .filter((company) => company.isActive)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((company) => ({ id: company.id, name: company.name }));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-slate-50">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-violet-700/25 blur-[150px]" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-cyan-400/20 blur-[180px]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Image
                src="/tagle-labs-logo.svg"
                alt="Tagle Labs"
                width={220}
                height={64}
                className="h-12 w-auto"
                priority
              />
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-emerald-200">
                Registro
              </span>
            </div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">
              Trabajador
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Únete a la red de asistencia de tu empresa
            </h1>
            <p className="text-sm text-slate-200/90">
              Selecciona tu empresa, crea tu contraseña y comienza a registrar
              asistencias desde el panel de trabajador o la PWA de kiosco.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Validación automática con tu empresa",
                "Contraseña segura definida por ti",
                "Acceso inmediato al panel",
                "Soporte directo de Tagle Labs",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-300">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
              >
                Inicia sesión aquí
              </Link>
            </p>
            <p className="text-xs text-slate-300">
              Soporte directo:{" "}
              <a
                href="https://wa.me/56956804513"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald-300 hover:underline"
              >
                +56 9 5680 4513
              </a>{" "}
              ·{" "}
              <a
                href="mailto:cristian.gonzalez.gt@gmail.com"
                className="font-semibold text-emerald-300 hover:underline"
              >
                cristian.gonzalez.gt@gmail.com
              </a>
            </p>
          </div>

          <WorkerSelfSignupForm companies={companies} />
        </div>
      </div>
    </main>
  );
}
