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
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-lg">
      <div className="flex flex-wrap gap-2">
        <label className="text-sm text-slate-600">
          Mes
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="ml-2 w-16 rounded-lg border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="text-sm text-slate-600">
          Año
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1"
          />
        </label>
        {loading ? <span className="text-sm text-slate-500">Cargando...</span> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-500">
              <th className="p-2">Fecha</th>
              <th className="p-2">Horas normales</th>
              <th className="p-2">Horas extra</th>
              <th className="p-2">Horas finde</th>
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
                  {(day.horasFindeNormales + day.horasFindeExtra).toFixed(2)}
                </td>
                <td className="p-2">
                  ${day.montoTotalDia.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <p>Días trabajados: {summary.diasTrabajados}</p>
        <p>Horas normales: {summary.horasNormales.toFixed(2)}</p>
        <p>Horas extra: {summary.horasExtra.toFixed(2)}</p>
        <p>
          Horas fin de semana:{" "}
          {summary.horasFindeNormales.toFixed(2)} normales /{" "}
          {summary.horasFindeExtra.toFixed(2)} extra
        </p>
        <p className="text-lg font-semibold text-slate-900">
          Sueldo estimado: ${summary.montoTotal.toFixed(0)}
        </p>
      </div>
    </div>
  );
}
