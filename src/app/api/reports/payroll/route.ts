import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getSession } from "@/lib/auth";
import { getPayrollReportForCompany } from "@/lib/report-service";

/**
 * GET /api/reports/payroll?month=1&year=2024&employees=id1,id2
 * Genera un PDF con la lista de trabajadores y sus días de falta
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== "company_admin") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        if (!session.companyId) {
            return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
        const employeesParam = searchParams.get("employees");
        const employeeIds = employeesParam ? employeesParam.split(",").filter(Boolean) : undefined;

        const report = await getPayrollReportForCompany(session.companyId, month, year, employeeIds);

        // Generar PDF
        const monthNames = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40, size: "LETTER" });
            const chunks: Buffer[] = [];
            doc.on("data", (chunk) => chunks.push(chunk as Buffer));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            // Encabezado
            doc.fontSize(18).font("Helvetica-Bold")
                .text("REPORTE DE ASISTENCIA - COTIZACIONES", { align: "center" });
            doc.moveDown(0.5);

            doc.fontSize(12).font("Helvetica")
                .text(`${monthNames[month]} ${year}`, { align: "center" });
            doc.moveDown(0.3);

            doc.fontSize(10).fillColor("#666666")
                .text(`Empresa: ${report.companyName}`, { align: "center" });
            if (report.companyRut) {
                doc.text(`RUT: ${report.companyRut}`, { align: "center" });
            }
            doc.moveDown(1);

            // Tabla con columnas: RUT, NOMBRE, AFP, SALUD, FALTAS
            const tableTop = doc.y;
            const colRut = 40;
            const colName = 140;
            const colAfp = 320;
            const colSalud = 400;
            const colFaltas = 490;

            // Headers
            doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
            doc.text("RUT", colRut, tableTop);
            doc.text("NOMBRE", colName, tableTop);
            doc.text("AFP", colAfp, tableTop);
            doc.text("SALUD", colSalud, tableTop);
            doc.text("FALTAS", colFaltas, tableTop);

            doc.moveTo(35, tableTop + 15).lineTo(570, tableTop + 15).stroke("#cccccc");

            // Filas
            let y = tableTop + 22;
            doc.font("Helvetica").fontSize(9);

            for (const emp of report.employees) {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                }

                doc.fillColor("#333333").text(emp.rut || "-", colRut, y, { width: 95 });
                doc.fillColor("#000000").text(emp.nombreCompleto, colName, y, { width: 175 });
                doc.fillColor("#666666").text("________", colAfp, y);
                doc.fillColor("#666666").text("________", colSalud, y);

                if (emp.diasFalta === 0) {
                    doc.fillColor("#22c55e").text("Mes Completo", colFaltas, y);
                } else {
                    doc.fillColor("#ef4444").text(`${emp.diasFalta}`, colFaltas, y);
                }

                y += 18;
            }

            // Resumen al final
            doc.moveDown(2);
            doc.fontSize(9).fillColor("#666666")
                .text(`Generado: ${new Date().toLocaleString("es-CL")}`, 40, y + 20);
            doc.text(`Total trabajadores: ${report.totalEmpleados}`, 40, y + 35);

            doc.end();
        });

        const filename = `faltas_${monthNames[month]}_${year}.pdf`;

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error generando reporte:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error interno" },
            { status: 500 }
        );
    }
}
