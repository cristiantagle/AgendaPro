"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  settings: {
    sueldoMensualBase: number;
    factorExtraSemana: number;
    weekendDayRate: number;
    weekendExtraHourRate: number;
  } | null;
};

export function PaySettingsForm({ settings }: Props) {
  const [form, setForm] = useState({
    sueldoMensualBase: settings?.sueldoMensualBase ?? 500000,
    factorExtraSemana: settings?.factorExtraSemana ?? 1.5,
    weekendDayRate: settings?.weekendDayRate ?? 60000,
    weekendExtraHourRate: settings?.weekendExtraHourRate ?? 8000,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/company/pay-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar");
      }

      setMessage("Parámetros guardados correctamente.");
      router.refresh();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-slate-200 bg-white/70 p-5"
    >
      <h3 className="text-lg font-semibold text-slate-800">
        Parámetros de pago
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            { key: "sueldoMensualBase", label: "Sueldo mensual base ($)" },
            { key: "factorExtraSemana", label: "Factor extra semana" },
            { key: "weekendDayRate", label: "Pago día trabajado finde ($)" },
            { key: "weekendExtraHourRate", label: "Valor hora extra finde ($)" },
          ] as const
        ).map((field) => (
          <label
            key={field.key}
            className="text-sm font-medium text-slate-600"
          >
            {field.label}
            <input
              name={field.key}
              type="number"
              step="0.01"
              required
              value={form[field.key]}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        ))}
      </div>
      {message ? (
        <p className="text-sm text-emerald-600">{message}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
