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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-white via-slate-100 to-slate-200 p-6">
      <div className="mb-8 flex flex-col items-center text-center text-slate-900">
        <Image
          src="/tagle-labs-logo.svg"
          alt="Tagle Labs"
          width={240}
          height={72}
          className="h-16 w-auto"
          priority
        />
        <p className="mt-3 max-w-lg text-sm text-slate-600">
          Asistencia Pro es una plataforma creada por Cristian Tagle para
          automatizar marcajes, horas extra y cálculo de sueldos.
        </p>
      </div>
      <div className="space-y-4">
        <LoginForm />
        <p className="text-center text-sm text-slate-600">
          ¿Eres trabajador nuevo?{" "}
          <Link
            href="/registrarse"
            className="font-semibold text-blue-600 underline-offset-4 hover:underline"
          >
            Regístrate aquí
          </Link>
        </p>
      </div>
    </main>
  );
}
