"use client";

import { useState, useEffect } from "react";
import { Fuel, Truck, Plus, Loader2, DollarSign } from "lucide-react";

type FuelType = "bencina_93" | "bencina_95" | "bencina_97" | "diesel" | "electrico" | "otro";

type Vehicle = {
    id: string;
    patente: string;
    marca: string | null;
    modelo: string | null;
    anio: number | null;
    tipoCombustible: FuelType;
    isActive: boolean;
};

type FuelRecordWithDetails = {
    id: string;
    vehicleId: string;
    fecha: string;
    litros: number;
    kilometraje: number | null;
    tipoCombustible: FuelType;
    costoTotal: number | null;
    precioLitro: number | null;
    estacion: string | null;
    observaciones: string | null;
    patente: string;
    employeeName: string | null;
};

const fuelTypeLabels: Record<FuelType, string> = {
    bencina_93: "Bencina 93",
    bencina_95: "Bencina 95",
    bencina_97: "Bencina 97",
    diesel: "Diesel",
    electrico: "Eléctrico",
    otro: "Otro",
};

export function FuelPanel() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [records, setRecords] = useState<FuelRecordWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [showVehicleForm, setShowVehicleForm] = useState(false);
    const [showRecordForm, setShowRecordForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Vehicle form state
    const [patente, setPatente] = useState("");
    const [marca, setMarca] = useState("");
    const [modelo, setModelo] = useState("");
    const [anio, setAnio] = useState("");
    const [vehicleFuelType, setVehicleFuelType] = useState<FuelType>("bencina_95");

    // Record form state
    const [selectedVehicle, setSelectedVehicle] = useState("");
    const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
    const [litros, setLitros] = useState("");
    const [kilometraje, setKilometraje] = useState("");
    const [recordFuelType, setRecordFuelType] = useState<FuelType>("bencina_95");
    const [costoTotal, setCostoTotal] = useState("");
    const [estacion, setEstacion] = useState("");
    const [observaciones, setObservaciones] = useState("");

    const fetchData = async () => {
        try {
            const [vehiclesRes, recordsRes] = await Promise.all([
                fetch("/api/vehicles"),
                fetch("/api/fuel-records"),
            ]);
            const vehiclesData = await vehiclesRes.json();
            const recordsData = await recordsRes.json();
            setVehicles(vehiclesData.vehicles || []);
            setRecords(recordsData.records || []);
        } catch {
            setError("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await fetch("/api/vehicles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patente,
                    marca: marca || undefined,
                    modelo: modelo || undefined,
                    anio: anio ? parseInt(anio) : undefined,
                    tipoCombustible: vehicleFuelType,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess("Vehículo creado exitosamente");
            setShowVehicleForm(false);
            setPatente("");
            setMarca("");
            setModelo("");
            setAnio("");
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al crear vehículo");
        }
    };

    const handleCreateRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await fetch("/api/fuel-records", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleId: selectedVehicle,
                    fecha,
                    litros: parseFloat(litros),
                    kilometraje: kilometraje ? parseInt(kilometraje) : undefined,
                    tipoCombustible: recordFuelType,
                    costoTotal: costoTotal ? parseFloat(costoTotal) : undefined,
                    estacion: estacion || undefined,
                    observaciones: observaciones || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess("Carga de combustible registrada");
            setShowRecordForm(false);
            setLitros("");
            setKilometraje("");
            setCostoTotal("");
            setEstacion("");
            setObservaciones("");
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al registrar carga");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Mensajes */}
            {error && (
                <div className="rounded-lg bg-red-500/20 border border-red-500/40 p-4 text-red-200">
                    {error}
                </div>
            )}
            {success && (
                <div className="rounded-lg bg-green-500/20 border border-green-500/40 p-4 text-green-200">
                    {success}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-violet-500/20 p-2.5">
                            <Truck className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{vehicles.length}</p>
                            <p className="text-sm text-gray-400">Vehículos</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-cyan-500/20 p-2.5">
                            <Fuel className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{records.length}</p>
                            <p className="text-sm text-gray-400">Cargas registradas</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-500/20 p-2.5">
                            <DollarSign className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">
                                ${records.reduce((sum, r) => sum + (r.costoTotal || 0), 0).toLocaleString("es-CL")}
                            </p>
                            <p className="text-sm text-gray-400">Costo total</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={() => setShowVehicleForm(!showVehicleForm)}
                    className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Vehículo
                </button>
                <button
                    onClick={() => setShowRecordForm(!showRecordForm)}
                    className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 transition-colors"
                    disabled={vehicles.length === 0}
                >
                    <Fuel className="h-4 w-4" />
                    Registrar Carga
                </button>
            </div>

            {/* Vehicle Form */}
            {showVehicleForm && (
                <form onSubmit={handleCreateVehicle} className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Nuevo Vehículo</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Patente *</label>
                            <input
                                type="text"
                                value={patente}
                                onChange={(e) => setPatente(e.target.value.toUpperCase())}
                                required
                                placeholder="ABCD12"
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Marca</label>
                            <input
                                type="text"
                                value={marca}
                                onChange={(e) => setMarca(e.target.value)}
                                placeholder="Toyota"
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Modelo</label>
                            <input
                                type="text"
                                value={modelo}
                                onChange={(e) => setModelo(e.target.value)}
                                placeholder="Hilux"
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Año</label>
                            <input
                                type="number"
                                value={anio}
                                onChange={(e) => setAnio(e.target.value)}
                                placeholder="2024"
                                min="1900"
                                max="2100"
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tipo Combustible</label>
                            <select
                                value={vehicleFuelType}
                                onChange={(e) => setVehicleFuelType(e.target.value as FuelType)}
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            >
                                {Object.entries(fuelTypeLabels).map(([value, label]) => (
                                    <option key={value} value={value} className="bg-gray-900">{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500">
                            Guardar
                        </button>
                        <button type="button" onClick={() => setShowVehicleForm(false)} className="rounded-lg bg-white/10 px-5 py-2 text-sm font-medium text-gray-300 hover:bg-white/20">
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {/* Record Form */}
            {showRecordForm && vehicles.length > 0 && (
                <form onSubmit={handleCreateRecord} className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Registrar Carga de Combustible</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Vehículo *</label>
                            <select
                                value={selectedVehicle}
                                onChange={(e) => {
                                    setSelectedVehicle(e.target.value);
                                    const v = vehicles.find(v => v.id === e.target.value);
                                    if (v) setRecordFuelType(v.tipoCombustible);
                                }}
                                required
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            >
                                <option value="" className="bg-gray-900">Seleccionar...</option>
                                {vehicles.map((v) => (
                                    <option key={v.id} value={v.id} className="bg-gray-900">
                                        {v.patente} - {v.marca} {v.modelo}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Fecha *</label>
                            <input
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                required
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Litros *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={litros}
                                onChange={(e) => setLitros(e.target.value)}
                                required
                                placeholder="45.5"
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Kilometraje</label>
                            <input
                                type="number"
                                value={kilometraje}
                                onChange={(e) => setKilometraje(e.target.value)}
                                placeholder="125000"
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tipo Combustible</label>
                            <select
                                value={recordFuelType}
                                onChange={(e) => setRecordFuelType(e.target.value as FuelType)}
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            >
                                {Object.entries(fuelTypeLabels).map(([value, label]) => (
                                    <option key={value} value={value} className="bg-gray-900">{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Costo Total ($)</label>
                            <input
                                type="number"
                                step="1"
                                value={costoTotal}
                                onChange={(e) => setCostoTotal(e.target.value)}
                                placeholder="50000"
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Estación</label>
                            <input
                                type="text"
                                value={estacion}
                                onChange={(e) => setEstacion(e.target.value)}
                                placeholder="Copec Av. Principal"
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm text-gray-400 mb-1">Observaciones</label>
                            <input
                                type="text"
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                placeholder="Notas adicionales..."
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-500">
                            Registrar
                        </button>
                        <button type="button" onClick={() => setShowRecordForm(false)} className="rounded-lg bg-white/10 px-5 py-2 text-sm font-medium text-gray-300 hover:bg-white/20">
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {/* Vehicles Table */}
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
                <div className="border-b border-white/10 px-6 py-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Truck className="h-5 w-5 text-violet-400" />
                        Vehículos
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Patente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Marca/Modelo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Año</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Combustible</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {vehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No hay vehículos registrados
                                    </td>
                                </tr>
                            ) : (
                                vehicles.map((v) => (
                                    <tr key={v.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-white">{v.patente}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300">{v.marca} {v.modelo}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300">{v.anio ?? "-"}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300">{fuelTypeLabels[v.tipoCombustible]}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Records Table */}
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
                <div className="border-b border-white/10 px-6 py-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Fuel className="h-5 w-5 text-cyan-400" />
                        Historial de Cargas
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Patente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Litros</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Km</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Costo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No hay cargas registradas
                                    </td>
                                </tr>
                            ) : (
                                records.map((r) => (
                                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            {new Date(r.fecha).toLocaleDateString("es-CL")}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-white">{r.patente}</td>
                                        <td className="px-6 py-4 text-sm text-cyan-400 font-medium">{r.litros} L</td>
                                        <td className="px-6 py-4 text-sm text-gray-300">{r.kilometraje?.toLocaleString("es-CL") ?? "-"}</td>
                                        <td className="px-6 py-4 text-sm text-emerald-400 font-medium">
                                            {r.costoTotal ? `$${r.costoTotal.toLocaleString("es-CL")}` : "-"}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">{r.estacion ?? "-"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
