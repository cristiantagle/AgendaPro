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
  montoBruto?: number;
  montoNeto?: number;
  totalAdelantos?: number;
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
  const cacheRef = useMemo(() => new Map<string, ReportSummary>(), []);

  // Estado para selección de trabajadores en reporte cotizaciones
  const [showPayrollSelect, setShowPayrollSelect] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set(workers.map(w => w.id)));

  const loadSummary = async () => {
    if (!employeeId) return;
    const cacheKey = `${employeeId}-${year}-${month}`;
    if (cacheRef.has(cacheKey)) {
      setSummary(cacheRef.get(cacheKey) ?? null);
      return;
    }
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
      cacheRef.set(cacheKey, data.summary);
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

  const controlClasses =
    "mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none";

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-100 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
          Trabajador
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            className={`${controlClasses} bg-black/40`}
          >
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
          Mes
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className={controlClasses}
          />
        </label>
        <label className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400">
          Año
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className={controlClasses}
          />
        </label>
        <button
          type="button"
          onClick={loadSummary}
          className="ml-auto rounded-2xl border border-white/20 bg-gradient-to-r from-cyan-400 to-violet-700 px-4 py-3 text-xs font-mono uppercase tracking-[0.4em] text-white"
        >
          Actualizar
        </button>
      </div>
      {summary ? (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200 md:grid-cols-3">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-gray-400">
              Monto bruto
            </p>
            <p className="text-xl font-semibold text-white">
              ${summary.montoBruto?.toFixed(0) ?? summary.montoTotal.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-gray-400">
              Adelantos/quincenas
            </p>
            <p className="text-xl font-semibold text-amber-200">
              -${(summary.totalAdelantos ?? 0).toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-gray-400">
              Total a pagar (neto)
            </p>
            <p className="text-xl font-semibold text-emerald-300">
              ${summary.montoTotal.toFixed(0)}
            </p>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-gray-400">Cargando...</p> : null}
      {summary ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => exportFile("pdf")}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
            >
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={() => exportFile("csv")}
              className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => setShowPayrollSelect(!showPayrollSelect)}
              className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200"
            >
              📋 COTIZACIONES
            </button>
          </div>

          {/* Panel de selección para Cotizaciones */}
          {showPayrollSelect && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-900/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-amber-200">Seleccionar trabajadores:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWorkers(new Set(workers.map(w => w.id)))}
                    className="text-xs text-cyan-300 hover:underline"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkers(new Set())}
                    className="text-xs text-gray-400 hover:underline"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {workers.map(worker => (
                  <label key={worker.id} className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={selectedWorkers.has(worker.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedWorkers);
                        if (e.target.checked) {
                          newSet.add(worker.id);
                        } else {
                          newSet.delete(worker.id);
                        }
                        setSelectedWorkers(newSet);
                      }}
                      className="rounded"
                    />
                    {worker.nombre}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const ids = Array.from(selectedWorkers).join(",");
                  const url = `/api/reports/payroll?month=${month}&year=${year}${ids ? `&employees=${ids}` : ""}`;
                  window.open(url, "_blank");
                }}
                disabled={selectedWorkers.size === 0}
                className="w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📥 GENERAR PDF ({selectedWorkers.size} trabajadores)
              </button>
            </div>
          )}
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-left font-mono text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Horas normales</th>
                  <th className="p-3">Horas extra</th>
                  <th className="p-3">Finde normales</th>
                  <th className="p-3">Finde extra</th>
                  <th className="p-3">Monto día</th>
                </tr>
              </thead>
              <tbody>
                {summary.dias.map((day) => (
                  <tr
                    key={day.fecha}
                    className="border-t border-white/5 bg-black/30 transition hover:bg-white/5"
                  >
                    <td className="p-3 font-mono text-xs text-gray-400">
                      {day.fecha}
                    </td>
                    <td className="p-3">{day.horasNormales.toFixed(2)}</td>
                    <td className="p-3">{day.horasExtra.toFixed(2)}</td>
                    <td className="p-3">{day.horasFindeNormales.toFixed(2)}</td>
                    <td className="p-3">{day.horasFindeExtra.toFixed(2)}</td>
                    <td className="p-3 text-emerald-200">
                      ${day.montoTotalDia.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-gray-300 md:grid-cols-2">
            <p>Días trabajados: {summary.diasTrabajados}</p>
            <p>Horas normales: {summary.horasNormales.toFixed(2)}</p>
            <p>Horas extra: {summary.horasExtra.toFixed(2)}</p>
            <p>
              Horas fin de semana: {summary.horasFindeNormales.toFixed(2)} normales /{" "}
              {summary.horasFindeExtra.toFixed(2)} extra
            </p>
            <p>Adelantos/quincenas: -${(summary.totalAdelantos ?? 0).toFixed(0)}</p>
            <p className="md:col-span-2 text-lg font-semibold text-white">
              Sueldo estimado neto: ${summary.montoTotal.toFixed(0)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
