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

  const badgeClasses = (isActive: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${
      isActive
        ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
        : "bg-white/5 text-gray-400 border border-white/10"
    }`;

  return (
    <>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-100 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-300">
              Workforce
            </p>
            <h2 className="text-2xl font-semibold">Trabajadores</h2>
          </div>
          <p className="text-xs text-gray-400 font-mono uppercase tracking-[0.3em]">
            {rows.length} registros
          </p>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left font-mono text-[11px] uppercase tracking-[0.3em] text-gray-400">
                <th className="p-3">Nombre</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Sueldo mensual</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((worker) => (
                <tr
                  key={worker.id}
                  className="border-t border-white/5 bg-black/30 transition hover:bg-white/5"
                >
                  <td className="p-3">{worker.nombre}</td>
                  <td className="p-3 text-gray-400">{worker.email}</td>
                  <td className="p-3">
                    <span className={badgeClasses(worker.isActive)}>
                      {worker.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-sm text-emerald-200">
                    {currencyFormatter.format(
                      worker.sueldoMensual ?? sueldoBase ?? 0,
                    )}
                  </td>
                  <td className="p-3 text-right space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleStatus(worker)}
                      disabled={togglingId === worker.id}
                      className="block w-full text-xs font-semibold uppercase tracking-[0.3em] text-gray-300 underline-offset-4 hover:text-white disabled:opacity-50"
                    >
                      {worker.isActive ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal(worker)}
                      className="block w-full text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300 underline decoration-dotted"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0b12] p-6 text-gray-100 shadow-[0_25px_70px_rgba(0,0,0,0.8)]">
            <h3 className="text-xl font-semibold text-white">
              Actualizar sueldo mensual
            </h3>
            <p className="text-sm text-gray-400">{currentWorker?.nombre}</p>
            <label className="mt-4 block text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
              Sueldo mensual ($)
              <input
                type="number"
                min="0"
                step="1000"
                value={formValue}
                onChange={(event) => setFormValue(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
              />
            </label>
            {message ? (
              <p className="mt-3 text-sm text-red-400">{message}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:border-white/30"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-violet-700 to-cyan-400 px-5 py-2 text-sm font-semibold text-white shadow-[0_0_25px_rgba(109,40,217,0.4)] disabled:opacity-50"
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
