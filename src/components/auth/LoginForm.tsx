"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const initialState = {
  email: "",
  password: "",
};

export function LoginForm() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const raw = await response.text();
        let message = "Error al iniciar sesión";
        if (raw) {
          try {
            const data = JSON.parse(raw);
            message = data.error ?? raw;
          } catch {
            message = raw;
          }
        }
        throw new Error(message);
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
    >
      <div className="mb-1 flex items-center gap-3">
        <Image
          src="/tagle-labs-icon.svg"
          alt="Tagle Labs"
          width={32}
          height={32}
          className="rounded-lg border border-white/15 bg-white/5 p-1"
        />
        <p className="text-sm font-semibold text-white">
          Tu sesión en Asistencia Pro
        </p>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-200">
          Correo electrónico
        </label>
        <input
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
          placeholder="usuario@empresa.com"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-200">
          Contraseña
        </label>
        <input
          name="password"
          type="password"
          required
          value={form.password}
          onChange={handleChange}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-cyan-300 focus:outline-none"
          placeholder="********"
        />
      </div>
      {error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:shadow-[0_0_25px_rgba(16,185,129,0.45)] disabled:opacity-60"
      >
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
