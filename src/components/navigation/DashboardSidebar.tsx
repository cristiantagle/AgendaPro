"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Role = "superadmin" | "company_admin" | "worker";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
};

const navItems: NavItem[] = [
  { href: "/empresa", label: "Overview", icon: "OV", roles: ["company_admin"] },
  { href: "/empresa#pagos-detalle", label: "Pagos", icon: "$", roles: ["company_admin"] },
  { href: "/empresa#reportes", label: "Reportes", icon: "RP", roles: ["company_admin"] },
  { href: "/empresa#kiosco", label: "Kiosco", icon: "K", roles: ["company_admin"] },
  { href: "/empresa#trabajadores-tabla", label: "Trabajadores", icon: "T", roles: ["company_admin"] },
  { href: "/empresa#horarios", label: "Horarios", icon: "H", roles: ["company_admin"] },
];

type Props = {
  role: Role;
};

export function DashboardSidebar({ role }: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handler = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setIsOpen(desktop);
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const items = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menú"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="lg:hidden fixed left-4 top-[88px] z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur transition hover:border-white/40"
      >
        <span
          className={`relative block h-[2px] w-6 rounded-full bg-white transition-all duration-200 ${
            isOpen ? "translate-y-[6px] rotate-45" : ""
          }`}
        />
        <span
          className={`absolute block h-[2px] w-6 rounded-full bg-white transition-all duration-200 ${
            isOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`relative block h-[2px] w-6 rounded-full bg-white transition-all duration-200 ${
            isOpen ? "-translate-y-[6px] -rotate-45" : ""
          }`}
        />
      </button>

      <aside
        className={`${
          isOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-96 opacity-0 lg:opacity-100 lg:translate-x-0"
        } fixed lg:static z-20 h-[calc(100vh-120px)] lg:h-auto w-64 shrink-0 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)] transition duration-300`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-cyan-300">Menú</p>
            <p className="text-sm text-white/80">Navegación rápida</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsOpen(false)}
            className="lg:hidden rounded-xl border border-white/15 bg-white/10 px-2 py-1 text-xs text-white/70 transition hover:border-white/30"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {items.map((item) => {
            const isActive = pathname === item.href.split("#")[0];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (!isDesktop) setIsOpen(false);
                }}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
                  isActive
                    ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 bg-black/30 text-white/80 hover:border-white/30 hover:text-white"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      {!isDesktop && isOpen ? (
        <div
          className="fixed inset-0 z-10 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
