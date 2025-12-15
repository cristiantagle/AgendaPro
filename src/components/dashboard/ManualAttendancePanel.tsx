"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Save, X } from "lucide-react";

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
};

const tipoJornadaConfig: Record<TipoJornada, { label: string; color: string; bgClass: string }> = {
    completa: { label: "Jornada Completa", color: "#22c55e", bgClass: "bg-green-500" },
    media: { label: "Media Jornada", color: "#eab308", bgClass: "bg-yellow-500" },
    permiso_con_goce: { label: "Permiso c/Goce", color: "#3b82f6", bgClass: "bg-blue-500" },
    permiso_sin_goce: { label: "Permiso s/Goce", color: "#8b5cf6", bgClass: "bg-violet-500" },
    vacaciones: { label: "Vacaciones", color: "#06b6d4", bgClass: "bg-cyan-500" },
    licencia_medica: { label: "Licencia Médica", color: "#f97316", bgClass: "bg-orange-500" },
    falta: { label: "Falta", color: "#ef4444", bgClass: "bg-red-500" },
};

const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type Props = {
    employees: Employee[];
};

export function ManualAttendancePanel({ employees }: Props) {
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [calendar, setCalendar] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [formTipo, setFormTipo] = useState<TipoJornada>("completa");
    const [formNotas, setFormNotas] = useState("");

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

    const handleDayClick = (day: CalendarDay) => {
        setSelectedDay(day);
        setFormTipo(day.tipoJornada || "completa");
        setFormNotas(day.notas || "");
        setShowModal(true);
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
        if (month === 1) {
            setMonth(12);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    const nextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    // Calcular el primer día del mes
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

    return (
        <div className="space-y-6">
            {/* Mensajes */}
            {error && (
                <div className="rounded-lg bg-red-500/20 border border-red-500/40 p-4 text-red-200">
                    {error}
                </div>
            )}
            {success && (
                <div className="rounded-lg bg-green-500/20 border border-green-500/40 p-4 text-green-200">
                    {success}
                </div>
            )}

            {/* Selector de empleado y mes */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[250px]">
                    <label className="block text-sm text-gray-400 mb-1">Trabajador</label>
                    <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    >
                        <option value="" className="bg-gray-900">Seleccionar trabajador...</option>
                        {employees.map((emp) => (
                            <option key={emp.id} value={emp.id} className="bg-gray-900">
                                {emp.nombreCompleto}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className="rounded-lg bg-white/10 p-2 hover:bg-white/20 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="text-center min-w-[150px]">
                        <p className="text-lg font-semibold text-white">{meses[month - 1]}</p>
                        <p className="text-sm text-gray-400">{year}</p>
                    </div>
                    <button
                        onClick={nextMonth}
                        className="rounded-lg bg-white/10 p-2 hover:bg-white/20 transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-3">
                {Object.entries(tipoJornadaConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${config.bgClass}`} />
                        <span className="text-xs text-gray-400">{config.label}</span>
                    </div>
                ))}
            </div>

            {/* Calendario */}
            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
            ) : !selectedEmployee ? (
                <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">Selecciona un trabajador para ver su calendario</p>
                </div>
            ) : (
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 overflow-hidden">
                    {/* Header días de la semana */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {diasSemana.map((dia) => (
                            <div key={dia} className="text-center text-xs font-medium text-gray-400 py-2">
                                {dia}
                            </div>
                        ))}
                    </div>

                    {/* Días del mes */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Espacios vacíos antes del primer día */}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}

                        {/* Días del calendario */}
                        {calendar.map((day) => {
                            const dayNum = new Date(day.fecha).getDate();
                            const isToday = day.fecha === new Date().toISOString().split("T")[0];
                            const tipo = day.tipoJornada;

                            return (
                                <button
                                    key={day.fecha}
                                    onClick={() => handleDayClick(day)}
                                    className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-center transition-all hover:ring-2 hover:ring-cyan-400 ${isToday ? "ring-2 ring-white/40" : ""
                                        } ${tipo ? tipoJornadaConfig[tipo].bgClass + "/30" : "bg-white/5"}`}
                                >
                                    <span className={`text-sm font-medium ${tipo ? "text-white" : "text-gray-400"}`}>
                                        {dayNum}
                                    </span>
                                    {tipo && (
                                        <div
                                            className={`w-2 h-2 rounded-full mt-1 ${tipoJornadaConfig[tipo].bgClass}`}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal de edición */}
            {showModal && selectedDay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">
                                {new Date(selectedDay.fecha).toLocaleDateString("es-CL", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                })}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-lg p-1 hover:bg-white/10"
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Tipo de Jornada</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(tipoJornadaConfig).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={() => setFormTipo(key as TipoJornada)}
                                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${formTipo === key
                                                    ? `${config.bgClass} text-white ring-2 ring-white/30`
                                                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                                                }`}
                                        >
                                            {config.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Notas (opcional)</label>
                                <textarea
                                    value={formNotas}
                                    onChange={(e) => setFormNotas(e.target.value)}
                                    rows={2}
                                    placeholder="Observaciones..."
                                    className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/20"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
