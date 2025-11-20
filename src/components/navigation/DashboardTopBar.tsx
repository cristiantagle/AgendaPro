"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "superadmin" | "company_admin" | "worker";

type Appearance = "light" | "dark";

const roleLabels: Record<Role, string> = {
  superadmin: "Superadministrador",
  company_admin: "Administrador de empresa",
  worker: "Trabajador",
};

const navItems: Array<{
  href: string;
  label: string;
  allowedRoles: Role[];
}> = [
  { href: "/superadmin", label: "Panel superadmin", allowedRoles: ["superadmin"] },
  { href: "/empresa", label: "Panel empresa", allowedRoles: ["company_admin"] },
  { href: "/trabajador", label: "Vista trabajador", allowedRoles: ["worker"] },
];

type Props = {
  role: Role;
  appearance?: Appearance;
};

export function DashboardTopBar({ role, appearance = "light" }: Props) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerClasses =
    appearance === "dark"
      ? "bg-white/10 text-white border border-white/20"
      : "bg-white text-slate-800 border border-slate-200";

  const buttonClasses =
    appearance === "dark"
      ? "bg-white/10 text-white hover:bg-white/20"
      : "bg-slate-900 text-white hover:bg-slate-800";

  const linkBaseClasses =
    appearance === "dark"
      ? "rounded-full border border-white/20 px-3 py-1 text-sm text-white/90 transition hover:border-white hover:text-white"
      : "rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-900";

  const disabledClasses =
    appearance === "dark"
      ? "cursor-not-allowed border-white/10 text-white/50"
      : "cursor-not-allowed border-slate-100 text-slate-400";

  const accentLinkClasses =
    appearance === "dark"
      ? "font-semibold text-emerald-300 underline-offset-2 hover:underline"
      : "font-semibold text-emerald-600 underline-offset-2 hover:underline";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        throw new Error("No se pudo cerrar la sesión. Intenta nuevamente.");
      }
      router.replace("/login");
    } catch (err) {
      setError((err as Error).message);
      setIsLoggingOut(false);
    }
  };

  return (
    <nav
      className={`flex flex-col gap-3 rounded-2xl px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between ${containerClasses}`}
    >
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <Image
            src="/tagle-labs-icon.svg"
            alt="Tagle Labs"
            width={40}
            height={40}
            className="rounded-xl"
            priority
          />
        </div>
        <div>
          <p className="text-sm font-semibold">Asistencia Pro · Tagle Labs</p>
          <p className="text-xs opacity-80">
            Sesión: {roleLabels[role]}
          </p>
          <p className="mt-1 text-xs opacity-80">
            Contacto{" "}
                <a
                  href="https://wa.me/56956804513"
                  target="_blank"
                  rel="noreferrer"
                  className={accentLinkClasses}
                >
                  +56 9 5680 4513 (WhatsApp)
                </a>{" "}
                ·{" "}
                <a
                  href="mailto:cristian.gonzalez.gt@gmail.com"
                  className={accentLinkClasses}
                >
                  cristian.gonzalez.gt@gmail.com
                </a>
              </p>
            </div>
        {error ? (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {navItems.map((item) => {
          const enabled = item.allowedRoles.includes(role);
          return (
            <Link
              key={item.href}
              href={enabled ? item.href : "#"}
              aria-disabled={!enabled}
              className={`${linkBaseClasses} ${enabled ? "" : disabledClasses}`}
              onClick={(event) => {
                if (!enabled) {
                  event.preventDefault();
                }
              }}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`rounded-full px-4 py-1 text-sm font-semibold transition ${buttonClasses} ${
            isLoggingOut ? "opacity-70" : ""
          }`}
        >
          {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
        </button>
      </div>
    </nav>
  );
}
