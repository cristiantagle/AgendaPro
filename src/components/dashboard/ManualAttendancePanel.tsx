"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Save, X, Printer, Trash2, FileText, History } from "lucide-react";

type AuditLogEntry = {
    id: string;
    userName: string | null;
    action: string;
    createdAt: string;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
};

type TipoJornada = "completa" | "media" | "permiso_con_goce" | "permiso_sin_goce" | "vacaciones" | "licencia_medica" | "falta" | "feriado";

type CalendarDay = {
    fecha: string;
    tipoJornada: TipoJornada | null;
    horaEntrada: string | null;
    horaSalida: string | null;
    notas: string | null;
    recordId: string | null;
    horasExtra: number;
};

type Employee = {
    id: string;
    nombreCompleto: string;
    sueldoMensual?: number | null;
    isActive?: boolean;
};

type Payment = {
    id: string;
    paidAt: string;
    amount: number;
    type: "adelanto" | "quincena" | "pago";
    note?: string | null;
};

const tipoJornadaConfig: Record<TipoJornada, { label: string; short: string; color: string; bgClass: string; paga: boolean; factor: number }> = {
    completa: { label: "Jornada Completa", short: "JC", color: "#22c55e", bgClass: "bg-green-500", paga: true, factor: 1 },
    media: { label: "Media Jornada", short: "MJ", color: "#eab308", bgClass: "bg-yellow-500", paga: true, factor: 0.5 },
    permiso_con_goce: { label: "Permiso c/Goce", short: "PG", color: "#3b82f6", bgClass: "bg-blue-500", paga: true, factor: 1 },
    permiso_sin_goce: { label: "Permiso s/Goce", short: "PS", color: "#8b5cf6", bgClass: "bg-violet-500", paga: false, factor: 0 },
    vacaciones: { label: "Vacaciones", short: "VA", color: "#06b6d4", bgClass: "bg-cyan-500", paga: true, factor: 1 },
    licencia_medica: { label: "Licencia Médica", short: "LM", color: "#f97316", bgClass: "bg-orange-500", paga: true, factor: 1 },
    falta: { label: "Falta", short: "FA", color: "#ef4444", bgClass: "bg-red-500", paga: false, factor: 0 },
    feriado: { label: "Feriado", short: "FE", color: "#ec4899", bgClass: "bg-pink-500", paga: true, factor: 1 },
};

const diasSemana = ["L", "M", "X", "J", "V", "S", "D"];
const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type Props = {
    employees: Employee[];
};

type RangeMode = "mes" | "quincena1" | "quincena2" | "personalizado";

