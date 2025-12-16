"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Save, X, Printer, Trash2 } from "lucide-react";

type TipoJornada = "completa" | "media" | "permiso_con_goce" | "permiso_sin_goce" | "vacaciones" | "licencia_medica" | "falta";

type CalendarDay = {
    fecha: string;
    tipoJornada: TipoJornada | null;
    horaEntrada: string | null;
    horaSalida: string | null;
    notas: string | null;
    recordId: string | null;
};

type Employee = {
    id: string;
    nombreCompleto: string;
    sueldoMensual?: number | null;
};

const tipoJornadaConfig: Record<TipoJornada, { label: string; short: string; color: string; bgClass: string; paga: boolean; factor: number }> = {
    completa: { label: "Jornada Completa", short: "JC", color: "#22c55e", bgClass: "bg-green-500", paga: true, factor: 1 },
    media: { label: "Media Jornada", short: "MJ", color: "#eab308", bgClass: "bg-yellow-500", paga: true, factor: 0.5 },
    permiso_con_goce: { label: "Permiso c/Goce", short: "PG", color: "#3b82f6", bgClass: "bg-blue-500", paga: true, factor: 1 },
    permiso_sin_goce: { label: "Permiso s/Goce", short: "PS", color: "#8b5cf6", bgClass: "bg-violet-500", paga: false, factor: 0 },
    vacaciones: { label: "Vacaciones", short: "VA", color: "#06b6d4", bgClass: "bg-cyan-500", paga: true, factor: 1 },
    licencia_medica: { label: "Licencia Médica", short: "LM", color: "#f97316", bgClass: "bg-orange-500", paga: true, factor: 1 },
    falta: { label: "Falta", short: "FA", color: "#ef4444", bgClass: "bg-red-500", paga: false, factor: 0 },
};

const diasSemana = ["L", "M", "X", "J", "V", "S", "D"];
const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type Props = {
    employees: Employee[];
};

