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
      className="space-y-4 rounded-xl border border-slate-200 bg-white/70 p-5"
    >
      <h3 className="text-lg font-semibold text-slate-800">
        Crear nueva empresa
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-600">
          Nombre
          <input
            required
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Constructora Ejemplo"
          />
        </label>
        <label className="text-sm font-medium text-slate-600">
          RUT
          <input
            name="rut"
            value={form.rut}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="76.123.456-7"
          />
        </label>
        <label className="text-sm font-medium text-slate-600">
          Email contacto
          <input
            name="emailContacto"
            type="email"
            value={form.emailContacto}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-600">
          Teléfono
          <input
            name="telefonoContacto"
            value={form.telefonoContacto}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Crear empresa"}
      </button>
    </form>
  );
}
