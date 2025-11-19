"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { FaceRecognitionPanel } from "./FaceRecognitionPanel";

type Employee = {
  id: string;
  nombreCompleto: string;
};

type Props = {
  companyId: string;
  slug: string;
  companyName: string;
  employees: Employee[];
  initialDeviceName: string | null;
  logoUrl?: string;
};

const actions: Array<{ key: "entrada" | "inicio_almuerzo" | "fin_almuerzo" | "salida"; label: string }> = [
  { key: "entrada", label: "Entrada" },
  { key: "inicio_almuerzo", label: "Inicio almuerzo" },
  { key: "fin_almuerzo", label: "Fin almuerzo" },
  { key: "salida", label: "Salida" },
];
type ActionKey = (typeof actions)[number]["key"];

export function KioskTerminal({
  companyId,
  slug,
  companyName,
  employees,
  initialDeviceName,
  logoUrl,
}: Props) {
  const storageKey = useMemo(() => `kiosk-token:${slug}`, [slug]);
  const [authorizedName, setAuthorizedName] = useState(initialDeviceName);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id ?? "");
  const [filter, setFilter] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [buttonsLocked, setButtonsLocked] = useState(false);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastMark, setLastMark] = useState<{
    action: string;
    time: string;
  } | null>(null);
type WorkerStatus = {
  runningSince: string | null;
  workedMs: number;
  lastAction?: string;
  lastTime?: string;
  marks: Partial<Record<ActionKey, string>>;
};
type HistoryEntry = {
  id: string;
  employeeName: string;
  action: string;
  timestamp: string;
};
  const [workerStatus, setWorkerStatus] = useState<
    Record<string, WorkerStatus>
  >({});
  const [tick, setTick] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const formatTime = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";

  const formatDuration = useCallback(
    (employeeId: string) => {
      const status = workerStatus[employeeId];
      if (!status) return "0h 00m";
      const base = status.workedMs;
      const runningExtra = status.runningSince
        ? Date.now() - new Date(status.runningSince).getTime()
        : 0;
      const totalMinutes = Math.max(
        0,
        Math.floor((base + runningExtra) / 60000),
      );
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
    },
    [workerStatus],
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        employee.nombreCompleto.toLowerCase().includes(filter.toLowerCase()),
      ),
    [employees, filter],
  );

  const mapWorkers = useCallback((workers: Array<WorkerStatus & { id: string }>) => {
    const statusMap: Record<string, WorkerStatus> = {};
    workers.forEach((worker) => {
      statusMap[worker.id] = {
        runningSince: worker.runningSince,
        workedMs: worker.workedMs,
        lastAction: worker.lastAction,
        lastTime: worker.lastTime,
        marks: worker.marks ?? {},
      };
    });
    setWorkerStatus(statusMap);
  }, []);

  const refreshWorkerStatus = useCallback(
    async (explicitToken?: string) => {
      const token = explicitToken ?? deviceToken;
      if (!token) return;
      try {
        const res = await fetch(`/api/kiosk/${slug}/authorize`, {
          method: "GET",
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 401) {
            if (typeof window !== "undefined") {
              window.localStorage.removeItem(storageKey);
            }
            setDeviceToken(null);
            setAuthorizedName(null);
          }
          return;
        }
        const data = await res.json();
        setAuthorizedName(data.device?.name ?? "Terminal");
        if (!deviceToken) {
          setDeviceToken(token);
        }
        if (explicitToken && typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, explicitToken);
        }
        if (Array.isArray(data.workers)) {
          mapWorkers(data.workers as Array<WorkerStatus & { id: string }>);
        }
        if (Array.isArray(data.history)) {
          setHistory(
            data.history.map((entry: HistoryEntry) => ({
              ...entry,
              timestamp: entry.timestamp,
            })),
          );
        }
      } catch {
        // ignore
      }
    },
    [deviceToken, mapWorkers, slug, storageKey],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    setAuthorizing(true);
    refreshWorkerStatus(stored).finally(() => setAuthorizing(false));
  }, [refreshWorkerStatus, storageKey]);

useEffect(() => {
  return () => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
  };
}, []);

useEffect(() => {
  const interval = setInterval(() => setTick((value) => value + 1), 1000);
  return () => clearInterval(interval);
}, []);