type RangeMode = "mes" | "quincena1" | "quincena2";

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

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [formTipo, setFormTipo] = useState<TipoJornada>("completa");
    const [formNotas, setFormNotas] = useState("");

    // Bulk selection state
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkTipo, setBulkTipo] = useState<TipoJornada>("completa");
    const [bulkNotas, setBulkNotas] = useState("");

    const selectedEmp = employees.find(e => e.id === selectedEmployee);

    const fetchCalendar = async () => {
        if (!selectedEmployee) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/time-records/calendar?employeeId=${selectedEmployee}&year=${year}&month=${month}`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCalendar(data.calendar || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al cargar calendario");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalendar();
    }, [selectedEmployee, year, month]);

    // Días del mes para cálculo de quincenas
    const daysInMonth = calendar.length;

    // Filtrar calendario según rango seleccionado
    const filteredCalendar = useMemo(() => {
        if (rangeMode === "mes") return calendar;
        return calendar.filter(day => {
            const dayNum = parseInt(day.fecha.split("-")[2], 10);
            if (rangeMode === "quincena1") return dayNum >= 1 && dayNum <= 15;
            if (rangeMode === "quincena2") return dayNum >= 16;
            return true;
        });
    }, [calendar, rangeMode]);

    // Calcular resumen basado en rango filtrado
    const resumen = useMemo(() => {
        const counts: Record<TipoJornada | "sin_marcar", number> = {
            completa: 0, media: 0, permiso_con_goce: 0, permiso_sin_goce: 0,
            vacaciones: 0, licencia_medica: 0, falta: 0, sin_marcar: 0
        };
        let diasPagados = 0;

        filteredCalendar.forEach(day => {
            if (day.tipoJornada) {
                counts[day.tipoJornada]++;
                diasPagados += tipoJornadaConfig[day.tipoJornada].factor;
            } else {
                counts.sin_marcar++;
            }
        });

        const sueldoBase = selectedEmp?.sueldoMensual ?? 0;
        // Usar total de días del mes para calcular valor día (sueldo mensual / días del mes)
        const valorDia = daysInMonth > 0 ? sueldoBase / daysInMonth : 0;
        const sueldoProporcional = valorDia * diasPagados;
        const diasRango = filteredCalendar.length;

        return { counts, diasPagados, diasMes: daysInMonth, diasRango, sueldoProporcional };
    }, [filteredCalendar, selectedEmp, daysInMonth]);

    // Texto del rango para reportes
    const rangeLabel = useMemo(() => {
        if (rangeMode === "quincena1") return "1 al 15";
        if (rangeMode === "quincena2") return `16 al ${daysInMonth}`;
        return "Mes completo";
    }, [rangeMode, daysInMonth]);

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
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
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
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
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
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .header { margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
        .summary-item { padding: 10px; background: #f9f9f9; border-radius: 8px; }
        .calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .day { padding: 8px; text-align: center; border: 1px solid #eee; border-radius: 4px; }
        .day.marked { font-weight: bold; }
        .total { font-size: 1.2em; font-weight: bold; margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 8px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header">
        <h1>Reporte de Asistencia</h1>
        <p><strong>Trabajador:</strong> ${selectedEmp?.nombreCompleto}</p>
        <p><strong>Período:</strong> ${meses[month - 1]} ${year} (${rangeLabel})</p>
        <p><strong>Sueldo Base:</strong> $${(selectedEmp?.sueldoMensual ?? 0).toLocaleString("es-CL")}</p>
      </div>
      <h3>Resumen</h3>
      <table>
        <tr><th>Tipo</th><th>Días</th><th>Factor</th></tr>
        ${Object.entries(tipoJornadaConfig).map(([key, config]) =>
            `<tr><td>${config.label}</td><td>${resumen.counts[key as TipoJornada]}</td><td>${config.factor}</td></tr>`
        ).join('')}
        <tr><td>Sin Marcar</td><td>${resumen.counts.sin_marcar}</td><td>-</td></tr>
      </table>
      <div class="total">
        <p>Días del mes: ${resumen.diasMes}</p>
        <p>Días pagados (equivalentes): ${resumen.diasPagados.toFixed(1)}</p>
        <p><strong>Sueldo Proporcional: $${resumen.sueldoProporcional.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</strong></p>
      </div>
      <h3>Detalle del Período (${rangeLabel})</h3>
      <table>
        <tr><th>Día</th><th>Fecha</th><th>Tipo</th><th>Notas</th></tr>
        ${filteredCalendar.map(day => {
            const d = new Date(day.fecha);
            const tipo = day.tipoJornada ? tipoJornadaConfig[day.tipoJornada].label : "Sin marcar";
            return `<tr><td>${d.getDate()}</td><td>${d.toLocaleDateString("es-CL")}</td><td>${tipo}</td><td>${day.notas || "-"}</td></tr>`;
        }).join('')}
      </table>
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
                    {employees.map((emp) => (
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
                    <button onClick={handlePrint} className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
                        <Printer className="h-4 w-4" /> Imprimir
                    </button>
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
                                        className={`h-10 rounded flex flex-col items-center justify-center transition-all hover:ring-1 hover:ring-cyan-400 ${isSelected ? "ring-2 ring-amber-400" : ""
                                            } ${isToday ? "ring-1 ring-white/50" : ""
                                            } ${config ? config.bgClass : "bg-white/5"}`}
                                    >
                                        <span className={`text-xs font-bold ${config ? "text-white" : "text-gray-500"}`}>{dayNum}</span>
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
                                <span>Días pagados equiv.:</span>
                                <span className="text-white font-bold">{resumen.diasPagados.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2">
                                <span className="text-gray-300">Sueldo Base:</span>
                                <span className="text-white">${(selectedEmp?.sueldoMensual ?? 0).toLocaleString("es-CL")}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-cyan-400">Sueldo Proporcional:</span>
                                <span className="text-cyan-300">${resumen.sueldoProporcional.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</span>
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
                                {new Date(selectedDay.fecha).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
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
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Guardar
                            </button>
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
                            <button onClick={() => setShowBulkModal(false)} className="rounded bg-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/20">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
