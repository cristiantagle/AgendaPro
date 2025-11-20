"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const initialForm = {
  name: "",
  rut: "",
  emailContacto: "",
  telefonoContacto: "",
};

export function CreateCompanyForm() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Error al crear la empresa");
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
      className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
    >
      <h3 className="text-lg font-semibold text-white">
        Crear nueva empresa
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-100">
          Nombre
          <input
            required
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
            placeholder="Constructora Ejemplo"
          />
        </label>
        <label className="text-sm font-medium text-slate-100">
          RUT
          <input
            name="rut"
            value={form.rut}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
            placeholder="76.123.456-7"
          />
        </label>
        <label className="text-sm font-medium text-slate-100">
          Email contacto
          <input
            name="emailContacto"
            type="email"
            value={form.emailContacto}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
          />
        </label>
        <label className="text-sm font-medium text-slate-100">
          Teléfono
          <input
            name="telefonoContacto"
            value={form.telefonoContacto}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Crear empresa"}
      </button>
    </form>
  );
}
