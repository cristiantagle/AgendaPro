"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Schedule = {
  id?: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipo: string;
};

type Props = {
  schedules: Schedule[];
};

const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function ScheduleForm({ schedules }: Props) {
  const [items, setItems] = useState<Schedule[]>(schedules);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const updateItem = (
    index: number,
    field: keyof Schedule,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/company/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedules: items.map(({ diaSemana, horaInicio, horaFin, tipo }) => ({
            diaSemana,
            horaInicio,
            horaFin,
            tipo,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Error al guardar los horarios");
      }

      setMessage("Horarios actualizados.");
      router.refresh();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const fieldClasses =
    "mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white transition focus:border-cyan-400 focus:outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-200 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-300">
            Grid horario
          </p>
          <h3 className="text-2xl font-semibold text-white">
            Horarios estándar
          </h3>
        </div>
        <span className="text-xs text-gray-400">
          {items.length} franjas activas
        </span>
      </div>
      <div className="grid gap-4">
        {items.map((item, index) => (
          <div
            key={`${item.diaSemana}-${item.tipo}`}
            className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 md:grid-cols-4"
          >
            <p className="font-semibold text-white">{DAY_LABELS[item.diaSemana]}</p>
            <label className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
              Inicio
              <input
                type="time"
                value={item.horaInicio}
                onChange={(event) =>
                  updateItem(index, "horaInicio", event.target.value)
                }
                className={fieldClasses}
              />
            </label>
            <label className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
              Fin
              <input
                type="time"
                value={item.horaFin}
                onChange={(event) =>
                  updateItem(index, "horaFin", event.target.value)
                }
                className={fieldClasses}
              />
            </label>
            <label className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
              Tipo
              <select
                value={item.tipo}
                onChange={(event) =>
                  updateItem(index, "tipo", event.target.value)
                }
                className={`${fieldClasses} bg-black/50`}
              >
                <option value="normal">Normal</option>
                <option value="viernes">Viernes</option>
                <option value="finde">Fin de semana</option>
              </select>
            </label>
          </div>
        ))}
      </div>
      {message ? (
        <p className="text-sm text-emerald-400">{message}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-gradient-to-r from-violet-700 to-cyan-400 px-4 py-3 font-semibold text-white shadow-[0_0_25px_rgba(109,40,217,0.5)] transition hover:scale-[1.01] disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar horarios"}
      </button>
    </form>
  );
}
