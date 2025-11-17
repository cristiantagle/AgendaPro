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
      className="w-full max-w-sm space-y-4 rounded-2xl bg-white/80 p-6 shadow-lg"
    >
      <div className="mb-1 flex items-center gap-3">
        <Image
          src="/tagle-labs-icon.svg"
          alt="Tagle Labs"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <p className="text-sm font-semibold text-slate-700">
          Tu sesión en Asistencia Pro
        </p>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700">
          Correo electrónico
        </label>
        <input
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="usuario@empresa.com"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700">
          Contraseña
        </label>
        <input
          name="password"
          type="password"
          required
          value={form.password}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="********"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
