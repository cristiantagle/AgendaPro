"use client";

import { useMemo, useState } from "react";

import { FileText, Loader2 } from "lucide-react";
import { exportAttendanceToPDF } from "@/lib/pdf-export";

type EmployeeOption = {
  id: string;
  nombre: string;
  sueldoMensual?: number | null;
};

type Payment = {
  id: string;
  employeeId: string;
  employeeNombre: string;
  employeeEmail?: string | null;
  amount: number;
  type: "adelanto" | "quincena" | "pago";
  note?: string | null;
  paidAt: string;
};

type Props = {
  employees: EmployeeOption[];
  initialPayments: Payment[];
};

// Types needed for PDF generation
type TipoJornada = "completa" | "media" | "permiso_con_goce" | "permiso_sin_goce" | "vacaciones" | "licencia_medica" | "falta" | "feriado";

type CalendarDay = {
  fecha: string;
  tipoJornada: TipoJornada | null;
  notas: string | null;
};

const tipoJornadaConfig: Record<TipoJornada, { label: string; short: string; color: string; paga: boolean; factor: number }> = {
  completa: { label: "Jornada Completa", short: "JC", color: "#22c55e", paga: true, factor: 1 },
  media: { label: "Media Jornada", short: "MJ", color: "#eab308", paga: true, factor: 0.5 },
  permiso_con_goce: { label: "Permiso c/Goce", short: "PG", color: "#3b82f6", paga: true, factor: 1 },
  permiso_sin_goce: { label: "Permiso s/Goce", short: "PS", color: "#8b5cf6", paga: false, factor: 0 },
  vacaciones: { label: "Vacaciones", short: "VA", color: "#06b6d4", paga: true, factor: 1 },
  licencia_medica: { label: "Licencia Médica", short: "LM", color: "#f97316", paga: true, factor: 1 },
  falta: { label: "Falta", short: "FA", color: "#ef4444", paga: false, factor: 0 },
  feriado: { label: "Feriado", short: "FE", color: "#ec4899", paga: true, factor: 1 },
};

const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];



const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const typeLabel: Record<Payment["type"], string> = {
  adelanto: "Adelanto",
  quincena: "Quincena",
  pago: "Pago",
};

