"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CompanyOption = {
  id: string;
  name: string;
};

type FormState = {
  companyId: string;
  nombreCompleto: string;
  email: string;
  password: string;
  rut: string;
};

type Props = {
  companies: CompanyOption[];
};

const emptyState: FormState = {
  companyId: "",
  nombreCompleto: "",
  email: "",
  password: "",
  rut: "",
};

export function WorkerSelfSignupForm({ companies }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyState,
    companyId: companies[0]?.id ?? "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!form.companyId && companies[0]) {
      setForm((prev) => ({ ...prev, companyId: companies[0].id }));
    }
  }, [companies, form.companyId]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/public/register-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "No se pudo completar el registro");
      }

      setSuccessMessage(
        "Registro completado. Ya puedes iniciar sesión con tus credenciales.",
      );
      setForm({
        ...emptyState,
        companyId: companies[0]?.id ?? "",
      });
      router.prefetch("/login");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (companies.length === 0) {
    return (
      <div className="rounded-3xl border border-amber-400/40 bg-amber-400/10 p-6 text-center text-amber-100 backdrop-blur-xl">
        <p className="font-semibold">Aún no hay empresas disponibles.</p>
        <p className="text-sm text-amber-200/90">
          Pídele al superadmin que registre tu empresa antes de crear tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
    >
      <h2 className="text-xl font-semibold text-white">
        Únete como trabajador
      </h2>
      <p className="text-sm text-slate-200/80">
        Ingresa tus datos y selecciona la empresa a la que perteneces para
        activar tu cuenta. El administrador podrá aprobar o ajustar tus datos
        luego.
      </p>

      <label className="text-sm font-semibold text-slate-100">
        Empresa
        <select
          name="companyId"
          value={form.companyId}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold text-slate-100">
        Nombre completo
        <input
          name="nombreCompleto"
          value={form.nombreCompleto}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
        />
      </label>

      <label className="text-sm font-semibold text-slate-100">
        Correo laboral
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
        />
      </label>

      <label className="text-sm font-semibold text-slate-100">
        Crea una contraseña
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          minLength={8}
          required
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
        />
      </label>

      <label className="text-sm font-semibold text-slate-100">
        RUT (opcional)
        <input
          name="rut"
          value={form.rut}
          onChange={handleChange}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
        />
      </label>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-300">{successMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:shadow-[0_0_25px_rgba(16,185,129,0.45)] disabled:opacity-60"
      >
        {loading ? "Registrando..." : "Registrarme"}
      </button>
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/30"
      >
        Ya tengo cuenta
      </button>
    </form>
  );
}
