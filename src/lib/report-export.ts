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
    const doc = new PDFDocument({ margin: 32 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const palette = {
      bg: "#0b1220",
      panel: "#0f172a",
      accent: "#06b6d4",
      accentSoft: "#22d3ee",
      text: "#e2e8f0",
      muted: "#94a3b8",
      border: "#1f2937",
      stripe: "#0b192f",
    };

    const formatMoney = (value: number) =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(value);

    const formatHours = (value: number) => value.toFixed(2);

    // Background panel
    doc
      .rect(0, 0, doc.page.width, doc.page.height)
      .fill(palette.bg)
      .fillColor(palette.text);

    // Header
    doc
      .fontSize(20)
      .fillColor(palette.text)
      .text("Reporte Mensual de Asistencia", { align: "left" });
    doc
      .fontSize(11)
      .fillColor(palette.muted)
      .text(
        `Periodo: ${summary.month.toString().padStart(2, "0")}/${summary.year}`,
      )
      .text(`Generado: ${new Date().toLocaleString("es-CL")}`, { underline: false })
      .moveDown(0.5);

    // Info rows
    const infoStartY = doc.y;
    const columnWidth =
      (doc.page.width - doc.page.margins.left - doc.page.margins.right - 12) /
      3;

    const infoBlocks: Array<{ title: string; value: string }> = [
      { title: "Empresa", value: summary.company.name },
      { title: "Trabajador", value: summary.employee.nombreCompleto },
      {
        title: "Días trabajados",
        value: summary.diasTrabajados.toString(),
      },
    ];

    infoBlocks.forEach((block, idx) => {
      const x =
        doc.page.margins.left + idx * (columnWidth + 6);
      const y = infoStartY;
      doc
        .roundedRect(x, y, columnWidth, 54, 8)
        .fill(palette.panel)
        .fillColor(palette.muted)
        .fontSize(10)
        .text(block.title, x + 10, y + 10, { width: columnWidth - 20 });
      doc
        .fillColor(palette.text)
        .fontSize(12)
        .text(block.value, x + 10, y + 26, { width: columnWidth - 20 });
    });

    doc.y = infoStartY + 64;

    // Totals box
    const totalsStartY = doc.y;
    const totals = [
      {
        label: "Horas normales",
        value: `${formatHours(summary.horasNormales)}h`,
      },
      {
        label: "Horas extra",
        value: `${formatHours(summary.horasExtra)}h`,
      },
      {
        label: "Finde (norm/extra)",
        value: `${formatHours(summary.horasFindeNormales)}h / ${formatHours(
          summary.horasFindeExtra,
        )}h`,
      },
      {
        label: "Monto bruto",
        value: formatMoney(summary.montoBruto ?? summary.montoTotal),
      },
      {
        label: "Adelantos/quincenas",
        value: `-${formatMoney(summary.totalAdelantos ?? 0)}`,
      },
      {
        label: "Total a pagar",
        value: formatMoney(summary.montoTotal),
      },
    ];

    const totalsWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc
      .roundedRect(
        doc.page.margins.left,
        totalsStartY,
        totalsWidth,
        90,
        10,
      )
      .fill(palette.panel);

    const totalColWidth = (totalsWidth - 20) / 3;
    totals.forEach((item, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = doc.page.margins.left + 10 + col * totalColWidth;
      const y = totalsStartY + 12 + row * 36;
      doc
        .fillColor(palette.muted)
        .fontSize(10)
        .text(item.label, x, y, { width: totalColWidth - 12 });
      doc
        .fillColor(idx === totals.length - 1 ? palette.accentSoft : palette.text)
        .fontSize(12)
        .text(item.value, x, y + 14, { width: totalColWidth - 12 });
    });

    doc.y = totalsStartY + 100;

    // Payments detail (adelantos/quincenas)
    if (summary.payments && summary.payments.length > 0) {
      doc
        .moveDown(0.5)
        .fillColor(palette.text)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Detalle de adelantos/quincenas");

      const payCols: Array<{
        header: string;
        width: number;
        accessor: (pay: NonNullable<MonthlySummary["payments"]>[number]) => string;
      }> = [
        { header: "Fecha", width: 90, accessor: (p) => p.fecha },
        { header: "Tipo", width: 90, accessor: (p) => p.type },
        {
          header: "Nota",
          width: 200,
          accessor: (p) => p.note ?? "-",
        },
        {
          header: "Monto",
          width: 100,
          accessor: (p) => `-${formatMoney(p.amount)}`,
        },
      ];

      const payTableX = doc.page.margins.left;
      let payY = doc.y + 8;
      const payTableWidth = payCols.reduce((sum, col) => sum + col.width, 0);

      doc
        .roundedRect(payTableX, payY, payTableWidth, 22, 6)
        .fill(palette.panel)
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(palette.text);

      let payOffset = payTableX;
      payCols.forEach((col) => {
        doc.text(col.header, payOffset + 6, payY + 6, {
          width: col.width - 12,
          align: "left",
        });
        payOffset += col.width;
      });

      payY += 22;
      doc.font("Helvetica").fontSize(10);

      summary.payments.forEach((payment, idx) => {
        const isStriped = idx % 2 === 0;
        if (isStriped) {
          doc
            .rect(payTableX, payY, payTableWidth, 20)
            .fill(palette.stripe)
            .fillColor(palette.text);
        } else {
          doc.fillColor(palette.text);
        }

        payOffset = payTableX;
        payCols.forEach((col) => {
          doc.text(col.accessor(payment), payOffset + 6, payY + 6, {
            width: col.width - 12,
            align: "left",
          });
          payOffset += col.width;
        });
        payY += 20;
      });

      doc.y = payY + 6;
    }

    // Table
    const columnConfig: Array<{
      header: string;
      width: number;
      accessor: (day: MonthlySummary["dias"][number]) => string;
    }> = [
      { header: "Fecha", width: 80, accessor: (day) => day.fecha },
      {
        header: "Normales",
        width: 70,
        accessor: (day) => formatHours(day.horasNormales),
      },
      {
        header: "Extra",
        width: 70,
        accessor: (day) => formatHours(day.horasExtra),
      },
      {
        header: "Finde",
        width: 70,
        accessor: (day) => formatHours(day.horasFindeNormales),
      },
      {
        header: "Finde extra",
        width: 80,
        accessor: (day) => formatHours(day.horasFindeExtra),
      },
      {
        header: "Monto día",
        width: 90,
        accessor: (day) => formatMoney(day.montoTotalDia),
      },
    ];

    const tableStartX = doc.page.margins.left;
    let tableY = doc.y + 8;
    const tableWidth = columnConfig.reduce((sum, col) => sum + col.width, 0);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(palette.text)
      .roundedRect(tableStartX, tableY, tableWidth, 22, 6)
      .fill(palette.panel);

    let xOffset = tableStartX;
    columnConfig.forEach((column) => {
      doc.text(column.header, xOffset + 6, tableY + 6, {
        width: column.width - 12,
        align: "left",
      });
      xOffset += column.width;
    });

    tableY += 22;
    doc.font("Helvetica").fontSize(10);

    summary.dias.forEach((day, idx) => {
      const isStriped = idx % 2 === 0;
      if (isStriped) {
        doc
          .rect(tableStartX, tableY, tableWidth, 20)
          .fill(palette.stripe)
          .fillColor(palette.text);
      } else {
        doc.fillColor(palette.text);
      }

      xOffset = tableStartX;
      columnConfig.forEach((column) => {
        doc.text(column.accessor(day), xOffset + 6, tableY + 6, {
          width: column.width - 12,
          align: "left",
        });
        xOffset += column.width;
      });
      tableY += 20;
    });

    doc.end();
  });
