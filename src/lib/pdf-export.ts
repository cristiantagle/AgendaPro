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
  // Crear el HTML del reporte con colores
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 15px; max-width: 800px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
      <div style="margin-bottom: 12px; border-bottom: 3px solid #333; padding-bottom: 8px;">
        <h1 style="margin: 0 0 4px 0; font-size: 20px; color: #000;">Reporte de Asistencia</h1>
        <p style="margin: 3px 0; font-size: 13px;"><strong>${nombreTrabajador}</strong> | ${mes} ${year} (${rangeLabel})</p>
        <p style="margin: 3px 0; font-size: 13px;">Sueldo Base: <strong>$${sueldoBase.toLocaleString("es-CL")}</strong></p>
      </div>
      
      <div style="display: flex; gap: 20px;">
        <div style="flex: 1.4;">
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 3px;">
            ${diasSemana.map(d => `<div style="text-align: center; font-weight: bold; font-size: 12px; padding: 6px; background-color: #374151; color: white; border-radius: 4px;">${d}</div>`).join('')}
          </div>
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;">
            ${Array.from({ length: firstDayOfMonth }).map(() => '<div></div>').join('')}
            ${calendar.map(day => {
    const dayNum = parseInt(day.fecha.split("-")[2], 10);
    const config = day.tipoJornada ? tipoJornadaConfig[day.tipoJornada] : null;
    const bgColor = config ? config.color : '#f3f4f6';
    const textColor = config ? '#ffffff' : '#6b7280';
    return `<div style="text-align: center; padding: 8px 4px; background-color: ${bgColor}; color: ${textColor}; border-radius: 6px; min-height: 40px;">
                  <div style="font-size: 14px; font-weight: bold;">${dayNum}</div>
                  <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${config ? config.short : '-'}</div>
                </div>`;
  }).join('')}
          </div>
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #ddd;">
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${Object.entries(tipoJornadaConfig).map(([, cfg]) =>
    `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 9px;">
                  <span style="width: 16px; height: 16px; background-color: ${cfg.color}; border-radius: 3px; display: inline-block;"></span>
                  ${cfg.short}: ${cfg.label}
                </span>`
  ).join('')}
            </div>
          </div>
        </div>
        
        <div style="flex: 1;">
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f3f4f6; font-weight: bold;">Tipo</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center; background-color: #f3f4f6; font-weight: bold;">Días</th>
            </tr>
            ${Object.entries(tipoJornadaConfig).filter(([key]) => resumen.counts[key as TipoJornada] > 0).map(([key, config]) =>
    `<tr>
                  <td style="padding: 6px 8px; border: 1px solid #ddd;">
                    <span style="display: inline-block; width: 12px; height: 12px; background-color: ${config.color}; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>
                    ${config.label}
                  </td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${resumen.counts[key as TipoJornada]}</td>
                </tr>`
  ).join('')}
            ${resumen.counts.sin_marcar > 0 ? `<tr><td style="padding: 6px 8px; border: 1px solid #ddd;">Sin marcar</td><td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${resumen.counts.sin_marcar}</td></tr>` : ''}
          </table>
          <div style="margin-top: 12px; padding: 12px; background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px;">
            <p style="margin: 4px 0; font-size: 12px;">Días en período: <strong>${resumen.diasRango}</strong> de ${resumen.diasMes}</p>
            <p style="margin: 4px 0; font-size: 12px;">Días pagados equiv.: <strong>${resumen.diasPagados.toFixed(1)}</strong></p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: bold; color: #059669;">Sueldo Proporcional: $${resumen.sueldoProporcional.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</p>
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
