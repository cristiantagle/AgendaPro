"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Employee = {
  id: string;
  nombreCompleto: string;
};

type Props = {
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

export function KioskTerminal({
  slug,
  companyName,
  employees,
  initialDeviceName,
  logoUrl,
}: Props) {
  const [authorizedName, setAuthorizedName] = useState(initialDeviceName);
  const [pin, setPin] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id ?? "");
  const [filter, setFilter] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        employee.nombreCompleto.toLowerCase().includes(filter.toLowerCase()),
      ),
    [employees, filter],
  );

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
      setAuthMessage("Dispositivo autorizado correctamente.");
    } catch (error) {
      setAuthMessage((error as Error).message);
    } finally {
      setAuthorizing(false);
    }
  };

  const markAction = async (action: (typeof actions)[number]["key"]) => {
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
      const res = await fetch(`/api/kiosk/${slug}/mark`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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
        }
        throw new Error(data.error ?? "No se pudo registrar la marcación");
      }
      setStatusMessage("Marcación registrada con éxito.");
    } catch (error) {
      setStatusMessage((error as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

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
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => setSelectedEmployee(employee.id)}
              className={`rounded-2xl border px-4 py-4 text-left text-lg font-semibold transition ${
                selectedEmployee === employee.id
                  ? "border-emerald-500 bg-white shadow"
                  : "border-slate-200 bg-white hover:border-emerald-200"
              }`}
            >
              {employee.nombreCompleto}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => markAction(action.key)}
              disabled={
                !authorizedName ||
                !selectedEmployee ||
                loadingAction === action.key
              }
              className="rounded-xl bg-emerald-600 px-4 py-5 text-lg font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {loadingAction === action.key ? "Enviando..." : action.label}
            </button>
          ))}
        </div>
        {statusMessage ? (
          <p className="text-sm text-emerald-600">{statusMessage}</p>
        ) : null}
      </section>
    </div>
  );
}
