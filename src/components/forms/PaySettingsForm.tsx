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

  const inputClasses =
    "mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-gray-400 transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
    >
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-violet-300">
          Pay matrix
        </p>
        <h3 className="text-2xl font-semibold text-white tracking-tight">
          Parámetros de pago
        </h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
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
            className="text-sm font-medium text-gray-200"
          >
            {field.label}
            <input
              name={field.key}
              type="number"
              step="0.01"
              required
              value={form[field.key]}
              onChange={handleChange}
              className={inputClasses}
            />
          </label>
        ))}
      </div>
      {message ? (
        <p className="text-sm text-emerald-400">{message}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-700 px-4 py-3 font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition hover:scale-[1.01] disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
