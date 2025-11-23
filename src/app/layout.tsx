import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { PerformancePatch } from "@/components/system/PerformancePatch";
import { ThemeProvider } from "@/components/system/ThemeProvider";
import { ThemeSwitcher } from "@/components/system/ThemeSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Asistencia Pro · Tagle Labs",
  description:
    "Gestión multiempresa de asistencia, horas extra y pago de sueldos creada por Cristian Tagle.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#2563eb",
};

function TagleBrandBar() {
  return (
    <div className="border-b border-slate-800/60 bg-slate-950/95 px-4 py-2 text-sm text-slate-100 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Image
            src="/tagle-labs-icon.svg"
            alt="Tagle Labs"
            width={28}
            height={28}
            className="rounded-lg"
            priority
          />
          <div>
            <p className="font-semibold leading-tight">Tagle Labs</p>
            <p className="text-xs text-slate-300">
              Software por Cristian Tagle
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span>
            <strong>WhatsApp:</strong>{" "}
            <Link
              href="https://wa.me/56956804513"
              target="_blank"
              className="font-semibold text-emerald-300 underline-offset-2 hover:underline"
            >
              +56 9 5680 4513
            </Link>
          </span>
          <span>
            <strong>Correo:</strong>{" "}
            <Link
              href="mailto:cristian.gonzalez.gt@gmail.com"
              className="font-semibold text-emerald-300 underline-offset-2 hover:underline"
            >
              cristian.gonzalez.gt@gmail.com
            </Link>
          </span>
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <TagleBrandBar />
          <ServiceWorkerRegister />
          <PerformancePatch />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
