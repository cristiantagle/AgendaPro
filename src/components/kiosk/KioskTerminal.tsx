"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Role } from "@/types/database";
import { FaceRecognitionPanel } from "./FaceRecognitionPanel";

type Employee = {
  id: string;
  nombreCompleto: string;
  role: Role;
};

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

type Props = {
  companyId: string;
  slug: string;
  companyName: string;
  employees: Employee[];
  initialDeviceName: string | null;
  logoUrl?: string;
};

const actions = [
  { key: "entrada", label: "Entrada" },
  { key: "inicio_almuerzo", label: "Inicio colación" },
  { key: "fin_almuerzo", label: "Fin colación" },
  { key: "salida", label: "Salida" },
] as const;

type ActionKey = (typeof actions)[number]["key"];
type Step = "idle" | "scan" | "worker" | "admin" | "success";

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
  const [authorizing, setAuthorizing] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id ?? "");
  const [filter, setFilter] = useState("");
  const [workerStatus, setWorkerStatus] = useState<Record<string, WorkerStatus>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastMark, setLastMark] = useState<{ action: string; time: string } | null>(null);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentStep, setCurrentStep] = useState<Step>(initialDeviceName ? "scan" : "idle");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recognizedEmployee, setRecognizedEmployee] = useState<Employee | null>(null);
  const [sessionRole, setSessionRole] = useState<"none" | "worker" | "admin">("none");
  const [adminSessionExpiresAt, setAdminSessionExpiresAt] = useState<number | null>(null);
  const [biometricUnlock, setBiometricUnlock] = useState<{ employeeId: string; expiresAt: number } | null>(null);
  const [liveTime, setLiveTime] = useState(new Date());

  const BIOMETRIC_UNLOCK_MS = 45 * 1000;
  const ADMIN_SESSION_MS = 3 * 60 * 1000;

  useEffect(() => {
    const interval = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        employee.nombreCompleto.toLowerCase().includes(filter.toLowerCase()),
      ),
    [employees, filter],
  );

  const formatTime = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
      : "--:--";

  const formatDuration = useCallback(
    (employeeId: string) => {
      const status = workerStatus[employeeId];
      if (!status) return "0h 00m";
      const base = status.workedMs;
      const runningExtra = status.runningSince
        ? Date.now() - new Date(status.runningSince).getTime()
        : 0;
      const totalMinutes = Math.max(0, Math.floor((base + runningExtra) / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
    },
    [workerStatus],
  );

  const selectedWorkedLabel = useMemo(
    () => formatDuration(selectedEmployee),
    [formatDuration, selectedEmployee],
  );

  const selectedStatus = workerStatus[selectedEmployee || ""] ?? null;

  const beginScan = useCallback(() => {
    setStatusMessage(null);
    setSuccessMessage(null);
    setRecognizedEmployee(null);
    setSessionRole("none");
    setBiometricUnlock(null);
    setCurrentStep("scan");
  }, []);

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
        // ignore errors
      }
    },
    [deviceToken, mapWorkers, slug, storageKey],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    refreshWorkerStatus(stored).catch(() => {});
  }, [refreshWorkerStatus, storageKey]);

  useEffect(() => {
    if (authorizedName && currentStep === "idle") {
      beginScan();
    }
    if (!authorizedName) {
      setCurrentStep("idle");
    }
  }, [authorizedName, currentStep, beginScan]);

  useEffect(() => {
    if (!deviceToken) return undefined;
    const client = getSupabaseBrowserClient();
    const channel = client
      .channel(`time-records:${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "TimeRecord", filter: `companyId=eq.${companyId}` },
        () => {
          void refreshWorkerStatus();
        },
      )
      .subscribe();
    return () => {
      void channel.unsubscribe();
    };
  }, [companyId, deviceToken, refreshWorkerStatus]);

  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
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
    if (!biometricUnlock) return;
    const remaining = biometricUnlock.expiresAt - Date.now();
    if (remaining <= 0) {
      setBiometricUnlock(null);
      setSessionRole("none");
      setRecognizedEmployee(null);
      return;
    }
    const timeout = setTimeout(() => {
      setBiometricUnlock(null);
      setSessionRole("none");
      setRecognizedEmployee(null);
    }, remaining);
    return () => clearTimeout(timeout);
  }, [biometricUnlock]);

  useEffect(() => {
    if (!adminSessionExpiresAt) return;
    const remaining = adminSessionExpiresAt - Date.now();
    if (remaining <= 0) {
      setAdminSessionExpiresAt(null);
      setSessionRole("none");
      setRecognizedEmployee(null);
      setCurrentStep("idle");
      return;
    }
    const timeout = setTimeout(() => {
      setAdminSessionExpiresAt(null);
      setSessionRole("none");
      setRecognizedEmployee(null);
      setCurrentStep("idle");
    }, remaining);
    return () => clearTimeout(timeout);
  }, [adminSessionExpiresAt]);

  const resetSession = () => {
    setSessionRole("none");
    setRecognizedEmployee(null);
    setBiometricUnlock(null);
    setAdminSessionExpiresAt(null);
    setCurrentStep("idle");
  };

  const authorizeDevice = async () => {
    if (!pin.trim()) {
      setAuthMessage("Ingresa el PIN entregado por el administrador.");
      return;
    }
    setAuthorizing(true);
    setAuthMessage(null);
    try {
      const res = await fetch(`/api/company/kiosk/pin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, deviceName: deviceLabel || undefined }),
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
    if (loadingAction) return;
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
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (deviceToken) {
        headers.Authorization = `Bearer ${deviceToken}`;
      }
      const res = await fetch(`/api/kiosk/${slug}/mark`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ employeeId: selectedEmployee, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          setAuthorizedName(null);
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
        ? new Date(timeValue).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
      setLastMark({
        action: actions.find((item) => item.key === action)?.label ?? "Acción",
        time: formattedTime,
      });
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      lockTimeoutRef.current = setTimeout(() => setLoadingAction(null), 4000);
      const isoTime = timeValue ?? new Date().toISOString();
      updateWorkerTracking(selectedEmployee, action, isoTime);
      setHistory((prev) => {
        const entry: HistoryEntry = {
          id: data.record.id as string,
          employeeName:
            employees.find((emp) => emp.id === selectedEmployee)?.nombreCompleto ?? "Trabajador",
          action: actions.find((item) => item.key === action)?.label ?? "Marcación",
          timestamp: isoTime,
        };
        return [entry, ...prev].slice(0, 12);
      });
      setStatusMessage("Marcación registrada con éxito.");
      setBiometricUnlock(null);
      setSuccessMessage(actions.find((item) => item.key === action)?.label ?? "Marcación");
      setCurrentStep("success");
      setTimeout(() => {
        setSuccessMessage(null);
        resetSession();
      }, 2500);
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
      setCurrentStep("admin");
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
      setCurrentStep("worker");
    }
  };

  const renderAuthorizeCard = () => (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
      <p className="text-xs font-mono uppercase tracking-[0.35em] text-cyan-300">
        Paso 0 · Seguridad
      </p>
      <h2 className="text-2xl font-semibold">Autoriza esta terminal con tu PIN</h2>
      <p className="text-sm text-white/70">
        Sólo los dispositivos permitidos pueden capturar rostros o registrar marcaciones.
      </p>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="PIN de 6 dígitos"
          className="w-full rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-center text-2xl tracking-[0.4em] text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
        />
        <input
          value={deviceLabel}
          onChange={(event) => setDeviceLabel(event.target.value)}
          placeholder="Nombre de la tablet (opcional)"
          className="w-full rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={authorizeDevice}
          disabled={authorizing}
          className="rounded-2xl bg-gradient-to-r from-violet-700 to-cyan-400 px-6 py-3 text-lg font-semibold text-white shadow-[0_0_25px_rgba(109,40,217,0.45)] transition hover:scale-[1.01] disabled:opacity-50"
        >
          {authorizing ? "Autorizando..." : "Autorizar"}
        </button>
      </div>
      {authMessage ? (
        <p className="mt-3 text-sm text-cyan-300">{authMessage}</p>
      ) : null}
    </section>
  );

  const renderScanCard = () => (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white backdrop-blur-2xl shadow-[0_20px_90px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.4em] text-cyan-300">
            Paso 1 · Escaneo
          </p>
          <h3 className="text-2xl font-semibold">Posiciona tu rostro</h3>
        </div>
        <button
          type="button"
          onClick={resetSession}
          className="text-sm text-white/70 underline decoration-dotted"
        >
          Cancelar
        </button>
      </div>
      <div className="mt-4">
        <FaceRecognitionPanel
          slug={slug}
          employees={employees}
          selectedEmployeeId={selectedEmployee}
          deviceToken={deviceToken}
          authorized={Boolean(authorizedName)}
          allowEnrollment={false}
          autoDetect
          onEmployeeDetected={(employeeId, confidence) => {
            setSelectedEmployee(employeeId);
            handleRecognition(employeeId, confidence);
          }}
          onStatus={(message) => setStatusMessage(message)}
        />
      </div>
    </section>
  );

  const renderWorkerCard = () => (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur-2xl shadow-[0_20px_90px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.4em] text-cyan-300">
            Paso 2 · Marcación
          </p>
          <h3 className="text-2xl font-semibold">
            Hola, {recognizedEmployee?.nombreCompleto ?? "trabajador"}
          </h3>
        </div>
        <button
          type="button"
          onClick={beginScan}
          className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/60"
        >
          Cambiar persona
        </button>
      </div>
      <p className="mt-2 text-xs font-semibold text-white/60">
        Biometría activa: {biometricRemainingSeconds}s
      </p>
      {workerActive ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {actions.map((action) => {
            const markTime = selectedStatus?.marks?.[action.key] ?? null;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => markAction(action.key)}
                disabled={loadingAction === action.key}
                className={`group rounded-2xl border px-4 py-4 text-left transition ${
                  markTime
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                    : "border-white/10 bg-white/5 hover:border-cyan-300 hover:bg-white/10"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {action.label}
                </p>
                <p className="text-2xl font-semibold text-white">
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
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/40 px-4 py-6 text-center text-sm text-white/60">
          Vuelve a posicionar tu rostro para desbloquear las acciones.
        </div>
      )}
    </section>
  );

  const renderAdminPanel = () => (
    <section className="rounded-3xl border border-white/10 bg-[#0b0f1a] p-6 text-white backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-emerald-300">
            Modo administrador activo
          </p>
          <h3 className="text-2xl font-semibold">
            {recognizedEmployee?.nombreCompleto ?? "Admin"}
          </h3>
          <p className="text-sm text-white/70">
            Gestiona la terminal, comparte la URL y registra nuevos rostros.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold text-white/60">
            Tiempo restante:{" "}
            {Math.max(0, Math.floor(((adminSessionExpiresAt ?? 0) - Date.now()) / 1000))}s
          </p>
          <button
            type="button"
            onClick={resetSession}
            className="rounded-full border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-200"
          >
            Salir
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div>
            <p className="text-xs uppercase text-white/50">URL kiosco</p>
            <p className="break-all text-sm font-semibold text-white">{kioskUrl}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-white/50">Selecciona trabajador</p>
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Buscar..."
              className="mb-3 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-300 focus:outline-none"
            />
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => setSelectedEmployee(employee.id)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                    selectedEmployee === employee.id
                      ? "border-cyan-400 bg-white/10 text-white shadow-[0_0_20px_rgba(14,165,233,0.25)]"
                      : "border-white/5 bg-white/5 text-white/70 hover:border-cyan-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{employee.nombreCompleto}</span>
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        employee.role === "company_admin"
                          ? "border border-amber-300/60 bg-amber-300/15 text-amber-100"
                          : "border border-white/15 bg-white/5 text-white/70"
                      }`}
                    >
                      {employee.role === "company_admin" ? "Admin" : "Trab."}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <FaceRecognitionPanel
          slug={slug}
          employees={employees}
          selectedEmployeeId={selectedEmployee}
          deviceToken={deviceToken}
          authorized={Boolean(authorizedName)}
          allowEnrollment
          onEmployeeDetected={(employeeId, confidence) => {
            setSelectedEmployee(employeeId);
            handleRecognition(employeeId, confidence);
          }}
          onStatus={(message) => setStatusMessage(message)}
        />
      </div>
    </section>
  );

  const renderSuccessCard = () => (
    <section className="rounded-3xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 p-6 text-center text-white shadow-[0_20px_80px_rgba(16,185,129,0.35)]">
      <p className="text-xs font-mono uppercase tracking-[0.4em] text-emerald-200">
        Registro exitoso
      </p>
      <h3 className="text-3xl font-semibold">{successMessage}</h3>
      <p className="text-sm text-white/70">Tu marcación fue guardada y sincronizada.</p>
    </section>
  );

  const renderBitacora = () => (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur-2xl shadow-[0_20px_90px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-cyan-300">
            Bitácora en tiempo real
          </p>
          <h3 className="text-xl font-semibold">Últimas marcaciones</h3>
        </div>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/70">
          LIVE
        </span>
      </div>
      <div className="mt-4 max-h-72 overflow-y-auto space-y-3">
        {history.length ? (
          history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80"
            >
              <div>
                <p className="font-semibold text-white">{entry.employeeName}</p>
                <p>{entry.action}</p>
              </div>
              <span className="text-xs text-white/50">{formatTime(entry.timestamp)}</span>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-white/60">
            Aún no hay marcaciones registradas hoy.
          </p>
        )}
      </div>
    </section>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 text-white">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
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
                className="h-20 w-20 rounded-2xl border border-white/30 bg-white/10 object-contain p-3"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/5 text-3xl font-light uppercase">
                {companyName.slice(0, 2)}
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-[0.4em] text-white/70">
                Terminal biométrica
              </span>
              <h1 className="text-3xl font-semibold leading-tight">{companyName}</h1>
              <p className="text-sm text-white/80">
                Reconocimiento facial para ingreso seguro y panel rápido para administradores.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/60">Estado</p>
              <p className="text-base font-semibold">
                {authorizedName ? `Autorizado • ${authorizedName}` : "No autorizado"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/60">Hora actual</p>
              <p className="text-base font-semibold">
                {liveTime.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/60">Horas trabajadas hoy</p>
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
            {lastMark ? (
              <div className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase text-white/60">Marcación reciente</p>
                <p className="text-base font-semibold">
                  {lastMark.action} · {lastMark.time}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {!authorizedName ? renderAuthorizeCard() : null}

      {statusMessage ? (
        <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {statusMessage}
        </div>
      ) : null}

      {authorizedName && currentStep === "scan" ? renderScanCard() : null}
      {currentStep === "worker" ? renderWorkerCard() : null}
      {currentStep === "admin" && adminSessionActive ? renderAdminPanel() : null}
      {currentStep === "success" ? renderSuccessCard() : null}

      {renderBitacora()}
    </div>
  );
}
