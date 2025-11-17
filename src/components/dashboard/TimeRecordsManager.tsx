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

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white/70 p-5">
      <h3 className="text-lg font-semibold text-slate-800">
        Marcaciones recientes
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-2">Fecha</th>
              <th className="p-2">Trabajador</th>
              <th className="p-2">Entrada</th>
              <th className="p-2">Inicio alm.</th>
              <th className="p-2">Fin alm.</th>
              <th className="p-2">Salida</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((record) => (
              <tr key={record.id} className="border-t border-slate-100">
                <td className="p-2">{record.fecha.slice(0, 10)}</td>
                <td className="p-2">{record.empleado}</td>
                <td className="p-2">{fmt(record.horaEntrada)}</td>
                <td className="p-2">{fmt(record.horaInicioAlmuerzo)}</td>
                <td className="p-2">{fmt(record.horaFinAlmuerzo)}</td>
                <td className="p-2">{fmt(record.horaSalida)}</td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => handleSelect(record)}
                    className="text-blue-600 underline"
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
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-slate-50 p-4">
          <h4 className="font-semibold text-slate-700">
            Editando registro de {selected.empleado}
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Fecha
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            {["horaEntrada", "horaInicioAlmuerzo", "horaFinAlmuerzo", "horaSalida"].map(
              (field) => (
                <label
                  key={field}
                  className="text-sm text-slate-600"
                >
                  {field.replace("hora", "Hora ")}
                  <input
                    type="datetime-local"
                    name={field}
                    value={(form as Record<string, string>)[field] ?? ""}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              ),
            )}
          </div>
          <label className="text-sm text-slate-600">
            Notas
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          {message ? (
            <p className="text-sm text-emerald-600">{message}</p>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500"
          >
            Guardar corrección
          </button>
        </form>
      ) : null}
    </div>
  );
}
