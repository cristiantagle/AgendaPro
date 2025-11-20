import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-slate-50">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-violet-700/25 blur-[140px]" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-cyan-400/20 blur-[150px]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-12">
        <div className="grid w-full gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:grid-cols-[1.1fr,0.9fr]">
          <div className="flex flex-col justify-center space-y-4">
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
                Asistencia Pro
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Control de asistencia cinematográfico
            </h1>
            <p className="max-w-xl text-sm text-slate-200/90">
              Inicia sesión para administrar empresas, kioscos biométricos y
              reportes en tiempo real. Todo corre en Supabase con sincronización
              instantánea.
            </p>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.35em] text-slate-300">
              <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1">
                Multiempresa
              </span>
              <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1">
                PWA biométrica
              </span>
              <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1">
                Reportes PDF/CSV
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <LoginForm />
            <p className="text-center text-sm text-slate-200/80">
              ¿Eres trabajador nuevo?{" "}
              <Link
                href="/registrarse"
                className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