export function PaymentsPanel({ employees, initialPayments }: Props) {
  const [payments, setPayments] = useState(initialPayments);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("all");

  // PDF / Attendance State
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [form, setForm] = useState({
    employeeId: employees[0]?.id ?? "",
    amount: "",
    type: "adelanto" as Payment["type"],
    note: "",
    paidAt: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch calendar when employee or date changes
  useMemo(() => {
    const fetchCalendar = async () => {
      if (filterEmployeeId === "all") return;
      setLoadingCalendar(true);
      try {
        const res = await fetch(
          `/api/time-records/calendar?employeeId=${filterEmployeeId}&year=${year}&month=${month}`
        );
        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          console.error("Error parsing calendar response");
          setCalendar([]);
          return;
        }
        if (res.ok) {
          setCalendar(data.calendar || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCalendar(false);
      }
    };
    fetchCalendar();
  }, [filterEmployeeId, year, month]);

  // Handle PDF Download
  const handleDownloadPDF = async () => {
    const emp = employees.find(e => e.id === filterEmployeeId);
    if (!emp) return;

    // Calculate Summary
    const daysInMonth = calendar.length;
    const counts: Record<TipoJornada | "sin_marcar", number> = {
      completa: 0, media: 0, permiso_con_goce: 0, permiso_sin_goce: 0,
      vacaciones: 0, licencia_medica: 0, falta: 0, feriado: 0, sin_marcar: 0
    };
    let diasPagados = 0;

    calendar.forEach(day => {
      if (day.tipoJornada) {
        // Safe cast or check if key exists
        const tipo = day.tipoJornada as TipoJornada;
        if (counts[tipo] !== undefined) {
          counts[tipo]++;
          diasPagados += tipoJornadaConfig[tipo].factor;
        }
      } else {
        counts.sin_marcar++;
      }
    });

    const sueldoBase = emp.sueldoMensual ?? 0;
    const valorDia = daysInMonth > 0 ? sueldoBase / daysInMonth : 0;
    const sueldoProporcional = valorDia * diasPagados;

    const firstDayOfMonth = (() => {
      const d = new Date(year, month - 1, 1).getDay();
      return d === 0 ? 6 : d - 1;
    })();

    const resumen = {
      counts,
      diasMes: daysInMonth,
      diasRango: calendar.length,
      diasPagados,
      sueldoProporcional
    };

    await exportAttendanceToPDF(
      emp.nombre,
      meses[month - 1],
      year,
      "Mes completo",
      sueldoBase,
      calendar,
      resumen,
      firstDayOfMonth
    );
  };

  // Auto-select employee in form when filter changes (if specific employee selected)
  useMemo(() => {
    if (filterEmployeeId !== "all") {
      setForm(prev => ({ ...prev, employeeId: filterEmployeeId }));
    }
  }, [filterEmployeeId]);

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.id === form.employeeId),
    [employees, form.employeeId],
  );

  // Filter payments
  const filteredPayments = useMemo(() => {
    if (filterEmployeeId === "all") return payments;
    return payments.filter(p => p.employeeId === filterEmployeeId);
  }, [payments, filterEmployeeId]);

  // Calculate summary
  const summary = useMemo(() => {
    const s = { adelanto: 0, quincena: 0, pago: 0, total: 0 };
    filteredPayments.forEach(p => {
      s[p.type] += p.amount;
      s.total += p.amount;
    });
    return s;
  }, [filteredPayments]);

  const submit = async () => {
    if (!form.employeeId || !form.amount) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          amount: Number(form.amount),
          type: form.type,
          note: form.note || null,
          paidAt: form.paidAt,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo registrar el pago");
      }
      const data = await res.json();
      const payment: Payment = {
        ...data.payment,
        paidAt: data.payment.paidAt ?? new Date().toISOString(),
      };
      setPayments((prev) => [payment, ...prev].slice(0, 50));
      setMessage("Pago guardado.");
      setForm((prev) => ({
        ...prev,
        amount: "",
        note: "",
        type: "adelanto",
      }));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-100 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-300">
              Pagos y remuneraciones
            </p>
            <h2 className="text-2xl font-semibold">Control de Pagos</h2>
            <p className="text-sm text-gray-300">
              Gestión de anticipos, quincenas y pagos finales.
            </p>
          </div>

          {/* Filtro Principal */}
          <div className="w-full lg:w-72">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Filtrar por Trabajador</label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300 transition-all"
            >
              <option value="all">Ver Todos</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumen Financiero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Pagado</p>
            <p className="text-2xl font-bold text-white">{currency.format(summary.total)}</p>
            <p className="text-[10px] text-gray-500 mt-1">{filteredPayments.length} registros</p>
          </div>
          <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-4">
            <p className="text-xs text-cyan-300 uppercase tracking-wider mb-1">Adelantos</p>
            <p className="text-xl font-bold text-cyan-100">{currency.format(summary.adelanto)}</p>
          </div>
          <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4">
            <p className="text-xs text-yellow-300 uppercase tracking-wider mb-1">Quincenas</p>
            <p className="text-xl font-bold text-yellow-100">{currency.format(summary.quincena)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
            <p className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Pagos</p>
            <p className="text-xl font-bold text-emerald-100">{currency.format(summary.pago)}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[350px,1fr]">
          {/* Formulario de Ingreso */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 sticky top-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Nuevo Registro
              </h3>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-400 block mb-1.5">Trabajador</span>
                  <select
                    value={form.employeeId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, employeeId: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
                  >
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-400 block mb-1.5">Monto</span>
                    <input
                      type="number"
                      min={1}
                      step={1000}
                      value={form.amount}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, amount: event.target.value }))
                      }
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-400 block mb-1.5">Fecha</span>
                    <input
                      type="date"
                      value={form.paidAt}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, paidAt: event.target.value }))
                      }
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
                    />
                  </label>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-400 block mb-2">Tipo de Movimiento</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["adelanto", "quincena", "pago"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, type }))}
                        className={`rounded-lg border px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${form.type === type
                          ? "border-cyan-400 bg-cyan-400/20 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                          : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                          }`}
                      >
                        {typeLabel[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-gray-400 block mb-1.5">Nota (Opcional)</span>
                  <textarea
                    value={form.note}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none resize-none"
                    placeholder="Detalles adicionales..."
                  />
                </label>

                {message && (
                  <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 p-3 text-xs text-emerald-200 text-center">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={submit}
                  disabled={saving || !form.employeeId || !form.amount}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 px-4 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-60 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
                >
                  {saving ? "Guardando..." : "Registrar Pago"}
                </button>
              </div>
            </div>
          </div>

          {/* Listado de Historial */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
                Historial de Movimientos
              </h3>
              <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-300 font-mono">
                {filteredPayments.length} regs
              </span>
            </div>

            <div className="space-y-2">
              {filteredPayments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
                  <p className="text-gray-400 text-sm">No hay pagos registrados para este filtro.</p>
                </div>
              ) : (
                <div className="hidden md:block overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <table className="min-w-full text-sm text-gray-300">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="p-4 font-semibold">Fecha</th>
                        <th className="p-4 font-semibold">Trabajador</th>
                        <th className="p-4 font-semibold text-center">Tipo</th>
                        <th className="p-4 font-semibold text-right">Monto</th>
                        <th className="p-4 font-semibold">Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredPayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="transition hover:bg-white/5"
                        >
                          <td className="p-4 font-mono text-gray-400 text-xs">
                            {new Date(payment.paidAt).toLocaleDateString("es-CL")}
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-white">{payment.employeeNombre}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${payment.type === 'adelanto' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                              payment.type === 'quincena' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                              {typeLabel[payment.type]}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-white font-medium">
                            {currency.format(payment.amount)}
                          </td>
                          <td className="p-4 text-xs text-gray-500 italic max-w-[200px] truncate">
                            {payment.note || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mobile View */}
              <div className="space-y-3 md:hidden">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-white text-sm">{payment.employeeNombre}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{new Date(payment.paidAt).toLocaleDateString("es-CL")}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${payment.type === 'adelanto' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        payment.type === 'quincena' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                        {typeLabel[payment.type]}
                      </span>
                    </div>
                    <div className="flex justify-between items-end border-t border-white/5 pt-3">
                      <p className="text-xs text-gray-500 italic flex-1 mr-4">{payment.note || "Sin nota"}</p>
                      <p className="text-lg font-mono font-bold text-white">{currency.format(payment.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
