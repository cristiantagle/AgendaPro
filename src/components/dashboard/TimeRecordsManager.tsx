"use client";

import { useState } from "react";

type RecordItem = {
  id: string;
  fecha: string;
  empleado: string;
  horaEntrada?: string | null;
  horaInicioAlmuerzo?: string | null;
  horaFinAlmuerzo?: string | null;
  horaSalida?: string | null;
  esManual: boolean;
};

type Props = {
  records: RecordItem[];
};

const emptyForm = {
  fecha: "",
  horaEntrada: "",
  horaInicioAlmuerzo: "",
  horaFinAlmuerzo: "",
  horaSalida: "",
  notas: "",
};

const timeFormatter = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const fmt = (value?: string | null) => (value ? timeFormatter.format(new Date(value)) : "-");

export function TimeRecordsManager({ records }: Props) {
  const [items, setItems] = useState(records);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);

  const handleSelect = (item: RecordItem) => {
    setSelected(item);
    setForm({
      fecha: item.fecha.slice(0, 10),
      horaEntrada: item.horaEntrada?.slice(0, 16) ?? "",
      horaInicioAlmuerzo: item.horaInicioAlmuerzo?.slice(0, 16) ?? "",
      horaFinAlmuerzo: item.horaFinAlmuerzo?.slice(0, 16) ?? "",
      horaSalida: item.horaSalida?.slice(0, 16) ?? "",
      notas: "",
    });
    setMessage(null);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;

    const payload = {
      ...form,
      horaEntrada: form.horaEntrada || null,
      horaInicioAlmuerzo: form.horaInicioAlmuerzo || null,
      horaFinAlmuerzo: form.horaFinAlmuerzo || null,
      horaSalida: form.horaSalida || null,
    };

    try {
      const response = await fetch(`/api/time-records/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Error al actualizar la marcación");
      }

      const data = await response.json();
      setItems((prev) =>
        prev.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                fecha: data.record.fecha,
                horaEntrada: data.record.horaEntrada,
                horaInicioAlmuerzo: data.record.horaInicioAlmuerzo,
                horaFinAlmuerzo: data.record.horaFinAlmuerzo,
                horaSalida: data.record.horaSalida,
                esManual: data.record.esManual,
              }
            : item,
        ),
      );
      setMessage("Marcación actualizada.");
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const fieldClasses =
    "mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none";

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-100 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-300">
            Timeline
          </p>
          <h3 className="text-2xl font-semibold text-white">
            Marcaciones recientes
          </h3>
        </div>
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
          {items.length} registros
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[760px] text-sm">
          <thead>
            <tr className="bg-white/5 text-left font-mono text-[11px] uppercase tracking-[0.3em] text-gray-400">
              <th className="p-3">Fecha</th>
              <th className="p-3">Trabajador</th>
              <th className="p-3">Entrada</th>
              <th className="p-3">Inicio alm.</th>
              <th className="p-3">Fin alm.</th>
              <th className="p-3">Salida</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((record) => (
              <tr
                key={record.id}
                className="border-t border-white/5 bg-black/30 transition hover:bg-white/5"
              >
                <td className="p-3 font-mono text-xs text-gray-300">
                  {record.fecha.slice(0, 10)}
                </td>
                <td className="p-3">{record.empleado}</td>
                <td className="p-3">{fmt(record.horaEntrada)}</td>
                <td className="p-3">{fmt(record.horaInicioAlmuerzo)}</td>
                <td className="p-3">{fmt(record.horaFinAlmuerzo)}</td>
                <td className="p-3">{fmt(record.horaSalida)}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => handleSelect(record)}
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300 underline decoration-dotted"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5"
        >
          <h4 className="font-semibold text-white">
            Editando registro de {selected.empleado}
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
              Fecha
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
                className={fieldClasses}
              />
            </label>
            {["horaEntrada", "horaInicioAlmuerzo", "horaFinAlmuerzo", "horaSalida"].map(
              (field) => (
                <label
                  key={field}
                  className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400"
                >
                  {field.replace("hora", "Hora ")}
                  <input
                    type="datetime-local"
                    name={field}
                    value={(form as Record<string, string>)[field] ?? ""}
                    onChange={handleChange}
                    className={fieldClasses}
                  />
                </label>
              ),
            )}
          </div>
          <label className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
            Notas
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              className={`${fieldClasses} h-24`}
            />
          </label>
          {message ? (
            <p className="text-sm text-emerald-400">{message}</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-violet-700 to-cyan-400 px-4 py-3 font-semibold text-white shadow-[0_0_25px_rgba(34,211,238,0.3)]"
          >
            Guardar corrección
          </button>
        </form>
      ) : null}
    </div>
  );
}
