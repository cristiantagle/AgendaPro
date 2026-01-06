import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet } from "lucide-react";

export function BulkWorkerImport({ onSuccess }: { onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Leer como array de arrays para buscar headers
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

            // Buscar fila de encabezados
            let headerRowIndex = -1;
            const headerMap: Record<string, number> = {};

            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                const rowStr = row.map(c => String(c).toUpperCase().trim());

                if (rowStr.includes("NOMBRE") || rowStr.includes("RUT") || rowStr.includes("TRABAJADOR")) {
                    headerRowIndex = i;
                    rowStr.forEach((col, idx) => {
                        headerMap[col] = idx;
                    });
                    break;
                }
            }

            if (headerRowIndex === -1) {
                const debugRows = rawData.slice(0, 5).map(r => JSON.stringify(r)).join("\n");
                alert(`No se encontró fila de encabezados.\nBuscando: NOMBRE, RUT o TRABAJADOR.\n\nContenido leído:\n${debugRows}`);
                setLoading(false);
                return;
            }

            const workers = [];
            for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row || row.length === 0) continue;

                const getVal = (keys: string[]) => {
                    for (const k of keys) {
                        if (headerMap[k] !== undefined) return row[headerMap[k]];
                    }
                    return undefined;
                };

                const nombre = getVal(["NOMBRE", "NOMBRE COMPLETO", "TRABAJADOR", "NOMBRES"]);
                const rut = getVal(["RUT", "IDENTIFICADOR", "R.U.T."]);
                const email = getVal(["EMAIL", "CORREO", "MAIL", "CORREO ELECTRONICO"]);
                const sueldo = getVal(["SUELDO", "SUELDO BASE", "SUELDO MENSUAL"]);

                if (nombre || email) {
                    workers.push({ nombre, rut, email, sueldo });
                }
            }

            if (workers.length === 0) {
                alert("No se encontraron registros de trabajadores después de los encabezados.");
                setLoading(false);
                return;
            }

            const res = await fetch("/api/workers/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workers })
            });

            if (!res.ok) throw new Error("Error en servidor");
            const result = await res.json();
            alert(`Proceso finalizado exitosamente.\n\nregistros actualizados: ${result.updated}\nregistros omitidos: ${result.skipped}`);
            onSuccess();

        } catch (err) {
            alert("Error al procesar el archivo. Revisa el formato.");
            console.error(err);
        } finally {
            setLoading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <>
            <input
                type="file"
                ref={inputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={processFile}
            />
            <button
                disabled={loading}
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
                <FileSpreadsheet className="h-4 w-4" />
                {loading ? "Leyendo..." : "Importar Excel"}
            </button>
        </>
    );
}
