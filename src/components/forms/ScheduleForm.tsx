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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-slate-200 bg-white/70 p-5"
    >
      <h3 className="text-lg font-semibold text-slate-800">
        Horarios estándar
      </h3>
      <div className="grid gap-4">
        {items.map((item, index) => (
          <div
            key={`${item.diaSemana}-${item.tipo}`}
            className="grid gap-3 rounded-lg border border-slate-100 p-3 md:grid-cols-4"
          >
            <p className="font-medium text-slate-700">
              {DAY_LABELS[item.diaSemana]}
            </p>
            <label className="text-sm text-slate-600">
              Inicio
              <input
                type="time"
                value={item.horaInicio}
                onChange={(event) =>
                  updateItem(index, "horaInicio", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              Fin
              <input
                type="time"
                value={item.horaFin}
                onChange={(event) =>
                  updateItem(index, "horaFin", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              Tipo
              <select
                value={item.tipo}
                onChange={(event) =>
                  updateItem(index, "tipo", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1"
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
        <p className="text-sm text-emerald-600">{message}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar horarios"}
      </button>
    </form>
  );
}
