"use client";

import { useMemo, useState } from "react";

type EmployeeOption = {
  id: string;
  nombre: string;
};

type Payment = {
  id: string;
  employeeId: string;
  employeeNombre: string;
  employeeEmail?: string | null;
  amount: number;
  type: "adelanto" | "quincena" | "pago";
  note?: string | null;
  paidAt: string;
};

type Props = {
  employees: EmployeeOption[];
  initialPayments: Payment[];
};

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const typeLabel: Record<Payment["type"], string> = {
  adelanto: "Adelanto",
  quincena: "Quincena",
  pago: "Pago",
};

export function PaymentsPanel({ employees, initialPayments }: Props) {
  const [payments, setPayments] = useState(initialPayments);
  const [form, setForm] = useState({
    employeeId: employees[0]?.id ?? "",
    amount: "",
    type: "adelanto" as Payment["type"],
    note: "",
    paidAt: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.id === form.employeeId),
    [employees, form.employeeId],
  );

  const submit = async () => {
    if (!form.employeeId || !form.amount) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          amount: Number(form.amount),
          type: form.type,
          note: form.note || null,
          paidAt: form.paidAt,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo registrar el pago");
      }
      const data = await res.json();
      const payment: Payment = {
        ...data.payment,
        paidAt: data.payment.paidAt ?? new Date().toISOString(),
      };
      setPayments((prev) => [payment, ...prev].slice(0, 50));
      setMessage("Pago guardado.");
      setForm((prev) => ({
        ...prev,
        amount: "",
        note: "",
        type: "adelanto",
      }));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-100 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-300">
            Pagos y adelantos
          </p>
          <h2 className="text-2xl font-semibold">Control de pagos</h2>
          <p className="text-sm text-gray-300">
            Registra adelantos, quincenas o pagos fuera de fecha.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[380px,1fr]">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
          <label className="text-sm font-semibold text-white/90">
            Trabajador
            <select
              value={form.employeeId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, employeeId: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-white/90">
              Monto (CLP)
              <input
                type="number"
                min={1}
                step={1000}
                value={form.amount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
              />
            </label>
            <label className="text-sm font-semibold text-white/90">
              Fecha de pago
              <input
                type="date"
                value={form.paidAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, paidAt: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
              />
            </label>
          </div>
          <label className="text-sm font-semibold text-white/90">
            Tipo
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["adelanto", "quincena", "pago"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type }))}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${
                    form.type === type
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {typeLabel[type]}
                </button>
              ))}
            </div>
          </label>
          <label className="text-sm font-semibold text-white/90">
            Nota (opcional)
            <textarea
              value={form.note}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, note: event.target.value }))
              }
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
              placeholder="Motivo del adelanto, medio de pago, etc."
            />
          </label>
          {message ? (
            <p className="text-sm text-emerald-300">{message}</p>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={saving || !form.employeeId || !form.amount}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Registrar pago"}
          </button>
          {selectedEmployee ? (
            <p className="text-xs text-gray-400">
              Se guardará para {selectedEmployee.nombre} en tu empresa.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-300">
              Últimos movimientos
            </h3>
            <span className="text-xs text-gray-400">{payments.length} regs.</span>
          </div>
          <div className="space-y-3">
            <div className="hidden md:block overflow-hidden rounded-2xl border border-white/10">
              <table className="min-w-full text-sm text-gray-100">
                <thead>
                  <tr className="bg-white/5 text-left font-mono text-[11px] uppercase tracking-[0.3em] text-gray-400">
                    <th className="p-3">Trabajador</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Monto</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-t border-white/5 bg-black/30 transition hover:bg-white/5"
                    >
                      <td className="p-3">
                        <p className="font-semibold">{payment.employeeNombre}</p>
                        {payment.employeeEmail ? (
                          <p className="text-xs text-gray-400">{payment.employeeEmail}</p>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
                          {typeLabel[payment.type]}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-emerald-200">
                        {currency.format(payment.amount)}
                      </td>
                      <td className="p-3 text-sm text-gray-300">
                        {new Date(payment.paidAt).toLocaleDateString("es-CL")}
                      </td>
                      <td className="p-3 text-sm text-gray-300">
                        {payment.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 md:hidden">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-gray-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{payment.employeeNombre}</p>
                      {payment.employeeEmail ? (
                        <p className="text-xs text-gray-400">
                          {payment.employeeEmail}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.3em]">
                      {typeLabel[payment.type]}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-emerald-200">
                    {currency.format(payment.amount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(payment.paidAt).toLocaleDateString("es-CL")}
                  </p>
                  {payment.note ? (
                    <p className="mt-1 text-xs text-gray-200">{payment.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
