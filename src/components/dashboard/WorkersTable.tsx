"use client";

import { useMemo, useState } from "react";

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

type WorkerRow = {
  id: string;
  nombre: string;
  email: string;
  isActive: boolean;
  sueldoMensual: number | null;
};

type Props = {
  workers: WorkerRow[];
  sueldoBase: number;
};

export function WorkersTable({ workers, sueldoBase }: Props) {
  const [rows, setRows] = useState(workers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const currentWorker = useMemo(
    () => rows.find((worker) => worker.id === editingId),
    [rows, editingId],
  );

  const openModal = (worker: WorkerRow) => {
    setEditingId(worker.id);
    setFormValue(
      (worker.sueldoMensual ?? sueldoBase ?? 0).toString(),
    );
    setMessage(null);
  };

  const closeModal = () => {
    setEditingId(null);
    setFormValue("");
    setSaving(false);
  };

  const submit = async () => {
    if (!editingId) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        sueldoMensual: formValue ? Number(formValue) : null,
      };
      const res = await fetch(`/api/workers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No se pudo actualizar el sueldo");
      }
      setRows((prev) =>
        prev.map((worker) =>
          worker.id === editingId
            ? {
                ...worker,
                sueldoMensual: payload.sueldoMensual,
              }
            : worker,
        ),
      );
      setMessage("Sueldo actualizado.");
      closeModal();
    } catch (error) {
      setMessage((error as Error).message);
      setSaving(false);
    }
  };

  const toggleStatus = async (worker: WorkerRow) => {
    setMessage(null);
    setTogglingId(worker.id);
    try {
      const res = await fetch(`/api/workers/${worker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !worker.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error ?? "No se pudo actualizar el estado del trabajador",
        );
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === worker.id ? { ...row, isActive: !row.isActive } : row,
        ),
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">
          Trabajadores
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500">
                <th className="p-2">Nombre</th>
                <th className="p-2">Correo</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Sueldo mensual</th>
                <th className="p-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((worker) => (
                <tr key={worker.id} className="border-t border-slate-100">
                  <td className="p-2">{worker.nombre}</td>
                  <td className="p-2">{worker.email}</td>
                  <td className="p-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        worker.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {worker.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-2">
                    {currencyFormatter.format(
                      worker.sueldoMensual ?? sueldoBase ?? 0,
                    )}
                  </td>
                  <td className="p-2 text-right space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleStatus(worker)}
                      disabled={togglingId === worker.id}
                      className="block w-full text-sm font-semibold text-slate-600 underline disabled:opacity-50"
                    >
                      {worker.isActive ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal(worker)}
                      className="block w-full text-sm font-semibold text-blue-600 underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">
              Actualizar sueldo mensual
            </h3>
            <p className="text-sm text-slate-500">
              {currentWorker?.nombre}
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Sueldo mensual ($)
              <input
                type="number"
                min="0"
                step="1000"
                value={formValue}
                onChange={(event) => setFormValue(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            {message ? (
              <p className="mt-2 text-sm text-red-600">{message}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