export function ManualAttendancePanel({ employees }: Props) {
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [calendar, setCalendar] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Range selector state
    const [rangeMode, setRangeMode] = useState<RangeMode>("mes");
    const [customStart, setCustomStart] = useState(1);
    const [customEnd, setCustomEnd] = useState(15);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [formTipo, setFormTipo] = useState<TipoJornada>("completa");
    const [formNotas, setFormNotas] = useState("");
    const [formHorasExtra, setFormHorasExtra] = useState("0");

    // Bulk selection state
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkTipo, setBulkTipo] = useState<TipoJornada>("completa");
    const [bulkNotas, setBulkNotas] = useState("");

    // Audit log state
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Payments state
    const [payments, setPayments] = useState<Payment[]>([]);

    const activeEmployees = useMemo(
        () => employees.filter((employee) => employee.isActive !== false),
        [employees],
    );
    const selectedEmp = activeEmployees.find(e => e.id === selectedEmployee);

    useEffect(() => {
        if (selectedEmployee && !activeEmployees.some((employee) => employee.id === selectedEmployee)) {
            setSelectedEmployee("");
            setCalendar([]);
            setPayments([]);
        }
    }, [activeEmployees, selectedEmployee]);

    const fetchCalendar = useCallback(async () => {
        if (!selectedEmployee) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/time-records/calendar?employeeId=${selectedEmployee}&year=${year}&month=${month}`
            );

            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                throw new Error("Respuesta inválida del servidor: " + text.substring(0, 50));
            }

            if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
            setCalendar(data.calendar || []);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Error al cargar calendario");
        } finally {
            setLoading(false);
        }
    }, [selectedEmployee, year, month]);

    const fetchPayments = useCallback(async () => {
        if (!selectedEmployee) return;
        try {
            const res = await fetch(`/api/payments?employeeId=${selectedEmployee}`);
            if (res.ok) {
                const data = await res.json();
                // Filtrar pagos del empleado Y del mes actual
                const pagosDelMes = (data.payments || []).filter((p: Payment & { employeeId?: string }) => {
                    // Filtrar por empleado
                    if (p.employeeId && p.employeeId !== selectedEmployee) return false;
                    // Filtrar por mes
                    const fechaPago = new Date(p.paidAt);
                    return fechaPago.getMonth() + 1 === month && fechaPago.getFullYear() === year;
                });
                setPayments(pagosDelMes);
            }
        } catch (err) {
            console.error("Error al cargar pagos:", err);
        }
    }, [selectedEmployee, month, year]);

    useEffect(() => {
        fetchCalendar();
        fetchPayments();
    }, [fetchCalendar, fetchPayments]);

    // Días del mes para cálculo de quincenas
    const daysInMonth = calendar.length;

    // Filtrar calendario según rango seleccionado
    const filteredCalendar = useMemo(() => {
        if (rangeMode === "mes") return calendar;
        return calendar.filter(day => {
            const dayNum = parseInt(day.fecha.split("-")[2], 10);
            if (rangeMode === "quincena1") return dayNum >= 1 && dayNum <= 15;
            if (rangeMode === "quincena2") return dayNum >= 16;
            if (rangeMode === "personalizado") {
                return dayNum >= customStart && dayNum <= customEnd;
            }
            return true;
        });
    }, [calendar, rangeMode, customStart, customEnd]);

    // Calcular resumen basado en rango filtrado
    const resumen = useMemo(() => {
        const counts: Record<TipoJornada | "sin_marcar", number> = {
            completa: 0, media: 0, permiso_con_goce: 0, permiso_sin_goce: 0,
            vacaciones: 0, licencia_medica: 0, falta: 0, feriado: 0, sin_marcar: 0
        };

        // Contar días que NO pagan (faltas, permisos sin goce, días hábiles sin marcar)
        let diasNoPagados = 0;
        let finesDeSemana = 0;

        filteredCalendar.forEach(day => {
            // Parsear fecha correctamente sin problemas de timezone
            const [, , dayStr] = day.fecha.split("-");
            const dayNum = parseInt(dayStr, 10);
            const fecha = new Date(year, month - 1, dayNum);
            const diaSemana = fecha.getDay(); // 0=Dom, 6=Sab
            const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

            if (esFinDeSemana) {
                finesDeSemana++;
                // Fines de semana no afectan el cálculo (siempre pagan como parte del mes)
            } else if (day.tipoJornada) {
                counts[day.tipoJornada]++;
                // Solo descontar si es permiso sin goce o falta
                if (day.tipoJornada === "permiso_sin_goce" || day.tipoJornada === "falta") {
                    diasNoPagados += 1;
                } else if (day.tipoJornada === "media") {
                    diasNoPagados += 0.5; // Media jornada = medio día de descuento
                }
            } else {
                // Día hábil sin marcar = no pagado
                counts.sin_marcar++;
                diasNoPagados += 1;
            }
        });

        const sueldoBase = selectedEmp?.sueldoMensual ?? 0;

        // En Chile se usa siempre 30 días para el cálculo
        const DIAS_MES_CALCULO = 30;
        const valorDia = sueldoBase / DIAS_MES_CALCULO;

        // Sueldo proporcional = Sueldo base - descuentos por días no trabajados
        const descuentoPorDias = Math.round(valorDia * diasNoPagados);
        const sueldoProporcional = Math.max(sueldoBase - descuentoPorDias, 0);
        const diasRango = filteredCalendar.length;
        const diasPagados = DIAS_MES_CALCULO - diasNoPagados;

        // Calcular totales de pagos del mes
        const totalAdelantos = payments
            .filter(p => p.type === "adelanto")
            .reduce((sum, p) => sum + p.amount, 0);
        const totalQuincenas = payments
            .filter(p => p.type === "quincena")
            .reduce((sum, p) => sum + p.amount, 0);
        const totalDescuentos = totalAdelantos + totalQuincenas;
        const saldoAPagar = sueldoProporcional - totalDescuentos;



        // Calcular total horas extra
        const totalHorasExtra = filteredCalendar.reduce((sum, day) => sum + (day.horasExtra || 0), 0);

        return {
            counts, diasPagados, diasNoPagados, finesDeSemana, diasMes: daysInMonth, diasRango,
            sueldoProporcional, descuentoPorDias, totalAdelantos, totalQuincenas, totalDescuentos, saldoAPagar,
            totalHorasExtra
        };
    }, [filteredCalendar, selectedEmp, daysInMonth, payments, year, month]);

    // Texto del rango para reportes
    const rangeLabel = useMemo(() => {
        if (rangeMode === "quincena1") return "1 al 15";
        if (rangeMode === "quincena2") return `16 al ${daysInMonth}`;
        if (rangeMode === "personalizado") return `${customStart} al ${customEnd}`;
        return "Mes completo";
    }, [rangeMode, daysInMonth, customStart, customEnd]);

    // Toggle day selection for bulk mode
    const toggleDaySelection = (fecha: string) => {
        setSelectedDays(prev =>
            prev.includes(fecha)
                ? prev.filter(d => d !== fecha)
                : [...prev, fecha]
        );
    };

    const handleDayClick = (day: CalendarDay) => {
        if (bulkMode) {
            toggleDaySelection(day.fecha);
        } else {
            setSelectedDay(day);

            setFormTipo(day.tipoJornada || "completa");
            setFormNotas(day.notas || "");
            setFormHorasExtra(day.horasExtra ? String(day.horasExtra) : "0");
            setShowModal(true);
        }
    };

    // Bulk save handler
    const handleBulkSave = async () => {
        if (!selectedEmployee || selectedDays.length === 0) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/time-records/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: selectedEmployee,
                    fechas: selectedDays,
                    tipoJornada: bulkTipo,
                    notas: bulkNotas || undefined,
                }),
            });

            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                throw new Error("Respuesta inválida al guardar: " + text.substring(0, 50));
            }

            if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
            setSuccess(`${selectedDays.length} marcaciones guardadas`);
            setShowBulkModal(false);
            setSelectedDays([]);
            setBulkMode(false);
            fetchCalendar();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    // Cancel bulk mode
    const cancelBulkMode = () => {
        setBulkMode(false);
        setSelectedDays([]);
    };

    const handleSave = async () => {
        if (!selectedDay || !selectedEmployee) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/time-records/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: selectedEmployee,
                    fecha: selectedDay.fecha,
                    tipoJornada: formTipo,

                    notas: formNotas || undefined,
                    horasExtra: Number(formHorasExtra) || 0,
                }),
            });

            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                throw new Error("Respuesta inválida al guardar: " + text.substring(0, 50));
            }

            if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
            setSuccess("Marcación guardada");
            setShowModal(false);
            fetchCalendar();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(year - 1); } else { setMonth(month - 1); }
    };

    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(year + 1); } else { setMonth(month + 1); }
    };

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
      <html><head><title>Reporte Asistencia - ${selectedEmp?.nombreCompleto} - ${meses[month - 1]} ${year}</title>
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
        <p><strong>${selectedEmp?.nombreCompleto}</strong> | ${meses[month - 1]} ${year} (${rangeLabel})</p>
        <p>Sueldo Base: $${(selectedEmp?.sueldoMensual ?? 0).toLocaleString("es-CL")}</p>
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
                  ${day.horasExtra > 0 ? `<div style="background: #ef4444; color: white; font-size: 9px; padding: 1px 3px; border-radius: 4px; position: absolute; top: 1px; right: 1px;">+${day.horasExtra}h</div>` : ''}
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
            ${Object.entries(tipoJornadaConfig).filter(([key]) => resumen.counts[key as TipoJornada] > 0).map(([key, config]) =>
            `<tr><td><strong>${config.short}</strong> ${config.label}</td><td>${resumen.counts[key as TipoJornada]}</td></tr>`
        ).join('')}
            ${resumen.counts.sin_marcar > 0 ? `<tr><td>Sin marcar</td><td>${resumen.counts.sin_marcar}</td></tr>` : ''}
          </table>
          <div class="total-box">
            <p><strong>Total Horas Extra Manuales: ${resumen.totalHorasExtra}</strong></p>
            <hr style="border: 0; border-top: 1px dashed #ccc; margin: 8px 0;" />
            <p>Días en período: ${resumen.diasRango} de ${resumen.diasMes}</p>
            <p>Días pagados equiv.: ${resumen.diasPagados.toFixed(1)}</p>
            <p>Sueldo Base: $${(selectedEmp?.sueldoMensual ?? 0).toLocaleString("es-CL")}</p>
            <p><strong>Sueldo Proporcional: $${resumen.sueldoProporcional.toLocaleString("es-CL")}</strong></p>
            ${resumen.totalAdelantos > 0 ? `<p style="color: #c00;">(-) Adelantos: $${resumen.totalAdelantos.toLocaleString("es-CL")}</p>` : ''}
            ${resumen.totalQuincenas > 0 ? `<p style="color: #c00;">(-) Quincenas: $${resumen.totalQuincenas.toLocaleString("es-CL")}</p>` : ''}
            <p style="font-size: 16px; font-weight: bold; color: #047857; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px;">SALDO A PAGAR: $${resumen.saldoAPagar.toLocaleString("es-CL")}</p>
          </div>
        </div>
      </div>
      </body></html>
    `);
        printWindow.document.close();
        printWindow.print();
    };

    // Ajustar para semana que empieza en Lunes (0=Lunes, 6=Domingo)
    const firstDayOfMonth = (() => {
        const d = new Date(year, month - 1, 1).getDay();
        return d === 0 ? 6 : d - 1; // Convertir: Domingo(0)->6, Lunes(1)->0, etc.
    })();

    const handleDelete = async () => {
        if (!selectedDay?.recordId || !selectedEmployee) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/time-records/${selectedDay.recordId}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            setSuccess("Registro eliminado");
            setShowModal(false);
            fetchCalendar();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar");
        } finally {
            setSaving(false);
        }
    };

    const handleHistory = async () => {
        if (!selectedEmployee) return;
        setLoadingHistory(true);
        setShowHistoryModal(true);
        try {
            const res = await fetch(`/api/audit?recordId=${selectedEmployee}`);
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.logs || []);
            }
        } catch {
            setAuditLogs([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && <div className="rounded-lg bg-red-500/20 border border-red-500/40 p-3 text-red-200 text-sm">{error}</div>}
            {success && <div className="rounded-lg bg-green-500/20 border border-green-500/40 p-3 text-green-200 text-sm">{success}</div>}

            {/* Controles */}
            <div className="flex flex-wrap gap-3 items-center">
                <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="flex-1 min-w-[200px] rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
                >
                    <option value="" className="bg-gray-900">Seleccionar trabajador...</option>
                    {activeEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id} className="bg-gray-900">{emp.nombreCompleto}</option>
                    ))}
                </select>

                <div className="flex items-center gap-1">
                    <button onClick={prevMonth} className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><ChevronLeft className="h-4 w-4" /></button>
                    <div className="text-center min-w-[100px]">
                        <p className="text-sm font-semibold text-white">{meses[month - 1]} {year}</p>
                    </div>
                    <button onClick={nextMonth} className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><ChevronRight className="h-4 w-4" /></button>
                </div>

                {selectedEmployee && (
                    <>
                        <button onClick={handlePrint} className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                            <Printer className="h-4 w-4" /> Imprimir
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const { exportAttendanceToPDF } = await import("@/lib/pdf-export");
                                    await exportAttendanceToPDF(
                                        selectedEmp?.nombreCompleto ?? "",
                                        meses[month - 1],
                                        year,
                                        rangeLabel,
                                        selectedEmp?.sueldoMensual ?? 0,
                                        filteredCalendar,
                                        resumen,
                                        firstDayOfMonth
                                    );
                                } catch (err) {
                                    console.error("Error al generar PDF:", err);
                                    setError("Error al generar PDF. Intenta de nuevo.");
                                    setTimeout(() => setError(null), 5000);
                                }
                            }}
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
                        >
                            <FileText className="h-4 w-4" /> PDF
                        </button>
                        <button
                            onClick={handleHistory}
                            className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
                        >
                            <History className="h-4 w-4" /> Historial
                        </button>
                    </>
                )}
            </div>

            {/* Selector de rango */}
            {selectedEmployee && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-gray-400">Período:</span>
                    <button
                        onClick={() => setRangeMode("mes")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${rangeMode === "mes"
                            ? "bg-cyan-600 text-white"
                            : "bg-white/10 text-gray-300 hover:bg-white/20"
                            }`}
                    >
                        Mes completo
                    </button>
                    <button
                        onClick={() => setRangeMode("quincena1")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${rangeMode === "quincena1"
                            ? "bg-cyan-600 text-white"
                            : "bg-white/10 text-gray-300 hover:bg-white/20"
                            }`}
                    >
                        1 - 15
                    </button>
                    <button
                        onClick={() => setRangeMode("quincena2")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${rangeMode === "quincena2"
                            ? "bg-cyan-600 text-white"
                            : "bg-white/10 text-gray-300 hover:bg-white/20"
                            }`}
                    >
                        16 - {daysInMonth}
                    </button>
                    <button
                        onClick={() => setRangeMode("personalizado")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${rangeMode === "personalizado"
                            ? "bg-cyan-600 text-white"
                            : "bg-white/10 text-gray-300 hover:bg-white/20"
                            }`}
                    >
                        Personalizado
                    </button>
                    {rangeMode === "personalizado" && (
                        <div className="flex items-center gap-2 ml-2">
                            <span className="text-xs text-gray-400">Día</span>
                            <input
                                type="number"
                                min={1}
                                max={daysInMonth}
                                value={customStart}
                                onChange={e => setCustomStart(Math.max(1, Math.min(daysInMonth, Number(e.target.value))))}
                                className="w-12 rounded bg-white/10 border border-white/20 px-2 py-1 text-xs text-white text-center"
                            />
                            <span className="text-xs text-gray-400">al</span>
                            <input
                                type="number"
                                min={1}
                                max={daysInMonth}
                                value={customEnd}
                                onChange={e => setCustomEnd(Math.max(1, Math.min(daysInMonth, Number(e.target.value))))}
                                className="w-12 rounded bg-white/10 border border-white/20 px-2 py-1 text-xs text-white text-center"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Leyenda compacta */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(tipoJornadaConfig).map(([key, config]) => (
                    <div key={key} className={`${config.bgClass} rounded px-2 py-0.5 text-xs font-medium text-white`}>
                        {config.short}: {config.label}
                    </div>
                ))}
            </div>

            {/* Bulk mode controls */}
            {selectedEmployee && (
                <div className="flex flex-wrap gap-2 items-center">
                    {!bulkMode ? (
                        <button
                            onClick={() => setBulkMode(true)}
                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
                        >
                            ☐ Selección múltiple
                        </button>
                    ) : (
                        <>
                            <span className="text-xs text-amber-400 font-medium">
                                {selectedDays.length} días seleccionados
                            </span>
                            <button
                                onClick={() => setShowBulkModal(true)}
                                disabled={selectedDays.length === 0}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Aplicar a selección
                            </button>
                            <button
                                onClick={cancelBulkMode}
                                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/20"
                            >
                                Cancelar
                            </button>
                        </>
                    )}
                </div>
            )}

            <div ref={printRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Calendario compacto */}
                {loading ? (
                    <div className="lg:col-span-2 flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                    </div>
                ) : !selectedEmployee ? (
                    <div className="lg:col-span-2 rounded-xl bg-white/5 border border-white/10 p-8 text-center">
                        <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                        <p className="text-gray-400 text-sm">Selecciona un trabajador</p>
                    </div>
                ) : (
                    <div className="lg:col-span-2 rounded-xl bg-white/5 border border-white/10 p-3">
                        <div className="grid grid-cols-7 gap-0.5 mb-1">
                            {diasSemana.map((dia) => (
                                <div key={dia} className="text-center text-[10px] font-bold text-gray-400 py-1">{dia}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e-${i}`} className="h-10" />)}
                            {calendar.map((day) => {
                                // Extraer día directamente del string YYYY-MM-DD para evitar timezone issues
                                const dayNum = parseInt(day.fecha.split("-")[2], 10);
                                const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                                const isToday = day.fecha === todayStr;
                                const tipo = day.tipoJornada;
                                const config = tipo ? tipoJornadaConfig[tipo] : null;
                                const isSelected = bulkMode && selectedDays.includes(day.fecha);

                                return (
                                    <button
                                        key={day.fecha}
                                        onClick={() => handleDayClick(day)}
                                        className={`relative h-10 rounded flex flex-col items-center justify-center transition-all hover:ring-1 hover:ring-cyan-400 ${isSelected ? "ring-2 ring-amber-400" : ""
                                            } ${isToday ? "ring-1 ring-white/50" : ""
                                            } ${config ? config.bgClass : "bg-white/5"}`}
                                    >
                                        <span className={`text-xs font-bold ${config ? "text-white" : "text-gray-500"}`}>{dayNum}</span>
                                        {day.horasExtra > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1 rounded-full shadow-sm">+{day.horasExtra}h</span>}
                                        {isSelected && <span className="text-[8px] font-bold text-amber-400">✓</span>}
                                        {!isSelected && config && <span className="text-[8px] font-bold text-white/80">{config.short}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Resumen */}
                {selectedEmployee && !loading && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white">
                            Resumen: {rangeLabel}
                        </h3>
                        <div className="space-y-1.5">
                            {Object.entries(tipoJornadaConfig).map(([key, config]) => (
                                <div key={key} className="flex justify-between items-center">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgClass} text-white`}>{config.short}</span>
                                    <span className="text-xs text-gray-400">{config.label}</span>
                                    <span className="text-sm font-bold text-white">{resumen.counts[key as TipoJornada]}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center border-t border-white/10 pt-1.5">
                                <span className="text-xs text-gray-500">Sin marcar</span>
                                <span className="text-sm font-bold text-gray-400">{resumen.counts.sin_marcar}</span>
                            </div>
                        </div>
                        <div className="border-t border-white/10 pt-3 space-y-1">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Días en período:</span>
                                <span className="text-white">{resumen.diasRango} de {resumen.diasMes}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Horas Extra Manuales:</span>
                                <span className="text-white font-bold">{resumen.totalHorasExtra}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Días pagados equiv.:</span>
                                <span className="text-white font-bold">{resumen.diasPagados.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2">
                                <span className="text-gray-300">Sueldo Base:</span>
                                <span className="text-white">${(selectedEmp?.sueldoMensual ?? 0).toLocaleString("es-CL")}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-cyan-400">Sueldo Proporcional:</span>
                                <span className="text-cyan-300">${resumen.sueldoProporcional.toLocaleString("es-CL")}</span>
                            </div>
                            {/* Descuentos */}
                            {(resumen.totalAdelantos > 0 || resumen.totalQuincenas > 0) && (
                                <div className="border-t border-white/10 pt-2 mt-2 space-y-1">
                                    {resumen.totalAdelantos > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-red-400">(-) Adelantos:</span>
                                            <span className="text-red-300">${resumen.totalAdelantos.toLocaleString("es-CL")}</span>
                                        </div>
                                    )}
                                    {resumen.totalQuincenas > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-red-400">(-) Quincenas:</span>
                                            <span className="text-red-300">${resumen.totalQuincenas.toLocaleString("es-CL")}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Saldo a pagar */}
                            <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-2 mt-2">
                                <span className="text-green-400">SALDO A PAGAR:</span>
                                <span className="text-green-300">${resumen.saldoAPagar.toLocaleString("es-CL")}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && selectedDay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-white/10 p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-white">
                                {(() => {
                                    const [y, m, d] = selectedDay.fecha.split('-').map(Number);
                                    const localDate = new Date(y, m - 1, d, 12, 0, 0);
                                    return localDate.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
                                })()}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="rounded p-1 hover:bg-white/10">
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mb-4">
                            {Object.entries(tipoJornadaConfig).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setFormTipo(key as TipoJornada)}
                                    className={`rounded px-2 py-1.5 text-xs font-medium transition-all ${formTipo === key ? `${config.bgClass} text-white ring-2 ring-white/30` : "bg-white/10 text-gray-300 hover:bg-white/20"
                                        }`}
                                >
                                    {config.label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={formNotas}
                            onChange={(e) => setFormNotas(e.target.value)}
                            rows={2}
                            placeholder="Notas..."
                            className="w-full rounded bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-gray-500 mb-4"
                        />
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm text-gray-300 w-1/3">Horas Extra:</span>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={formHorasExtra}
                                onChange={(e) => setFormHorasExtra(e.target.value)}
                                className="flex-1 rounded bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-gray-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Guardar
                            </button>

                            {formTipo === "vacaciones" && (
                                <button
                                    onClick={() => {
                                        const printWindow = window.open('', '_blank');
                                        if (!printWindow) return;
                                        const fecha = new Date(selectedDay.fecha);
                                        const fechaStr = fecha.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
                                        const hoy = new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });

                                        printWindow.document.write(`
                                            <html>
                                                <head>
                                                    <title>Papeleta de Vacaciones - ${selectedEmp?.nombreCompleto}</title>
                                                    <style>
                                                        body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                                                        .header { text-align: center; margin-bottom: 40px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 20px; }
                                                        .content { margin-bottom: 60px; text-align: justify; }
                                                        .info-row { margin-bottom: 15px; }
                                                        .label { font-weight: bold; }
                                                        .signatures { display: flex; justify-content: space-between; margin-top: 100px; }
                                                        .sig-box { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 10px; }
                                                        .nota { font-size: 12px; color: #666; margin-top: 40px; border-top: 1px dotted #ccc; padding-top: 10px; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="header">
                                                        <h2>Solicitud y Comprobante de Vacaciones</h2>
                                                    </div>
                                                    
                                                    <div class="content">
                                                        <div class="info-row">
                                                            <span class="label">Nombre del Trabajador:</span> ${selectedEmp?.nombreCompleto}
                                                        </div>
                                                        <div class="info-row">
                                                            <span class="label">Fecha de Solicitud:</span> ${hoy}
                                                        </div>
                                                        
                                                        <p style="margin-top: 30px;">
                                                            Por el presente documento, el trabajador individualizado solicita hacer uso de <strong>1 día</strong> de sus vacaciones, correspondiente a la siguiente fecha:
                                                        </p>
                                                        
                                                        <p style="text-align: center; font-size: 18px; margin: 20px 0; font-weight: bold;">
                                                            ${fechaStr}
                                                        </p>
                                                        
                                                        <p>
                                                            El empleador autoriza dichas vacaciones, imputándose al saldo pendiente del trabajador.
                                                        </p>

                                                        ${formNotas ? `<p><strong>Observaciones:</strong> ${formNotas}</p>` : ''}
                                                    </div>
                                                    
                                                    <div class="signatures">
                                                        <div class="sig-box">
                                                            Firma Trabajador
                                                        </div>
                                                        <div class="sig-box">
                                                            Firma Empleador / Jefe Directo
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="nota">
                                                        Nota: Este comprobante acredita el uso efectivo de las vacaciones en la fecha indicada.
                                                    </div>
                                                </body>
                                            </html>
                                        `);
                                        printWindow.document.close();
                                        printWindow.print();
                                    }}
                                    className="flex items-center justify-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                                    title="Imprimir Papeleta de Vacaciones"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                </button>
                            )}

                            {selectedDay?.recordId && (
                                <button
                                    onClick={handleDelete}
                                    disabled={saving}
                                    className="flex items-center justify-center gap-1.5 rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button onClick={() => setShowModal(false)} className="rounded bg-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/20">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-white/10 p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-white">
                                Aplicar a {selectedDays.length} días
                            </h3>
                            <button onClick={() => setShowBulkModal(false)} className="rounded p-1 hover:bg-white/10">
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">
                            Se aplicará el mismo tipo de marcación a todos los días seleccionados.
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 mb-4">
                            {Object.entries(tipoJornadaConfig).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setBulkTipo(key as TipoJornada)}
                                    className={`rounded px-2 py-1.5 text-xs font-medium transition-all ${bulkTipo === key ? `${config.bgClass} text-white ring-2 ring-white/30` : "bg-white/10 text-gray-300 hover:bg-white/20"
                                        }`}
                                >
                                    {config.label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={bulkNotas}
                            onChange={(e) => setBulkNotas(e.target.value)}
                            rows={2}
                            placeholder="Notas (opcional)..."
                            className="w-full rounded bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-gray-500 mb-4"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleBulkSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Aplicar a {selectedDays.length} días
                            </button>

                            {bulkTipo === "vacaciones" && selectedDays.length > 0 && (
                                <button
                                    onClick={() => {
                                        const printWindow = window.open('', '_blank');
                                        if (!printWindow) return;

                                        // Ordenar fechas para encontrar rango
                                        const fechasOrd = [...selectedDays].sort();
                                        const fechaIni = new Date(fechasOrd[0]);
                                        const fechaFin = new Date(fechasOrd[fechasOrd.length - 1]);

                                        const fechaIniStr = fechaIni.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
                                        const fechaFinStr = fechaFin.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
                                        const hoy = new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
                                        const totalDias = selectedDays.length;

                                        printWindow.document.write(`
                                            <html>
                                                <head>
                                                    <title>Papeleta de Vacaciones - ${selectedEmp?.nombreCompleto}</title>
                                                    <style>
                                                        body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                                                        .header { text-align: center; margin-bottom: 40px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 20px; }
                                                        .content { margin-bottom: 60px; text-align: justify; }
                                                        .info-row { margin-bottom: 15px; }
                                                        .label { font-weight: bold; }
                                                        .signatures { display: flex; justify-content: space-between; margin-top: 100px; }
                                                        .sig-box { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 10px; }
                                                        .nota { font-size: 12px; color: #666; margin-top: 40px; border-top: 1px dotted #ccc; padding-top: 10px; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="header">
                                                        <h2>Solicitud y Comprobante de Vacaciones</h2>
                                                    </div>
                                                    
                                                    <div class="content">
                                                        <div class="info-row">
                                                            <span class="label">Nombre del Trabajador:</span> ${selectedEmp?.nombreCompleto}
                                                        </div>
                                                        <div class="info-row">
                                                            <span class="label">Fecha de Solicitud:</span> ${hoy}
                                                        </div>
                                                        
                                                        <p style="margin-top: 30px;">
                                                            Por el presente documento, el trabajador individualizado solicita hacer uso de <strong>${totalDias} días</strong> de sus vacaciones, correspondiente al período:
                                                        </p>
                                                        
                                                        <p style="text-align: center; font-size: 18px; margin: 20px 0; font-weight: bold;">
                                                            Desde el ${fechaIniStr} hasta el ${fechaFinStr}
                                                        </p>
                                                        
                                                        <p>
                                                            El empleador autoriza dichas vacaciones, imputándose al saldo pendiente del trabajador.
                                                        </p>

                                                        ${bulkNotas ? `<p><strong>Observaciones:</strong> ${bulkNotas}</p>` : ''}
                                                    </div>
                                                    
                                                    <div class="signatures">
                                                        <div class="sig-box">
                                                            Firma Trabajador
                                                        </div>
                                                        <div class="sig-box">
                                                            Firma Empleador / Jefe Directo
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="nota">
                                                        Nota: Este comprobante acredita el uso efectivo de las vacaciones en las fechas indicadas.
                                                    </div>
                                                </body>
                                            </html>
                                        `);
                                        printWindow.document.close();
                                        printWindow.print();
                                    }}
                                    className="flex items-center justify-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                                    title="Imprimir Papeleta de Vacaciones (Rango)"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button onClick={() => setShowBulkModal(false)} className="rounded bg-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/20">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Historial */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-gray-900 p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <History className="h-5 w-5 text-amber-400" />
                                Historial de Cambios
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                            </div>
                        ) : auditLogs.length === 0 ? (
                            <p className="text-sm text-gray-400 py-8 text-center">No hay cambios registrados para este trabajador.</p>
                        ) : (
                            <div className="max-h-80 overflow-y-auto space-y-2">
                                {auditLogs.map(log => (
                                    <div key={log.id} className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="text-cyan-400 font-medium">{log.action}</span>
                                            <span className="text-gray-500 text-xs">
                                                {new Date(log.createdAt).toLocaleString("es-CL")}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-1">Por: {log.userName || "Sistema"}</p>
                                        {log.newValues && (
                                            <div className="mt-2 text-xs text-gray-300">
                                                <span className="text-gray-500">Cambio: </span>
                                                {JSON.stringify(log.newValues).slice(0, 100)}...
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
