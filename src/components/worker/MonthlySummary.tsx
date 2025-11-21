"use client";

import { useEffect, useState } from "react";

type DaySummary = {
  fecha: string;
  horasNormales: number;
  horasExtra: number;
  horasFindeNormales: number;
  horasFindeExtra: number;
  montoTotalDia: number;
};

type Summary = {
  dias: DaySummary[];
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
  employeeId: string;
  initialSummary: Summary;
};

export function WorkerMonthlySummary({
  employeeId,
  initialSummary,
}: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        employeeId,
        month: String(month),
        year: String(year),
      });
      const response = await fetch(`/api/reports?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
      setLoading(false);
    };

    load();
  }, [employeeId, month, year]);

  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm text-slate-200/85">
          Mes
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="ml-2 w-20 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
          />
        </label>
        <label className="text-sm text-slate-200/85">
          Año
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="ml-2 w-24 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
          />
        </label>
        {loading ? (
          <span className="text-sm text-slate-300">Cargando...</span>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full text-sm text-gray-100">
          <thead>
            <tr className="bg-white/5 text-left font-mono uppercase tracking-[0.3em] text-[11px] text-gray-400">
              <th className="p-3">Fecha</th>
              <th className="p-3">Horas normales</th>
              <th className="p-3">Horas extra</th>
              <th className="p-3">Horas finde</th>
              <th className="p-3">Monto día</th>
            </tr>
          </thead>
          <tbody>
            {summary.dias.map((day) => (
              <tr
                key={day.fecha}
                className="border-t border-white/5 bg-black/30 transition hover:bg-white/5"
              >
                <td className="p-3">{day.fecha}</td>
                <td className="p-3">{day.horasNormales.toFixed(2)}</td>
                <td className="p-3">{day.horasExtra.toFixed(2)}</td>
                <td className="p-3">
                  {(day.horasFindeNormales + day.horasFindeExtra).toFixed(2)}
                </td>
                <td className="p-3">${day.montoTotalDia.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200/85">
        <p>Días trabajados: {summary.diasTrabajados}</p>
        <p>Horas normales: {summary.horasNormales.toFixed(2)}</p>
        <p>Horas extra: {summary.horasExtra.toFixed(2)}</p>
        <p>
          Horas fin de semana: {summary.horasFindeNormales.toFixed(2)} normales /{" "}
          {summary.horasFindeExtra.toFixed(2)} extra
        </p>
        <p>Adelantos/quincenas: -${(summary.totalAdelantos ?? 0).toFixed(0)}</p>
        <p className="text-lg font-semibold text-white">
          Sueldo estimado neto: ${summary.montoTotal.toFixed(0)}
        </p>
      </div>
    </div>
  );
}
