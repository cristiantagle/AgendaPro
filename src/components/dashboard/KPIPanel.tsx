"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Users, Loader2 } from "lucide-react";

type KPIData = {
    asistenciaPorcentaje: number;
    diasTrabajados: number;
    diasHabiles: number;
    totalEmpleados: number;
    topFaltas: { id: string; nombre: string; faltas: number }[];
    tendenciaSemanal: { dia: string; asistencia: number; faltas: number }[];
    alertas: { empleadoId: string; nombre: string; mensaje: string; tipo: string }[];
};

export function KPIPanel() {
    const [data, setData] = useState<KPIData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchKPIs = async () => {
            try {
                const res = await fetch("/api/dashboard/kpis");
                if (!res.ok) throw new Error("Error al cargar KPIs");
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
            } finally {
                setLoading(false);
            }
        };
        fetchKPIs();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-lg bg-red-500/20 border border-red-500/40 p-4 text-red-200">
                {error || "No se pudieron cargar los KPIs"}
            </div>
        );
    }

    const tendenciaPositiva = data.asistenciaPorcentaje >= 80;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">KPIs de Asistencia</h2>

            {/* Métricas principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Porcentaje de asistencia */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                        {tendenciaPositiva ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                        Asistencia
                    </div>
                    <p className={`text-3xl font-bold ${tendenciaPositiva ? 'text-green-400' : 'text-red-400'}`}>
                        {data.asistenciaPorcentaje}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">del mes actual</p>
                </div>

                {/* Días trabajados */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                        <Users className="h-4 w-4 text-cyan-400" />
                        Días Trabajados
                    </div>
                    <p className="text-3xl font-bold text-white">{data.diasTrabajados}</p>
                    <p className="text-xs text-gray-500 mt-1">de {data.diasHabiles} esperados</p>
                </div>

                {/* Total empleados */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Empleados Activos</div>
                    <p className="text-3xl font-bold text-cyan-400">{data.totalEmpleados}</p>
                </div>

                {/* Alertas */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        Alertas
                    </div>
                    <p className={`text-3xl font-bold ${data.alertas.length > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                        {data.alertas.length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">ausentismo alto</p>
                </div>
            </div>

            {/* Segunda fila: Tendencia y Top Faltas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tendencia semanal */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold text-white mb-4">Tendencia Semanal</h3>
                    <div className="flex items-end gap-2 h-24">
                        {data.tendenciaSemanal.map((dia, i) => {
                            const maxVal = Math.max(...data.tendenciaSemanal.map(d => d.asistencia + d.faltas), 1);
                            const heightPct = ((dia.asistencia + dia.faltas) / maxVal) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full rounded-t bg-cyan-500/80 transition-all"
                                        style={{ height: `${heightPct}%`, minHeight: dia.asistencia > 0 ? '4px' : '0' }}
                                        title={`${dia.asistencia} asistencias`}
                                    />
                                    <span className="text-[10px] text-gray-500 mt-1">{dia.dia}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Faltas */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold text-white mb-4">Top Ausencias del Mes</h3>
                    {data.topFaltas.length === 0 ? (
                        <p className="text-gray-500 text-sm">Sin ausencias registradas 🎉</p>
                    ) : (
                        <div className="space-y-2">
                            {data.topFaltas.map((emp, i) => (
                                <div key={emp.id} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-300 truncate flex-1">
                                        <span className="text-gray-500 mr-2">{i + 1}.</span>
                                        {emp.nombre}
                                    </span>
                                    <span className="text-red-400 font-semibold">{emp.faltas}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Alertas */}
            {data.alertas.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Alertas de Ausentismo
                    </h3>
                    <div className="space-y-2">
                        {data.alertas.map((alerta, i) => (
                            <div key={i} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${alerta.tipo === 'critico' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                <span>{alerta.nombre}</span>
                                <span className="font-semibold">{alerta.mensaje}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
