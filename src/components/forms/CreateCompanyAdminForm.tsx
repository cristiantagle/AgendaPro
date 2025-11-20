"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  companies: Array<{ id: string; name: string }>;
};

const initialForm = {
  email: "",
  password: "",
  companyId: "",
};

export function CreateCompanyAdminForm({ companies }: Props) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

    try {
      const response = await fetch("/api/company-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Error al crear el administrador");
      }

      setForm(initialForm);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
    >
      <h3 className="text-lg font-semibold text-white">
        Asignar administrador de empresa
      </h3>
      <label className="text-sm font-medium text-slate-100">
        Empresa
        <select
          name="companyId"
          value={form.companyId}
          required
          onChange={handleChange}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
        >
          <option value="">Seleccione...</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-100">
        Correo
        <input
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
        />
      </label>
      <label className="text-sm font-medium text-slate-100">
        Contraseña temporal
        <input
          name="password"
          type="password"
          required
          value={form.password}
          onChange={handleChange}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:shadow-[0_0_20px_rgba(59,130,246,0.45)] disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Crear administrador"}
      </button>
    </form>
  );
}
