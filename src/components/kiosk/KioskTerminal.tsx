"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { FaceRecognitionPanel } from "./FaceRecognitionPanel";
import type { Role } from "@/types/database";

type Employee = {
  id: string;
  nombreCompleto: string;
  role: Role;
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
  const kioskUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/terminal/${slug}`;
    }
    return `${window.location.origin}/terminal/${slug}`;
  }, [slug]);
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
  const BIOMETRIC_UNLOCK_MS = 45 * 1000;
  const [biometricUnlock, setBiometricUnlock] = useState<{
    employeeId: string;
    expiresAt: number;
  } | null>(null);
  const [lastMark, setLastMark] = useState<{
    action: string;
    time: string;
  } | null>(null);
  const ADMIN_SESSION_MS = 3 * 60 * 1000;
  const [recognizedEmployee, setRecognizedEmployee] = useState<Employee | null>(null);
  const [sessionRole, setSessionRole] = useState<"none" | "worker" | "admin">("none");
  const [adminSessionExpiresAt, setAdminSessionExpiresAt] = useState<number | null>(null);
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

  const biometricRemainingSeconds = biometricUnlock
    ? Math.max(0, Math.floor((biometricUnlock.expiresAt - Date.now()) / 1000))
    : 0;
  const biometricValid =
    Boolean(biometricUnlock) &&
    biometricUnlock?.employeeId === selectedEmployee &&
    biometricRemainingSeconds > 0;

  const adminSessionActive =
    Boolean(adminSessionExpiresAt) && (adminSessionExpiresAt ?? 0) > Date.now();
  const workerActive =
    sessionRole === "worker" &&
    biometricValid &&
    recognizedEmployee &&
    recognizedEmployee.id === selectedEmployee;
  useEffect(() => {
    if (!adminSessionExpiresAt) return;
    const remaining = adminSessionExpiresAt - Date.now();
    if (remaining <= 0) {
      setAdminSessionExpiresAt(null);
      return;
    }
    const timeout = setTimeout(() => setAdminSessionExpiresAt(null), remaining);
    return () => clearTimeout(timeout);
  }, [adminSessionExpiresAt]);

  useEffect(() => {
    if (!biometricUnlock) {
      return;
    }
    const remaining = biometricUnlock.expiresAt - Date.now();
    if (remaining <= 0) {
      setBiometricUnlock(null);
      return;
    }
    const timeout = setTimeout(() => setBiometricUnlock(null), remaining);
    return () => clearTimeout(timeout);
  }, [biometricUnlock]);

  useEffect(() => {
    if (sessionRole === "worker" && !biometricValid) {
      setSessionRole("none");
      setRecognizedEmployee(null);
    }
  }, [biometricValid, sessionRole]);

  useEffect(() => {
    if (sessionRole === "admin" && !adminSessionActive) {
      setSessionRole("none");
      setRecognizedEmployee(null);
    }
  }, [adminSessionActive, sessionRole]);

  const resetSession = () => {
    setSessionRole("none");
    setRecognizedEmployee(null);
    setBiometricUnlock(null);
    setAdminSessionExpiresAt(null);
  };

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
    if (!biometricValid) {
      setStatusMessage("Identifícate con tu rostro para desbloquear las acciones.");
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
      setBiometricUnlock(null);
    } catch (error) {
      setStatusMessage((error as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRecognition = (employeeId: string, confidence: number) => {
    const person = employees.find((emp) => emp.id === employeeId) ?? null;
    setRecognizedEmployee(person);
    if (person?.role === "company_admin") {
      setSessionRole("admin");
      setAdminSessionExpiresAt(Date.now() + ADMIN_SESSION_MS);
      setStatusMessage(
        `Hola ${person.nombreCompleto}. Panel administrador desbloqueado por ${(ADMIN_SESSION_MS / 60000).toFixed(0)} min.`,
      );
      setBiometricUnlock(null);
    } else {
      setSessionRole("worker");
      setBiometricUnlock({
        employeeId,
        expiresAt: Date.now() + BIOMETRIC_UNLOCK_MS,
      });
      setStatusMessage(
        `Rostro reconocido (confianza ${(confidence * 100).toFixed(0)}%). Acciones desbloqueadas por ${
          BIOMETRIC_UNLOCK_MS / 1000
        }s.`,
      );
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
    <div className="mx-auto max-w-6xl space-y-6 p-2">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-2xl">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-emerald-500 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-sky-400 blur-3xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo ${companyName}`}
                className="h-24 w-24 rounded-2xl border border-white/30 bg-white/10 object-contain p-3"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-white/30 bg-white/5 text-4xl font-light uppercase">
                {companyName.slice(0, 2)}
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-[0.4em] text-white/70">
                Terminal Neo · Paso guiado
              </span>
              <h1 className="text-4xl font-semibold leading-tight">
                {companyName}
              </h1>
              <p className="text-sm text-white/80">
                Sigue los pasos para marcar tu jornada o entrenar el reconocimiento facial.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/60">Estado kiosco</p>
              <p className="text-base font-semibold">
                {authorizedName ? `Autorizado • ${authorizedName}` : "No autorizado"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/60">Horas en seguimiento</p>
              <p className="text-base font-semibold">{selectedWorkedLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/60">Última acción</p>
              <p className="text-base font-semibold">
                {selectedStatus?.lastAction
                  ? `${selectedStatus.lastAction} · ${formatTime(selectedStatus.lastTime)}`
                  : "Sin marcar hoy"}
              </p>
            </div>
            <Image
              src="/tagle-labs-logo.svg"
              alt="Tagle Labs"
              width={160}
              height={40}
              className="h-12 w-auto opacity-80"
              priority
            />
          </div>
        </div>
      </section>

      {!authorizedName ? (
        <section className="rounded-3xl border border-emerald-200/50 bg-white p-5 shadow-lg shadow-emerald-100/40">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">
              Paso 0 · Seguridad
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Autoriza esta terminal con tu PIN maestro
            </h2>
            <p className="text-sm text-slate-500">
              Sólo los dispositivos autorizados pueden registrar rostros y marcaciones.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row">
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="PIN de 6 dígitos"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl tracking-[0.4em]"
            />
            <input
              value={deviceLabel}
              onChange={(event) => setDeviceLabel(event.target.value)}
              placeholder="Nombre del terminal (opcional)"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />
            <button
              type="button"
              onClick={authorizeDevice}
              disabled={authorizing}
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3 text-lg font-semibold text-white shadow-lg shadow-emerald-200/50 transition hover:brightness-110 disabled:opacity-60"
            >
              {authorizing ? "Autorizando..." : "Autorizar"}
            </button>
          </div>
          {authMessage ? (
            <p className="mt-3 text-sm font-medium text-emerald-600">{authMessage}</p>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-6 rounded-3xl bg-slate-950/5 p-4 sm:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-white/60 bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Paso 1
              </p>
              <h3 className="text-xl font-semibold text-slate-900">
                Selecciona tu nombre
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              {filteredEmployees.length} trabajadores
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Busca por nombre o apellido..."
              className="w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="grid max-h-[360px] gap-3 overflow-y-auto rounded-2xl bg-slate-50/60 p-2 sm:grid-cols-1">
            {filteredEmployees.map((employee) => {
              const status = workerStatus[employee.id];
              const isActive =
                Boolean(status?.runningSince) && !status?.marks?.salida;
              const statusLabel = isActive
                ? `En jornada desde ${formatTime(status?.runningSince ?? undefined)}`
                : status?.lastAction
                  ? `${status.lastAction} (${formatTime(status.lastTime)})`
                  : "Sin marcaciones hoy";
              const initials = employee.nombreCompleto
                .split(" ")
                .slice(0, 2)
                .map((word) => word[0])
                .join("");
              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmployee(employee.id);
                    setBiometricUnlock(null);
                  }}
                  className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    selectedEmployee === employee.id
                      ? "border-emerald-400 bg-white shadow-lg shadow-emerald-100"
                      : "border-transparent bg-white/80 hover:border-emerald-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                        isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {employee.nombreCompleto}
                      </p>
                      <p className="text-xs text-slate-500">{statusLabel}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isActive ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {isActive ? "EN JORNADA" : "LISTO"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/60 bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Paso 2
              </p>
              <h3 className="text-xl font-semibold text-slate-900">
                Marca la acción correspondiente
              </h3>
            </div>
            <div className="flex flex-col items-end">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {selectedStatus?.lastAction
                  ? `${selectedStatus.lastAction}`
                  : "Sin registros"}
              </span>
              <span
                className={`mt-1 text-xs font-semibold ${
                  biometricValid ? "text-emerald-600" : "text-rose-500"
                }`}
              >
                {biometricValid
                  ? `Biometría activa (${biometricRemainingSeconds}s)`
                  : "Biometría requerida"}
              </span>
            </div>
          </div>
          {workerActive && recognizedEmployee ? (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div>
                <p className="text-xs uppercase text-emerald-600">Trabajador reconocido</p>
                <p className="text-lg font-semibold text-emerald-900">
                  {recognizedEmployee.nombreCompleto}
                </p>
              </div>
              <button
                type="button"
                onClick={resetSession}
                className="rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600"
              >
                No soy yo
              </button>
            </div>
          ) : null}
          {workerActive ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {actions.map((action) => {
                const markTime = selectedStatus?.marks?.[action.key] ?? null;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => markAction(action.key)}
                    disabled={
                      !authorizedName ||
                      !selectedEmployee ||
                      loadingAction === action.key ||
                      buttonsLocked ||
                      !biometricValid
                    }
                    className={`group rounded-2xl border px-4 py-4 text-left transition ${
                      markTime
                        ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white hover:border-emerald-200"
                    }`}
                  >
                    <p className="text-sm uppercase tracking-wide text-slate-400 group-disabled:text-slate-300">
                      {action.label}
                    </p>
                    <p className="text-2xl font-semibold">
                      {loadingAction === action.key
                        ? "..."
                        : markTime
                          ? formatTime(markTime)
                          : "— — : — —"}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Identifica tu rostro para desbloquear las acciones de marcación.
            </div>
          )}
          {statusMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {statusMessage}
            </div>
          ) : null}
          {lastMark ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Última marcación: <strong>{lastMark.action}</strong> · {lastMark.time}
            </div>
          ) : null}
        </div>
      </section>

      <FaceRecognitionPanel
        slug={slug}
        employees={employees}
        selectedEmployeeId={selectedEmployee}
        deviceToken={deviceToken}
        authorized={Boolean(authorizedName)}
        allowEnrollment={sessionRole === "admin" && adminSessionActive}
        onEmployeeDetected={(employeeId, confidence) => {
          setSelectedEmployee(employeeId);
          handleRecognition(employeeId, confidence);
        }}
        onStatus={(message) => setStatusMessage(message)}
      />

      {sessionRole === "admin" && adminSessionActive && recognizedEmployee ? (
        <section className="rounded-3xl border border-emerald-200/60 bg-white p-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">
                Modo administrador activo
              </p>
              <h3 className="text-2xl font-semibold text-slate-900">
                {recognizedEmployee.nombreCompleto}
              </h3>
              <p className="text-sm text-slate-500">
                Gestiona la terminal, consulta la URL y entrena nuevos rostros.
              </p>
            </div>
            <button
              type="button"
              onClick={resetSession}
              className="rounded-full border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-600"
            >
              Cerrar sesión admin
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="text-xs uppercase text-slate-400">URL del kiosco</p>
              <p className="break-all text-base font-semibold text-slate-900">
                {kioskUrl}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="text-xs uppercase text-slate-400">Dispositivo</p>
              <p className="text-base font-semibold text-slate-900">
                {authorizedName ?? "No autorizado"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="text-xs uppercase text-slate-400">Tiempo restante</p>
              <p className="text-base font-semibold text-slate-900">
                {Math.max(0, Math.floor(((adminSessionExpiresAt ?? 0) - Date.now()) / 1000))}s
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Desde aquí puedes autorizar tabletas, compartir la URL o registrar rostros. Para más
            opciones, abre el panel de empresa en tu computador.
          </p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Paso 3
            </p>
            <h3 className="text-xl font-semibold text-slate-900">
              Bitácora en tiempo real
            </h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-wide text-slate-500">
            Live
          </span>
        </div>
        <div className="mt-4 max-h-72 overflow-y-auto space-y-3">
          {history.length ? (
            history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {entry.employeeName}
                  </p>
                  <p>{entry.action}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              Aún no hay marcaciones registradas hoy.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
