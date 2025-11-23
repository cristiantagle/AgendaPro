"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const [isDesktop, setIsDesktop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(navItems[0]?.href ?? null);

  const items = useMemo(
    () => navItems.filter((item) => item.roles.includes(role)),
    [role],
  );

  const effectiveOpenItem = useMemo(() => {
    if (!items.length) return null;
    if (openItem && items.some((item) => item.href === openItem)) return openItem;
    return items[0].href;
  }, [items, openItem]);

  useEffect(() => {
    const handler = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setMenuOpen(desktop);
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <div className="lg:sticky lg:top-24">
      <div className="mb-3 lg:hidden">
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:border-white/30"
        >
          <span>Menú</span>
          <span className={`transition ${menuOpen ? "rotate-180" : ""}`}>⌄</span>
        </button>
      </div>

      {(menuOpen || isDesktop) && (
        <aside className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-cyan-300">
                Menú
              </p>
              <p className="text-sm text-white/80">Navegación rápida</p>
            </div>
            {!isDesktop ? (
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-white/15 bg-white/10 px-2 py-1 text-xs text-white/70 transition hover:border-white/30"
              >
                Ocultar
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            {items.map((item) => {
              const isActive = pathname === item.href.split("#")[0];
              const expanded = effectiveOpenItem === item.href;
              return (
                <div
                  key={item.href}
                  className="rounded-2xl border border-white/10 bg-black/30 text-white/80 shadow-inner"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenItem((prev) => (prev === item.href ? null : item.href))
                    }
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[11px] font-semibold">
                        {item.icon}
                      </span>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                    <span
                      className={`text-sm transition ${
                        expanded ? "rotate-180 text-cyan-200" : "text-white/60"
                      }`}
                    >
                      ⌄
                    </span>
                  </button>
                  <div
                    className={`overflow-hidden px-3 transition-[max-height,opacity] duration-200 ${
                      expanded ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (!isDesktop) setMenuOpen(false);
                      }}
                      className={`mt-2 flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                        isActive
                          ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                          : "border-white/10 bg-white/5 text-white/80 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      <span>Ir a {item.label}</span>
                      <span className="text-xs">↘</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {!isDesktop && menuOpen ? (
        <div
          className="fixed inset-0 z-10 bg-black/50"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  );
}
