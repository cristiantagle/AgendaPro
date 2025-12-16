"use client";

import html2pdf from "html2pdf.js";

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

const tipoJornadaConfig: Record<TipoJornada, { label: string; short: string; color: string; paga: boolean }> = {
    completa: { label: "Jornada Completa", short: "JC", color: "#22c55e", paga: true },
    media: { label: "Media Jornada", short: "MJ", color: "#eab308", paga: true },
    permiso_con_goce: { label: "Permiso c/Goce", short: "PG", color: "#3b82f6", paga: true },
    permiso_sin_goce: { label: "Permiso s/Goce", short: "PS", color: "#8b5cf6", paga: false },
    vacaciones: { label: "Vacaciones", short: "VA", color: "#06b6d4", paga: true },
    licencia_medica: { label: "Licencia Médica", short: "LM", color: "#f97316", paga: true },
    falta: { label: "Falta", short: "FA", color: "#ef4444", paga: false },
    feriado: { label: "Feriado", short: "FE", color: "#ec4899", paga: true },
};

const diasSemana = ["L", "M", "X", "J", "V", "S", "D"];

export async function exportAttendanceToPDF(
    nombreTrabajador: string,
    mes: string,
    year: number,
    rangeLabel: string,
    sueldoBase: number,
    calendar: CalendarDay[],
    resumen: Resumen,
    firstDayOfMonth: number
) {
    // Crear el HTML del reporte (mismo diseño que imprimir)
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 15px; max-width: 800px;">
      <div style="margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px;">
        <h1 style="margin: 0 0 4px 0; font-size: 18px;">Reporte de Asistencia</h1>
        <p style="margin: 2px 0; font-size: 12px;"><strong>${nombreTrabajador}</strong> | ${mes} ${year} (${rangeLabel})</p>
        <p style="margin: 2px 0; font-size: 12px;">Sueldo Base: $${sueldoBase.toLocaleString("es-CL")}</p>
      </div>
      
      <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 15px;">
        <div>
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 2px;">
            ${diasSemana.map(d => `<span style="text-align: center; font-weight: bold; font-size: 11px; padding: 5px; border: 1px solid #000; background: #eee;">${d}</span>`).join('')}
          </div>
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;">
            ${Array.from({ length: firstDayOfMonth }).map(() => '<div style="border: none;"></div>').join('')}
            ${calendar.map(day => {
        const dayNum = parseInt(day.fecha.split("-")[2], 10);
        const config = day.tipoJornada ? tipoJornadaConfig[day.tipoJornada] : null;
        const borderStyle = config ? '2px solid #000' : '1px solid #999';
        const bgPattern = config && !config.paga ? 'background: repeating-linear-gradient(45deg, #fff, #fff 2px, #ddd 2px, #ddd 4px);' : '';
        return `<div style="text-align: center; padding: 6px 2px; border: ${borderStyle}; min-height: 32px; ${bgPattern}">
                  <div style="font-size: 13px; font-weight: bold;">${dayNum}</div>
                  <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">${config ? config.short : ''}</div>
                </div>`;
    }).join('')}
          </div>
          <div style="margin-top: 8px; font-size: 10px; border-top: 1px solid #999; padding-top: 6px;">
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${Object.entries(tipoJornadaConfig).map(([, cfg]) =>
        `<span style="display: flex; align-items: center; gap: 3px;">
                  <span style="width: 14px; height: 14px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold;">${cfg.short}</span>
                  ${cfg.label}${cfg.paga ? '' : ' (no paga)'}
                </span>`
    ).join('')}
            </div>
          </div>
        </div>
        
        <div>
          <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
            <tr><th style="padding: 5px 8px; border: 1px solid #000; text-align: left; background: #eee;">Tipo</th><th style="padding: 5px 8px; border: 1px solid #000; text-align: left; background: #eee;">Días</th></tr>
            ${Object.entries(tipoJornadaConfig).filter(([key]) => resumen.counts[key as TipoJornada] > 0).map(([key, config]) =>
        `<tr><td style="padding: 5px 8px; border: 1px solid #000;"><strong>${config.short}</strong> ${config.label}</td><td style="padding: 5px 8px; border: 1px solid #000;">${resumen.counts[key as TipoJornada]}</td></tr>`
    ).join('')}
            ${resumen.counts.sin_marcar > 0 ? `<tr><td style="padding: 5px 8px; border: 1px solid #000;">Sin marcar</td><td style="padding: 5px 8px; border: 1px solid #000;">${resumen.counts.sin_marcar}</td></tr>` : ''}
          </table>
          <div style="margin-top: 10px; padding: 10px; border: 2px solid #000; font-size: 12px;">
            <p style="margin: 3px 0;">Días en período: ${resumen.diasRango} de ${resumen.diasMes}</p>
            <p style="margin: 3px 0;">Días pagados equiv.: ${resumen.diasPagados.toFixed(1)}</p>
            <p style="margin: 3px 0;"><strong style="font-size: 15px;">Sueldo Proporcional: $${resumen.sueldoProporcional.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</strong></p>
          </div>
        </div>
      </div>
    </div>
    `;

    // Crear elemento temporal
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    // Generar PDF
    const fileName = `Asistencia_${nombreTrabajador.replace(/\s+/g, "_")}_${mes}_${year}.pdf`;

    await html2pdf()
        .set({
            margin: 10,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(container)
        .save();

    // Limpiar
    document.body.removeChild(container);
}
