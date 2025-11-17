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
      className="space-y-3 rounded-xl border border-slate-200 bg-white/70 p-4"
    >
      <h3 className="text-lg font-semibold text-slate-800">
        Promover trabajador a administrador
      </h3>
      <p className="text-sm text-slate-500">
        Selecciona la empresa y el trabajador que será promovido. Mantendrá sus
        credenciales actuales.
      </p>

      <label className="text-sm font-medium text-slate-600">
        Empresa
        <select
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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

      <label className="text-sm font-medium text-slate-600">
        Trabajador
        <select
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? (
        <p className="text-sm text-emerald-600">{success}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading || workersForCompany.length === 0}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Promoviendo..." : "Promover a administrador"}
      </button>
    </form>
  );
}
