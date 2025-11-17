"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const initialState = {
  email: "",
  password: "",
  nombreCompleto: "",
  rut: "",
  sueldoMensual: "",
};

export function CreateWorkerForm() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sueldoMensual: form.sueldoMensual
            ? Number(form.sueldoMensual)
            : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Error al crear trabajador");
      }

      setForm(initialState);
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
      className="space-y-3 rounded-xl border border-slate-200 bg-white/70 p-4"
    >
      <h3 className="text-lg font-semibold text-slate-800">
        Nuevo trabajador
      </h3>
      <label className="text-sm font-medium text-slate-600">
        Nombre completo
        <input
          name="nombreCompleto"
          value={form.nombreCompleto}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        Correo
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        Contraseña inicial
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        RUT
        <input
          name="rut"
          value={form.rut}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        Sueldo mensual (opcional)
        <input
          name="sueldoMensual"
          type="number"
          min="0"
          value={form.sueldoMensual}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Crear trabajador"}
      </button>
    </form>
  );
}
