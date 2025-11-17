import PDFDocument from "pdfkit";
import { Parser } from "json2csv";

import type { MonthlySummary } from "./time-calculations";

export const monthlySummaryToCsv = (summary: MonthlySummary) => {
  const parser = new Parser({
    fields: [
      { label: "Fecha", value: "fecha" },
      { label: "Horas normales", value: "horasNormales" },
      { label: "Horas extra", value: "horasExtra" },
      { label: "Horas finde normales", value: "horasFindeNormales" },
      { label: "Horas finde extra", value: "horasFindeExtra" },
      { label: "Monto del día", value: "montoTotalDia" },
    ],
  });

  return parser.parse(summary.dias);
};

export const monthlySummaryToPdf = async (
  summary: MonthlySummary,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const formatMoney = (value: number) =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(value);

    const formatHours = (value: number) => value.toFixed(2);

    const columnConfig: Array<{
      header: string;
      width: number;
      accessor: (day: MonthlySummary["dias"][number]) => string;
    }> = [
      { header: "Fecha", width: 90, accessor: (day) => day.fecha },
      {
        header: "Hrs. normales",
        width: 90,
        accessor: (day) => formatHours(day.horasNormales),
      },
      {
        header: "Hrs. extra",
        width: 90,
        accessor: (day) => formatHours(day.horasExtra),
      },
      {
        header: "Hrs. finde",
        width: 90,
        accessor: (day) => formatHours(day.horasFindeNormales),
      },
      {
        header: "Hrs. finde extra",
        width: 90,
        accessor: (day) => formatHours(day.horasFindeExtra),
      },
      {
        header: "Monto día",
        width: 100,
        accessor: (day) => formatMoney(day.montoTotalDia),
      },
    ];

    doc
      .fontSize(18)
      .text("Reporte Mensual de Asistencia", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .text(`Empresa: ${summary.company.name}`)
      .text(`Trabajador: ${summary.employee.nombreCompleto}`)
      .text(
        `Periodo: ${summary.month.toString().padStart(2, "0")}/${summary.year}`,
      )
      .moveDown(0.5);

    const infoBoxWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const infoBoxHeight = 70;
    const infoStartX = doc.x;
    const infoStartY = doc.y;

    doc.rect(infoStartX, infoStartY, infoBoxWidth, infoBoxHeight).fill("#f1f5f9");
    doc
      .fillColor("#0f172a")
      .fontSize(11)
      .text(`Días trabajados: ${summary.diasTrabajados}`, infoStartX + 12, infoStartY + 10)
      .text(`Horas normales: ${formatHours(summary.horasNormales)}`)
      .text(`Horas extra: ${formatHours(summary.horasExtra)}`)
      .text(
        `Horas finde (normales/extra): ${formatHours(
          summary.horasFindeNormales,
        )} / ${formatHours(summary.horasFindeExtra)}`,
      )
      .text(`Monto total: ${formatMoney(summary.montoTotal)}`);

    doc.moveTo(infoStartX, infoStartY + infoBoxHeight).lineTo(infoStartX + infoBoxWidth, infoStartY + infoBoxHeight).strokeColor("#cbd5f5").stroke();
    doc.y = infoStartY + infoBoxHeight + 20;

    doc.fontSize(11).fillColor("#0f172a");

    const tableTop = doc.y;
    const tableStartX = doc.x;
    const tableWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.lineWidth(1).strokeColor("#cbd5f5");

    // Header row
    doc
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .rect(tableStartX, tableTop, tableWidth, 22)
      .fill("#e2e8f0");

    let xOffset = tableStartX;
    columnConfig.forEach((column) => {
      doc
        .fillColor("#0f172a")
        .text(column.header, xOffset + 4, tableTop + 6, {
          width: column.width - 8,
        });
      xOffset += column.width;
    });

    doc.font("Helvetica").fillColor("#0f172a");

    let rowY = tableTop + 22;
    summary.dias.forEach((day, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc
          .rect(tableStartX, rowY, tableWidth, 20)
          .fill("#f8fafc")
          .fillColor("#0f172a");
      }
      xOffset = tableStartX;
      columnConfig.forEach((column) => {
        doc.text(column.accessor(day), xOffset + 4, rowY + 6, {
          width: column.width - 8,
        });
        xOffset += column.width;
      });
      rowY += 20;
    });

    doc
      .moveTo(tableStartX, tableTop)
      .lineTo(tableStartX, rowY)
      .stroke()
      .moveTo(tableStartX + tableWidth, tableTop)
      .lineTo(tableStartX + tableWidth, rowY)
      .stroke();

    doc.end();
  });
