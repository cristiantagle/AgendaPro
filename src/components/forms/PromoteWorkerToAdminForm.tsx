"use client";

import { useMemo, useState } from "react";

type WorkerOption = {
  id: string;
  nombreCompleto: string;
  email: string;
};

type CompanyOption = {
  id: string;
  name: string;
  workers: WorkerOption[];
};

type Props = {
  companies: CompanyOption[];
};

export function PromoteWorkerToAdminForm({ companies }: Props) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    companies[0]?.id ?? "",
  );
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const workersForCompany = useMemo(() => {
    const company = companies.find((item) => item.id === selectedCompanyId);
    return company?.workers ?? [];
  }, [companies, selectedCompanyId]);

  const handleCompanyChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newCompanyId = event.target.value;
    setSelectedCompanyId(newCompanyId);
    const newCompany = companies.find((item) => item.id === newCompanyId);
    setSelectedWorkerId(newCompany?.workers[0]?.id ?? "");
    setError(null);
    setSuccess(null);
  };

  const handleWorkerChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedWorkerId(event.target.value);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedWorkerId) {
      setError("Selecciona un trabajador para promover.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/company-admins/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedWorkerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "No se pudo promover al trabajador");
      }

      setSuccess("Trabajador promovido a administrador correctamente.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
    >
      <h3 className="text-lg font-semibold text-white">
        Promover trabajador a administrador
      </h3>
      <p className="text-sm text-slate-200/80">
        Selecciona la empresa y el trabajador que será promovido. Mantendrá sus
        credenciales actuales.
      </p>

      <label className="text-sm font-medium text-slate-100">
        Empresa
        <select
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
          value={selectedCompanyId}
          onChange={handleCompanyChange}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-100">
        Trabajador
        <select
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
          value={selectedWorkerId}
          onChange={handleWorkerChange}
          disabled={workersForCompany.length === 0}
        >
          {workersForCompany.length === 0 ? (
            <option value="">No hay trabajadores disponibles</option>
          ) : (
            workersForCompany.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.nombreCompleto} — {worker.email}
              </option>
            ))
          )}
          </select>
      </label>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {success ? (
        <p className="text-sm text-emerald-300">{success}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading || workersForCompany.length === 0}
        className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] disabled:opacity-60"
      >
        {loading ? "Promoviendo..." : "Promover a administrador"}
      </button>
    </form>
  );
}
