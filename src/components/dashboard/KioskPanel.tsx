"use client";

import { useMemo, useState } from "react";

type Device = {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type Props = {
  slug: string;
  pin: string;
  devices: Device[];
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "medium",
});

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
};

export function KioskPanel({ slug, pin, devices }: Props) {
  const [currentPin, setCurrentPin] = useState(pin);
  const [items, setItems] = useState(devices);
  const [loadingPin, setLoadingPin] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const kioskUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/terminal/${slug}`;
    }
    return `${window.location.origin}/terminal/${slug}`;
  }, [slug]);

  const regeneratePin = async () => {
    setLoadingPin(true);
    setMessage(null);
    try {
      const res = await fetch("/api/company/kiosk/pin", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No se pudo generar un nuevo PIN");
      }
      const data = await res.json();
      setCurrentPin(data.pin);
      setMessage("PIN actualizado");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoadingPin(false);
    }
  };

  const revokeDevice = async (deviceId: string) => {
    setRemovingId(deviceId);
    setMessage(null);
    try {
      const res = await fetch(`/api/company/kiosk/devices/${deviceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No se pudo revocar el kiosco");
      }
      setItems((prev) => prev.filter((device) => device.id !== deviceId));
      setMessage("Kiosco revocado.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">
            Terminal de marcaciones
          </h3>
          <p className="text-sm text-slate-500">
            Comparte esta URL con la tablet y usa el PIN para autorizarla una sola vez.
          </p>
        </div>
        <button
          type="button"
          onClick={regeneratePin}
          disabled={loadingPin}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loadingPin ? "Generando..." : "Nuevo PIN"}
        </button>
      </div>

      <label className="text-sm font-medium text-slate-600">
        URL del kiosco
        <input
          readOnly
          value={kioskUrl}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm"
        />
      </label>

      <label className="text-sm font-medium text-slate-600">
        PIN vigente
        <div className="mt-1 flex items-center gap-2">
          <input
            readOnly
            value={currentPin}
            className="w-32 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-center text-xl font-semibold tracking-widest"
          />
        </div>
      </label>

      <div>
        <h4 className="font-semibold text-slate-700">Kioscos autorizados</h4>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay dispositivos autorizados. Usa el PIN en la tablet para registrar el primero.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-2 min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Registrado</th>
                  <th className="p-2">Último uso</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((device) => (
                  <tr key={device.id} className="border-t border-slate-100">
                    <td className="p-2">{device.name ?? "Terminal"}</td>
                    <td className="p-2">{formatDate(device.createdAt)}</td>
                    <td className="p-2">{formatDate(device.lastUsedAt)}</td>
                    <td className="p-2 text-right">
                      <button
                        type="button"
                        onClick={() => revokeDevice(device.id)}
                        disabled={removingId === device.id}
                        className="text-sm text-red-600 underline"
                      >
                        Revocar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {message ? (
        <p className="text-sm text-emerald-600">{message}</p>
      ) : null}
    </section>
  );
}
