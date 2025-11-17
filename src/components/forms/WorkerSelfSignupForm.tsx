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
      <div className="rounded-2xl border border-amber-200 bg-white/80 p-6 text-center text-amber-800">
        <p className="font-semibold">Aún no hay empresas disponibles.</p>
        <p className="text-sm">
          Pídele al superadmin que registre tu empresa antes de crear tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg"
    >
      <h2 className="text-xl font-semibold text-slate-900">
        Únete como trabajador
      </h2>
      <p className="text-sm text-slate-500">
        Ingresa tus datos y selecciona la empresa a la que perteneces para
        activar tu cuenta. El administrador podrá aprobar o ajustar tus datos
        luego.
      </p>

      <label className="text-sm font-semibold text-slate-700">
        Empresa
        <select
          name="companyId"
          value={form.companyId}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold text-slate-700">
        Nombre completo
        <input
          name="nombreCompleto"
          value={form.nombreCompleto}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="text-sm font-semibold text-slate-700">
        Correo laboral
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="text-sm font-semibold text-slate-700">
        Crea una contraseña
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          minLength={8}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="text-sm font-semibold text-slate-700">
        RUT (opcional)
        <input
          name="rut"
          value={form.rut}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Registrando..." : "Registrarme"}
      </button>
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="w-full rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Ya tengo cuenta
      </button>
    </form>
  );
}
