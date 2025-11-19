"use client";

import { useState } from "react";

type Props = {
  initialLogo?: string | null;
};

export function CompanyLogoUploader({ initialLogo }: Props) {
  const [preview, setPreview] = useState(
    initialLogo ? `${initialLogo}?v=${Date.now()}` : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/company/logo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No se pudo subir el logo");
      }
      const data = await res.json();
      setPreview(`${data.logoUrl}?v=${Date.now()}`);
      setMessage("Logo actualizado correctamente.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-100 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-300">
          Identidad visual
        </p>
        <h3 className="text-2xl font-semibold text-white">Logo corporativo</h3>
        <p className="text-sm text-gray-400">
          Muestra tu marca en kioscos y dashboards. PNG/JPG/WEBP hasta 2 MB.
        </p>
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="relative h-28 w-28 rounded-3xl border border-white/15 bg-white/5 p-4 text-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Logo actual"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs uppercase text-gray-500">
              Sin logo
            </div>
          )}
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-gray-200 backdrop-blur">
            Live
          </span>
        </div>
        <label className="flex-1 text-sm text-gray-200">
          <span className="font-mono uppercase tracking-[0.3em] text-xs text-cyan-300">
            Subir archivo
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-gray-100 transition focus:border-cyan-400 focus:outline-none"
          />
        </label>
      </div>
      {message ? (
        <p className="text-sm text-emerald-400">{message}</p>
      ) : null}
    </section>
  );
}
