"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          sueldoMensual: form.sueldoMensual ? Number(form.sueldoMensual) : null,
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
      className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-300">
            Registro inmediato
          </p>
          <h3 className="text-2xl font-semibold text-white tracking-tight">
            Nuevo trabajador
          </h3>
        </div>
        <span className="rounded-full border border-white/15 px-4 py-1 text-xs font-mono uppercase tracking-[0.4em] text-gray-300">
          LIVE
        </span>
      </div>

      <div className="space-y-4">
        <Input
          label="Nombre completo"
          name="nombreCompleto"
          value={form.nombreCompleto}
          onChange={handleChange}
          required
          placeholder="Ej: Juan Pérez"
        />
        <Input
          label="Correo"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="juan@empresa.com"
        />
        <Input
          label="Contraseña inicial"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          placeholder="••••••••"
        />
        <Input
          label="RUT (obligatorio)"
          name="rut"
          value={form.rut}
          onChange={handleChange}
          required
          placeholder="12.345.678-9"
        />
        <Input
          label="Sueldo mensual (opcional)"
          name="sueldoMensual"
          type="number"
          min={0}
          value={form.sueldoMensual}
          onChange={handleChange}
          placeholder="0"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        isLoading={loading}
        className="w-full bg-gradient-to-r from-violet-700 to-cyan-400 hover:from-violet-600 hover:to-cyan-300 border-none"
      >
        {loading ? "Guardando..." : "Crear trabajador"}
      </Button>
    </form>
  );
}

