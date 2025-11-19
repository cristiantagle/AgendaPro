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
  const [copied, setCopied] = useState<"url" | "pin" | null>(null);

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

  const copyValue = async (value: string, type: "url" | "pin") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setMessage("No se pudo copiar. Copia manualmente.");
    }
  };

  return (
    <section className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-100 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-300">
            Terminal
          </p>
          <h3 className="text-2xl font-semibold text-white">Control biométrico</h3>
          <p className="text-sm text-gray-400">
            Autoriza tablets e inspecciona actividad en tiempo real.
          </p>
        </div>
        <button
          type="button"
          onClick={regeneratePin}
          disabled={loadingPin}
          className="rounded-2xl border border-white/20 bg-gradient-to-r from-violet-700 to-cyan-400 px-6 py-3 text-sm font-semibold uppercase tracking-widest shadow-[0_0_18px_rgba(109,40,217,0.45)] transition hover:scale-[1.02] disabled:opacity-60"
        >
          {loadingPin ? "Generando..." : "Nuevo PIN"}
        </button>
      </div>

      <div className="space-y-4">
        <label className="block text-xs font-mono uppercase tracking-[0.35em] text-gray-400">
          URL del kiosco
          <div className="mt-2 flex gap-3">
            <input
              readOnly
              value={kioskUrl}
              className="flex-1 rounded-2xl border border-white/15 bg-black/30 px-4 py-3 font-mono text-sm text-white"
            />
            <button
              type="button"
              onClick={() => copyValue(kioskUrl, "url")}
              className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-gray-200 transition hover:border-white/40"
            >
              {copied === "url" ? "Copiado" : "Copiar"}
            </button>
          </div>
        </label>
        <label className="block text-xs font-mono uppercase tracking-[0.35em] text-gray-400">
          PIN vigente
          <div className="mt-2 flex gap-3">
            <input
              readOnly
              value={currentPin}
              className="flex-1 rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-center text-3xl font-semibold tracking-[0.6em] text-white"
            />
            <button
              type="button"
              onClick={() => copyValue(currentPin, "pin")}
              className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-gray-200 transition hover:border-white/40"
            >
              {copied === "pin" ? "Copiado" : "Copiar"}
            </button>
          </div>
        </label>
        <div className="flex flex-col rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-300 md:flex-row md:items-center md:justify-between">
          <span>Estado OK</span>
          <span className="text-[10px] text-gray-200">
            Última actualización {formatDate(items[0]?.lastUsedAt ?? null)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.4em] text-gray-400">
          Kioscos autorizados
        </h4>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">
            Aún no hay dispositivos autorizados. Registra el primero usando el PIN.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-sm text-gray-200">
              <thead>
                <tr className="bg-white/5 text-left font-mono uppercase tracking-[0.3em] text-[11px] text-gray-400">
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Registrado</th>
                  <th className="p-3">Último uso</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((device) => (
                  <tr
                    key={device.id}
                    className="border-t border-white/5 bg-black/30 transition hover:bg-white/5"
                  >
                    <td className="p-3">{device.name ?? "Terminal"}</td>
                    <td className="p-3">{formatDate(device.createdAt)}</td>
                    <td className="p-3">{formatDate(device.lastUsedAt)}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => revokeDevice(device.id)}
                        disabled={removingId === device.id}
                        className="text-xs font-semibold uppercase tracking-[0.3em] text-red-300 underline decoration-dotted disabled:opacity-40"
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
        <p className="text-sm text-emerald-400">{message}</p>
      ) : null}
    </section>
  );
}