useEffect(() => {
  if (!deviceToken) return undefined;
  let activeChannel: { unsubscribe: () => void } | null = null;
  try {
    const client = getSupabaseBrowserClient();
    activeChannel = client
      .channel(`time-records:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "TimeRecord",
          filter: `companyId=eq.${companyId}`,
        },
        () => {
          void refreshWorkerStatus();
        },
      )
      .subscribe();
  } catch {
    return undefined;
  }
  return () => {
    activeChannel?.unsubscribe();
  };
}, [companyId, deviceToken, refreshWorkerStatus]);

  const authorizeDevice = async () => {
    if (!pin.trim()) {
      setAuthMessage("Ingresa el PIN entregado por el administrador.");
      return;
    }
    setAuthorizing(true);
    setAuthMessage(null);
    try {
      const res = await fetch(`/api/kiosk/${slug}/authorize`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          deviceName: deviceLabel || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No se pudo autorizar este dispositivo");
      }
      const data = await res.json();
      setAuthorizedName(data.device.name ?? "Terminal");
      if (data.token) {
        setDeviceToken(data.token);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, data.token);
        }
        await refreshWorkerStatus(data.token);
      } else {
        await refreshWorkerStatus();
      }
      setAuthMessage("Dispositivo autorizado correctamente.");
    } catch (error) {
      setAuthMessage((error as Error).message);
    } finally {
      setAuthorizing(false);
    }
  };

  const updateWorkerTracking = (
    employeeId: string,
    action: (typeof actions)[number]["key"],
    timestamp: string | null,
  ) => {
    const isoTime = timestamp ?? new Date().toISOString();
    setWorkerStatus((prev) => {
      const current = prev[employeeId] ?? {
        runningSince: null,
        workedMs: 0,
        marks: {},
      };
      const currentRunning = current.runningSince
        ? new Date(current.runningSince).getTime()
        : null;
      const timeMs = new Date(isoTime).getTime();
      let workedMs = current.workedMs;
      let runningSince = current.runningSince;

      if (action === "entrada" || action === "fin_almuerzo") {
        runningSince = isoTime;
      }

      if (action === "inicio_almuerzo" || action === "salida") {
        if (currentRunning) {
          workedMs += Math.max(0, timeMs - currentRunning);
        }
        runningSince = null;
      }

      if (action === "entrada") {
        workedMs = current.workedMs;
      }

      const marks = {
        ...(current.marks ?? {}),
        [action]: isoTime,
      };

      return {
        ...prev,
        [employeeId]: {
          runningSince,
          workedMs,
          lastAction: actions.find((item) => item.key === action)?.label,
          lastTime: isoTime,
          marks,
        },
      };
    });
  };

  const markAction = async (action: (typeof actions)[number]["key"]) => {
    if (buttonsLocked) {
      setStatusMessage("Espera unos segundos antes de registrar otra marcación.");
      return;
    }
    if (!authorizedName) {
      setStatusMessage("Autoriza este kiosco con el PIN antes de marcar.");
      return;
    }
    if (!selectedEmployee) {
      setStatusMessage("Selecciona un trabajador.");
      return;
    }
    setLoadingAction(action);
    setStatusMessage(null);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (deviceToken) {
        headers.Authorization = `Bearer ${deviceToken}`;
      }
      const res = await fetch(`/api/kiosk/${slug}/mark`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          employeeId: selectedEmployee,
          action,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          setAuthorizedName(null);
          setAuthMessage(
            data.error ??
              "Autoriza nuevamente este kiosco con el PIN vigente.",
          );
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(storageKey);
          }
          setDeviceToken(null);
        }
        throw new Error(data.error ?? "No se pudo registrar la marcación");
      }
      const data = await res.json();
      const record = data.record as {
        horaEntrada?: string | null;
        horaInicioAlmuerzo?: string | null;
        horaFinAlmuerzo?: string | null;
        horaSalida?: string | null;
      };
      const fieldMap: Record<string, keyof typeof record> = {
        entrada: "horaEntrada",
        inicio_almuerzo: "horaInicioAlmuerzo",
        fin_almuerzo: "horaFinAlmuerzo",
        salida: "horaSalida",
      };
      const field = fieldMap[action];
      const timeValue = field ? record?.[field] : null;
      const formattedTime = timeValue
        ? new Date(timeValue).toLocaleTimeString("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date().toLocaleTimeString("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
          });
      setLastMark({
        action: actions.find((item) => item.key === action)?.label ?? "Acción",
        time: formattedTime,
      });
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      setButtonsLocked(true);
      lockTimeoutRef.current = setTimeout(() => {
        setButtonsLocked(false);
      }, 4000);
      const isoTime = timeValue ?? new Date().toISOString();
      updateWorkerTracking(selectedEmployee, action, isoTime);
      setHistory((prev) => {
        const entry: HistoryEntry = {
          id: data.record.id as string,
          employeeName:
            employees.find((emp) => emp.id === selectedEmployee)
              ?.nombreCompleto ?? "Trabajador",
          action:
            actions.find((item) => item.key === action)?.label ?? "Marcación",
          timestamp: isoTime,
        };
        return [entry, ...prev].slice(0, 12);
      });
      void refreshWorkerStatus();
      setStatusMessage("Marcación registrada con éxito.");
    } catch (error) {
      setStatusMessage((error as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

  const selectedWorkedLabel = useMemo(
    () => {
      void tick;
      return formatDuration(selectedEmployee);
    },
    [formatDuration, selectedEmployee, tick],
  );
  const selectedStatus = workerStatus[selectedEmployee || ""] ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl bg-white p-6 shadow-2xl">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo ${companyName}`}
                className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain p-2"
              />
            ) : null}
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
                Terminal de asistencia
              </p>
              <h1 className="text-4xl font-semibold text-slate-900">
                {companyName}
              </h1>
            </div>
          </div>
          <Image
            src="/tagle-labs-logo.svg"
            alt="Tagle Labs"
            width={180}
            height={48}
            className="h-12 w-auto"
            priority
          />
        </div>
        <p className="text-sm text-slate-500">
          Toca tu nombre y selecciona la acción que corresponda.
        </p>
        <p className="text-xs text-slate-500">
          Kiosco{" "}
          {authorizedName
            ? `autorizado (${authorizedName})`
            : "no autorizado"}
        </p>
      </header>

      {!authorizedName ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-xl font-semibold text-slate-800">
            Autorizar este dispositivo
          </h2>
          <p className="text-sm text-slate-600">
            Ingresa el PIN vigente para dejar la tablet siempre habilitada.
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="PIN de 6 dígitos"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.4em]"
            />
            <input
              value={deviceLabel}
              onChange={(event) => setDeviceLabel(event.target.value)}
              placeholder="Nombre del terminal (opcional)"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            />
            <button
              type="button"
              onClick={authorizeDevice}
              disabled={authorizing}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-lg font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {authorizing ? "Autorizando..." : "Autorizar"}
            </button>
          </div>
          {authMessage ? (
            <p className="mt-2 text-sm text-emerald-600">{authMessage}</p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Buscar trabajador..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2"
          />
          <p className="text-sm text-slate-600">
            {filteredEmployees.length} trabajadores
          </p>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => {
            const status = workerStatus[employee.id];
            const isActive =
              Boolean(status?.runningSince) && !status?.marks?.salida;
            const statusLabel = isActive
              ? `En jornada desde ${formatTime(status?.runningSince ?? undefined)}`
              : status?.lastAction
                ? `${status.lastAction} (${formatTime(status.lastTime)})`
                : "Sin marcaciones hoy";
            return (
              <button
                key={employee.id}
                type="button"
                onClick={() => setSelectedEmployee(employee.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  selectedEmployee === employee.id
                    ? "border-emerald-500 bg-white shadow"
                    : "border-slate-200 bg-white hover:border-emerald-200"
                } ${isActive ? "ring-2 ring-emerald-200" : ""}`}
              >
                <p className="text-lg font-semibold text-slate-900">
                  {employee.nombreCompleto}
                </p>
                <p className="text-xs text-slate-500">{statusLabel}</p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => {
            const markTime =
              selectedStatus?.marks?.[action.key] ?? null;
            return (
              <div key={action.key} className="space-y-1">
                <p className="text-xs text-slate-500">
                  {markTime
                    ? `${action.label}: ${formatTime(markTime)}`
                    : `${action.label}: sin registrar`}
                </p>
                <button
                  type="button"
                  onClick={() => markAction(action.key)}
                  disabled={
                    !authorizedName ||
                    !selectedEmployee ||
                    loadingAction === action.key ||
                    buttonsLocked
                  }
                  className="w-full rounded-xl bg-emerald-600 px-4 py-5 text-lg font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loadingAction === action.key ? "Enviando..." : action.label}
                </button>
              </div>
            );
          })}
        </div>
        {statusMessage ? (
          <p className="text-sm text-emerald-600">{statusMessage}</p>
        ) : null}
        {lastMark ? (
          <p className="text-sm text-slate-600">
            Última marcación: {lastMark.action} a las {lastMark.time}
          </p>
        ) : null}
        <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
          <p>
            Horas trabajadas hoy:{" "}
            <span className="font-semibold text-slate-900">
              {selectedWorkedLabel}
            </span>
          </p>
          <p>
            Última acción del trabajador:{" "}
            <span className="font-semibold text-slate-900">
              {selectedStatus?.lastAction
                ? `${selectedStatus.lastAction} a las ${formatTime(selectedStatus?.lastTime)}`
                : "Sin marcaciones hoy"}
            </span>
          </p>
        </div>
      </section>

      <FaceRecognitionPanel
        slug={slug}
        employees={employees}
        selectedEmployeeId={selectedEmployee}
        deviceToken={deviceToken}
        authorized={Boolean(authorizedName)}
        onEmployeeDetected={(employeeId) => {
          setSelectedEmployee(employeeId);
          setStatusMessage("Rostro reconocido, seleccionamos al trabajador automáticamente.");
        }}
        onStatus={(message) => setStatusMessage(message)}
      />

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">
            Últimas marcaciones
          </h3>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Tiempo real
          </span>
        </div>
        <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100">
          {history.length ? (
            history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2 text-sm text-slate-600"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {entry.employeeName}
                  </p>
                  <p>{entry.action}</p>
                </div>
                <span className="text-right text-xs">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
            ))
          ) : (
            <p className="py-3 text-sm text-slate-500">
              Aún no hay marcaciones registradas hoy.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
