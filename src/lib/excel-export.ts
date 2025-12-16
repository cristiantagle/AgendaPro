"use client";

import * as XLSX from "xlsx";

type TipoJornada = "completa" | "media" | "permiso_con_goce" | "permiso_sin_goce" | "vacaciones" | "licencia_medica" | "falta" | "feriado";

type CalendarDay = {
    fecha: string;
    tipoJornada: TipoJornada | null;
    notas: string | null;
};

type Resumen = {
    counts: Record<TipoJornada | "sin_marcar", number>;
    diasMes: number;
    diasRango: number;
    diasPagados: number;
    sueldoProporcional: number;
};

const tipoLabels: Record<TipoJornada, string> = {
    completa: "Jornada Completa",
    media: "Media Jornada",
    permiso_con_goce: "Permiso c/Goce",
    permiso_sin_goce: "Permiso s/Goce",
    vacaciones: "Vacaciones",
    licencia_medica: "Licencia Médica",
    falta: "Falta",
    feriado: "Feriado",
};

export function exportAttendanceToExcel(
    nombreTrabajador: string,
    mes: string,
    year: number,
    rangeLabel: string,
    sueldoBase: number,
    calendar: CalendarDay[],
    resumen: Resumen
) {
    // Hoja 1: Calendario
    const calendarData = calendar.map(day => {
        const fecha = new Date(day.fecha);
        return {
            "Día": fecha.getDate(),
            "Fecha": fecha.toLocaleDateString("es-CL"),
            "Tipo": day.tipoJornada ? tipoLabels[day.tipoJornada] : "Sin marcar",
            "Código": day.tipoJornada?.toUpperCase().slice(0, 2) || "-",
            "Notas": day.notas || "",
        };
    });

    // Hoja 2: Resumen
    const resumenData = [
        { "Concepto": "Trabajador", "Valor": nombreTrabajador },
        { "Concepto": "Período", "Valor": `${mes} ${year} (${rangeLabel})` },
        { "Concepto": "Sueldo Base", "Valor": `$${sueldoBase.toLocaleString("es-CL")}` },
        { "Concepto": "", "Valor": "" },
        { "Concepto": "--- TIPOS DE JORNADA ---", "Valor": "" },
    ];

    Object.entries(tipoLabels).forEach(([key, label]) => {
        const count = resumen.counts[key as TipoJornada];
        if (count > 0) {
            resumenData.push({ "Concepto": label, "Valor": count.toString() });
        }
    });

    if (resumen.counts.sin_marcar > 0) {
        resumenData.push({ "Concepto": "Sin marcar", "Valor": resumen.counts.sin_marcar.toString() });
    }

    resumenData.push(
        { "Concepto": "", "Valor": "" },
        { "Concepto": "--- TOTALES ---", "Valor": "" },
        { "Concepto": "Días en período", "Valor": `${resumen.diasRango} de ${resumen.diasMes}` },
        { "Concepto": "Días pagados equiv.", "Valor": resumen.diasPagados.toFixed(1) },
        { "Concepto": "SUELDO PROPORCIONAL", "Valor": `$${resumen.sueldoProporcional.toLocaleString("es-CL", { maximumFractionDigits: 0 })}` }
    );

    // Crear workbook
    const wb = XLSX.utils.book_new();

    const wsCalendar = XLSX.utils.json_to_sheet(calendarData);
    XLSX.utils.book_append_sheet(wb, wsCalendar, "Calendario");

    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // Ajustar anchos de columna
    wsCalendar["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 30 }];
    wsResumen["!cols"] = [{ wch: 25 }, { wch: 25 }];

    // Generar nombre de archivo
    const fileName = `Asistencia_${nombreTrabajador.replace(/\s+/g, "_")}_${mes}_${year}.xlsx`;

    // Descargar
    XLSX.writeFile(wb, fileName);
}
