"use client";

import { useEffect, useMemo, useState } from "react";

import { FileText, Loader2, Printer } from "lucide-react";

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
  useEffect(() => {
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
    // LÓGICA: Sueldo base - descuento por días no trabajados
    // Solo se descuenta si falta, permiso sin goce, o día hábil sin marcar
    const counts: Record<TipoJornada | "sin_marcar" | "fin_semana", number> = {
      completa: 0, media: 0, permiso_con_goce: 0, permiso_sin_goce: 0,
      vacaciones: 0, licencia_medica: 0, falta: 0, feriado: 0, sin_marcar: 0, fin_semana: 0
    };
    let diasNoPagados = 0;

    // Crear mapa de días marcados para búsqueda rápida
    const calendarMap = new Map<string, CalendarDay>();
    calendar.forEach(day => {
      calendarMap.set(day.fecha, day);
    });

    // Determinar hasta qué día calcular (hasta hoy si es mes actual, o fin de mes si es pasado)
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
    const lastDayToCount = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();

    // Iterar por TODOS los días del período (no solo los marcados)
    for (let dia = 1; dia <= lastDayToCount; dia++) {
      const date = new Date(year, month - 1, dia);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado
      const esFinDeSemana = dayOfWeek === 0 || dayOfWeek === 6;

      const dayData = calendarMap.get(dateStr);

      if (esFinDeSemana) {
        // Fines de semana SIEMPRE se pagan (no afectan el cálculo)
        counts.fin_semana++;
      } else if (dayData?.tipoJornada) {
        // Día hábil con marcaje
        const tipo = dayData.tipoJornada as TipoJornada;
        if (counts[tipo] !== undefined) {
          counts[tipo]++;
          // Solo descontar si es permiso sin goce, falta o media jornada
          if (tipo === "permiso_sin_goce" || tipo === "falta") {
            diasNoPagados += 1;
          } else if (tipo === "media") {
            diasNoPagados += 0.5;
          }
        }
      } else {
        // Día hábil sin marcar = no se paga
        counts.sin_marcar++;
        diasNoPagados += 1;
      }
    }

    const sueldoBase = emp.sueldoMensual ?? 0;
    // FIJO: dividir por 30 días (no por días del mes)
    const valorDia = sueldoBase / 30;
    const descuentoPorDias = Math.round(valorDia * diasNoPagados);
    const sueldoProporcional = Math.max(sueldoBase - descuentoPorDias, 0);
    const diasPagados = 30 - diasNoPagados;

    const firstDayOfMonth = (() => {
      const d = new Date(year, month - 1, 1).getDay();
      return d === 0 ? 6 : d - 1;
    })();

    const resumen = {
      counts,
      diasMes: calendar.length,
      diasRango: calendar.length,
      diasPagados,
      sueldoProporcional
    };

    const { exportAttendanceToPDF } = await import("@/lib/pdf-export");
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
  useEffect(() => {
    if (filterEmployeeId !== "all") {
      setForm(prev => ({ ...prev, employeeId: filterEmployeeId }));
    }
  }, [filterEmployeeId]);

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

  const handlePrint = () => {
    const emp = employees.find(e => e.id === filterEmployeeId);
    if (!emp) return;

    // Crear mapa de días marcados
    const calendarMap = new Map<string, CalendarDay>();
    calendar.forEach(day => {
      calendarMap.set(day.fecha, day);
    });

    // Determinar hasta qué día calcular
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
    const lastDayToCount = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();

    const counts: Record<TipoJornada | "sin_marcar" | "fin_semana", number> = {
      completa: 0, media: 0, permiso_con_goce: 0, permiso_sin_goce: 0,
      vacaciones: 0, licencia_medica: 0, falta: 0, feriado: 0, sin_marcar: 0, fin_semana: 0
    };
    let diasNoPagados = 0;

    // Iterar por TODOS los días del período
    for (let dia = 1; dia <= lastDayToCount; dia++) {
      const date = new Date(year, month - 1, dia);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const dayOfWeek = date.getDay();
      const esFinDeSemana = dayOfWeek === 0 || dayOfWeek === 6;

      const dayData = calendarMap.get(dateStr);

      if (esFinDeSemana) {
        counts.fin_semana++;
        // Fines de semana no afectan el cálculo
      } else if (dayData?.tipoJornada) {
        const tipo = dayData.tipoJornada as TipoJornada;
        if (counts[tipo] !== undefined) {
          counts[tipo]++;
          // Solo descontar si es permiso sin goce, falta o media jornada
          if (tipo === "permiso_sin_goce" || tipo === "falta") {
            diasNoPagados += 1;
          } else if (tipo === "media") {
            diasNoPagados += 0.5;
          }
        }
      } else {
        counts.sin_marcar++;
        diasNoPagados += 1;
      }
    }

    const sueldoBase = emp.sueldoMensual ?? 0;
    const valorDia = sueldoBase / 30;
    const descuentoPorDias = Math.round(valorDia * diasNoPagados);
    const sueldoProporcional = Math.max(sueldoBase - descuentoPorDias, 0);
    const diasPagados = 30 - diasNoPagados;

    const diasRango = calendar.length;
    const rangeLabel = "Mes completo";
    const firstDayOfMonth = (() => {
      const d = new Date(year, month - 1, 1).getDay();
      return d === 0 ? 6 : d - 1;
    })();
    const diasSemana = ["L", "M", "X", "J", "V", "S", "D"];

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Reporte Asistencia - ${emp.nombre} - ${meses[month - 1]} ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 15px; max-width: 900px; margin: 0 auto; }
        .header { margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
        .header h1 { margin: 0 0 4px 0; font-size: 18px; }
        .header p { margin: 2px 0; font-size: 12px; }
        .grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 15px; }
        .week-header { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 2px; }
        .week-header span { text-align: center; font-weight: bold; font-size: 11px; padding: 5px; border: 1px solid #000; background: #eee; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .day-cell { text-align: center; padding: 6px 2px; border: 1px solid #999; min-height: 32px; }
        .day-cell.empty { border: none; }
        .day-cell.marked { border: 2px solid #000; font-weight: bold; }
        .day-cell.unpaid { background: repeating-linear-gradient(45deg, #fff, #fff 2px, #ddd 2px, #ddd 4px); }
        .day-num { font-size: 13px; font-weight: bold; }
        .day-type { font-size: 12px; font-weight: bold; margin-top: 2px; }
        .summary-table { width: 100%; font-size: 11px; border-collapse: collapse; }
        .summary-table th, .summary-table td { padding: 5px 8px; border: 1px solid #000; text-align: left; }
        .summary-table th { background: #eee; font-weight: bold; }
        .total-box { margin-top: 10px; padding: 10px; border: 2px solid #000; font-size: 12px; }
        .total-box strong { font-size: 15px; }
        .legend { margin-top: 8px; font-size: 10px; border-top: 1px solid #999; padding-top: 6px; }
        .legend-row { display: flex; flex-wrap: wrap; gap: 10px; }
        .legend-item { display: flex; align-items: center; gap: 3px; }
        .legend-box { width: 14px; height: 14px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; }
      </style></head><body>
      <div class="header">
        <h1>Reporte de Asistencia</h1>
        <p><strong>${emp.nombre}</strong> | ${meses[month - 1]} ${year} (${rangeLabel})</p>
        <p>Sueldo Base: $${(emp.sueldoMensual ?? 0).toLocaleString("es-CL")}</p>
      </div>
      <div class="grid">
        <div class="calendar-section">
          <div class="week-header">
            ${diasSemana.map(d => `<span>${d}</span>`).join('')}
          </div>
          <div class="calendar-grid">
            ${Array.from({ length: firstDayOfMonth }).map(() => '<div class="day-cell empty"></div>').join('')}
            ${calendar.map(day => {
      const dayNum = parseInt(day.fecha.split("-")[2], 10);
      const config = day.tipoJornada ? tipoJornadaConfig[day.tipoJornada] : null;
      const markedClass = config ? 'marked' : '';
      const unpaidClass = config && !config.paga ? 'unpaid' : '';
      return `<div class="day-cell ${markedClass} ${unpaidClass}">
                  <div class="day-num">${dayNum}</div>
                  <div class="day-type">${config ? config.short : ''}</div>
                </div>`;
    }).join('')}
          </div>
          <div class="legend">
            <div class="legend-row">
              ${Object.entries(tipoJornadaConfig).map(([, cfg]) =>
      `<span class="legend-item"><span class="legend-box">${cfg.short}</span> ${cfg.label}${cfg.paga ? '' : ' (no paga)'}</span>`
    ).join('')}
            </div>
          </div>
        </div>
        <div class="summary-section">
          <table class="summary-table">
            <tr><th>Tipo</th><th>Días</th></tr>
            ${Object.entries(tipoJornadaConfig).filter(([key]) => counts[key as TipoJornada] > 0).map(([key, config]) =>
      `<tr><td><strong>${config.short}</strong> ${config.label}</td><td>${counts[key as TipoJornada]}</td></tr>`
    ).join('')}
            ${counts.fin_semana > 0 ? `<tr><td>Fines de semana</td><td>${counts.fin_semana}</td></tr>` : ''}
            ${counts.sin_marcar > 0 ? `<tr><td>Sin marcar</td><td>${counts.sin_marcar}</td></tr>` : ''}
          </table>
          <div class="total-box">
            <p>Días en período: ${diasRango} de ${lastDayToCount}</p>
            <p>Días pagados equiv.: ${diasPagados.toFixed(1)} (${counts.fin_semana} fines de semana)</p>
            <p><strong>Sueldo Proporcional: $${sueldoProporcional.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</strong></p>
            ${(() => {
        // Filtrar pagos del empleado en el mes actual
        const pagosDelMes = payments.filter(p => {
          const paidDate = new Date(p.paidAt);
          return p.employeeId === filterEmployeeId &&
            paidDate.getFullYear() === year &&
            paidDate.getMonth() + 1 === month;
        });
        const totalAdelantos = pagosDelMes
          .filter(p => p.type === 'adelanto')
          .reduce((sum, p) => sum + p.amount, 0);
        const totalQuincenas = pagosDelMes
          .filter(p => p.type === 'quincena')
          .reduce((sum, p) => sum + p.amount, 0);
        const totalDescuentos = totalAdelantos + totalQuincenas;
        const saldoAPagar = sueldoProporcional - totalDescuentos;

        if (totalDescuentos === 0) return '';

        return `
              <hr style="margin: 8px 0; border-top: 1px dashed #999;">
              <p style="font-size: 11px;">Descuentos del mes:</p>
              ${totalAdelantos > 0 ? `<p style="font-size: 11px; color: #c00;">(-) Adelantos: $${totalAdelantos.toLocaleString("es-CL")}</p>` : ''}
              ${totalQuincenas > 0 ? `<p style="font-size: 11px; color: #c00;">(-) Quincenas: $${totalQuincenas.toLocaleString("es-CL")}</p>` : ''}
              <p style="font-size: 14px; font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000;">
                SALDO A PAGAR: $${saldoAPagar.toLocaleString("es-CL", { maximumFractionDigits: 0 })}
              </p>`;
      })()}
          </div>
        </div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
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

          {/* Filtro Principal + Herramientas */}
          <div className="w-full lg:w-96 flex flex-col gap-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Filtrar por Trabajador</label>

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

            {filterEmployeeId !== "all" && (
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10 mt-1">
                {/* Selectores de Fecha */}
                <div className="flex gap-2 items-center text-[10px]">
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="bg-transparent border-b border-white/20 focus:border-cyan-400 outline-none text-white text-right py-1"
                  >
                    {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="bg-transparent border-b border-white/20 focus:border-cyan-400 outline-none text-white py-1"
                  >
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                  </select>
                </div>

                {/* Botones de Acción */}
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    disabled={loadingCalendar}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-600/80 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow transition-all hover:bg-orange-500 hover:scale-105 disabled:opacity-50"
                    title="Imprimir Reporte"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={loadingCalendar}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600/80 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow transition-all hover:bg-violet-500 hover:scale-105 disabled:opacity-50"
                    title="Descargar PDF"
                  >
                    {loadingCalendar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumen Financiero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Pagado</p>
            <p className="text-2xl font-bold text-white">{currency.format(summary.total)}</p>
            <p className="text-[10px] text-gray-500 mt-1">{filteredPayments.length} registros</p>
          </div>
          <div className="rounded-2xl bg-cyan-600/20 border border-cyan-400/40 p-4">
            <p className="text-xs text-cyan-400 uppercase tracking-wider mb-1 font-semibold">Adelantos</p>
            <p className="text-xl font-bold text-cyan-300">{currency.format(summary.adelanto)}</p>
          </div>
          <div className="rounded-2xl bg-amber-600/20 border border-amber-400/40 p-4">
            <p className="text-xs text-amber-400 uppercase tracking-wider mb-1 font-semibold">Quincenas</p>
            <p className="text-xl font-bold text-amber-300">{currency.format(summary.quincena)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-600/20 border border-emerald-400/40 p-4">
            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1 font-semibold">Pagos</p>
            <p className="text-xl font-bold text-emerald-300">{currency.format(summary.pago)}</p>
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
