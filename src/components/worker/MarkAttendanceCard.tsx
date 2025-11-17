"use client";

import { useState } from "react";

type RecordState = {
  horaEntrada?: string | null;
  horaInicioAlmuerzo?: string | null;
  horaFinAlmuerzo?: string | null;
  horaSalida?: string | null;
};

type Props = {
  todayRecord: RecordState | null;
  onRefresh?: () => void;
};

const ACTION_LABELS: Record<string, string> = {
  entrada: "Marcar entrada",
  inicio_almuerzo: "Inicio almuerzo",
  fin_almuerzo: "Fin almuerzo",
  salida: "Marcar salida",
};

export function MarkAttendanceCard({ todayRecord, onRefresh }: Props) {
  const [record, setRecord] = useState<RecordState | null>(todayRecord);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const steps: Array<{
    key: "entrada" | "inicio_almuerzo" | "fin_almuerzo" | "salida";
    done: boolean;
  }> = [
    { key: "entrada", done: Boolean(record?.horaEntrada) },
    { key: "inicio_almuerzo", done: Boolean(record?.horaInicioAlmuerzo) },
    { key: "fin_almuerzo", done: Boolean(record?.horaFinAlmuerzo) },
    { key: "salida", done: Boolean(record?.horaSalida) },
  ];

  const canTrigger = (action: string) => {
    if (action === "entrada") return !record?.horaEntrada;
    if (action === "inicio_almuerzo")
      return Boolean(record?.horaEntrada) && !record?.horaInicioAlmuerzo;
    if (action === "fin_almuerzo")
      return Boolean(record?.horaInicioAlmuerzo) && !record?.horaFinAlmuerzo;
    if (action === "salida")
      return Boolean(record?.horaFinAlmuerzo) && !record?.horaSalida;
    return false;
  };

  const triggerAction = async (
    action: "entrada" | "inicio_almuerzo" | "fin_almuerzo" | "salida",
  ) => {
    setLoading(action);
    setMessage(null);

    try {
      const response = await fetch("/api/time-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "No se pudo marcar");
      }

      const data = await response.json();
      setRecord(data.record);
      onRefresh?.();
      setMessage("Marcación guardada.");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-800">
        Marcaciones del día
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <button
            key={step.key}
            type="button"
            disabled={!canTrigger(step.key) || Boolean(loading)}
            onClick={() => triggerAction(step.key)}
            className={`rounded-xl border px-3 py-2 text-left ${
              step.done
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <p className="font-semibold">{ACTION_LABELS[step.key]}</p>
            <p className="text-sm">
              {step.done
                ? `Registrado ${(() => {
                    const key =
                      step.key === "inicio_almuerzo"
                        ? "horaInicioAlmuerzo"
                        : step.key === "fin_almuerzo"
                          ? "horaFinAlmuerzo"
                          : step.key === "entrada"
                            ? "horaEntrada"
                            : "horaSalida";
                    const value =
                      record &&
                      (record as Record<string, string | null>)[key];
                    return value
                      ? new Date(value).toLocaleTimeString()
                      : "";
                  })()}`
                : loading === step.key
                  ? "Guardando..."
                  : "Pendiente"}
            </p>
          </button>
        ))}
      </div>
      {message ? (
        <p className="text-sm text-blue-700">{message}</p>
      ) : null}
    </div>
  );
}
