"use client";

import { useEffect, useMemo, useState } from "react";

type WorkerOption = {
  id: string;
  nombre: string;
};

type ReportSummary = {
  employee: { nombreCompleto: string };
  company: { name: string };
  dias: Array<{
    fecha: string;
    horasNormales: number;
    horasExtra: number;
    horasFindeNormales: number;
    horasFindeExtra: number;
    montoTotalDia: number;
  }>;
  diasTrabajados: number;
  horasNormales: number;
  horasExtra: number;
  horasFindeNormales: number;
  horasFindeExtra: number;
  montoTotal: number;
};

type Props = {
  workers: WorkerOption[];
  initialWorkerId?: string;
};

export function AdminReportPanel({
  workers,
  initialWorkerId,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const [employeeId, setEmployeeId] = useState(
    initialWorkerId ?? workers[0]?.id ?? "",
  );
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        employeeId,
        month: String(month),
        year: String(year),
      });
      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Error al generar reporte");
      }
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month, year]);

  const exportFile = (format: "pdf" | "csv") => {
    if (!employeeId) return;
    const url = `/api/reports/${employeeId}/${year}/${month}?format=${format}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white/70 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-600">
          Trabajador
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
          >
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Mes
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-600">
          Año
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="mt-1 w-28 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={loadSummary}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white"
        >
          Actualizar
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}
      {loading ? <p>Cargando...</p> : null}
      {summary ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => exportFile("pdf")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white"
            >
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={() => exportFile("csv")}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
            >
              Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Horas normales</th>
                  <th className="p-2">Horas extra</th>
                  <th className="p-2">Finde normales</th>
                  <th className="p-2">Finde extra</th>
                  <th className="p-2">Monto día</th>
                </tr>
              </thead>
              <tbody>
                {summary.dias.map((day) => (
                  <tr key={day.fecha} className="border-t border-slate-100">
                    <td className="p-2">{day.fecha}</td>
                    <td className="p-2">{day.horasNormales.toFixed(2)}</td>
                    <td className="p-2">{day.horasExtra.toFixed(2)}</td>
                    <td className="p-2">
                      {day.horasFindeNormales.toFixed(2)}
                    </td>
                    <td className="p-2">{day.horasFindeExtra.toFixed(2)}</td>
                    <td className="p-2">
                      ${day.montoTotalDia.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p>Días trabajados: {summary.diasTrabajados}</p>
            <p>Horas normales: {summary.horasNormales.toFixed(2)}</p>
            <p>Horas extra: {summary.horasExtra.toFixed(2)}</p>
            <p>
              Horas fin de semana:{" "}
              {summary.horasFindeNormales.toFixed(2)} normales /{" "}
              {summary.horasFindeExtra.toFixed(2)} extra
            </p>
            <p className="font-semibold">
              Sueldo estimado: ${summary.montoTotal.toFixed(0)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
