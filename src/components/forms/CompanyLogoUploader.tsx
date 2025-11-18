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
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800">
        Identidad visual
      </h3>
      <p className="text-sm text-slate-500">
        Sube el logo de la empresa para que aparezca en los dashboards y en el
        kiosco. Formatos admitidos: PNG, JPG o WEBP. Máximo 2 MB.
      </p>
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Logo actual"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              Sin logo
            </div>
          )}
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Selecciona archivo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>
      {message ? (
        <p className="text-sm text-emerald-600">{message}</p>
      ) : null}
    </section>
  );
}
