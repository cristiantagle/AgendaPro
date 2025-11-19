"use client";

import * as tf from "@tensorflow/tfjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Employee = {
  id: string;
  nombreCompleto: string;
};

type FaceRecognitionPanelProps = {
  slug: string;
  employees: Employee[];
  selectedEmployeeId: string;
  deviceToken: string | null;
  authorized: boolean;
  allowEnrollment: boolean;
  onEmployeeDetected: (employeeId: string, confidence: number) => void;
  onStatus?: (message: string) => void;
};

type FaceApiModule = typeof import("@vladmandic/face-api");

type FaceProfile = {
  employeeId: string;
  descriptor: Float32Array;
  updatedAt: string;
};

const MATCH_THRESHOLD = 0.45;
const MODEL_PATH = "/face-models";

export function FaceRecognitionPanel({
  slug,
  employees,
  selectedEmployeeId,
  deviceToken,
  authorized,
  allowEnrollment,
  onEmployeeDetected,
  onStatus,
}: FaceRecognitionPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [faceApi, setFaceApi] = useState<FaceApiModule | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  const postStatus = useCallback(
    (message: string) => {
      setStatus(message);
      onStatus?.(message);
    },
    [onStatus],
  );

  const setupCamera = useCallback(async () => {
    if (!videoRef.current || !authorized) {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraError(null);
    } catch (error) {
      setCameraError(
        (error as Error).message ??
          "No se pudo acceder a la cámara. Revisa los permisos del navegador.",
      );
    }
  }, [authorized]);

  const stopCamera = useCallback(() => {
    const element = videoRef.current;
    const stream = element?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (element) {
      element.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadModels = async () => {
      if (faceApi) return;
      try {
        const faceModule = await import("@vladmandic/face-api");
        try {
          await tf.setBackend("webgl");
        } catch {
          await tf.setBackend("cpu");
        }
        await tf.ready();
        setStatus("Cargando modelos biométricos...");
        await Promise.all([
          faceModule.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
          faceModule.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
          faceModule.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
        ]);
        setStatus("Modelos listos. Puedes comenzar a detectar rostros.");
        if (mounted) {
          setFaceApi(faceModule);
          setModelsReady(true);
        }
      } catch (error) {
        setCameraError(
          (error as Error).message ??
            "No se pudieron cargar los modelos de reconocimiento.",
        );
        setStatus("Error al cargar modelos. Reintenta o revisa la conexión.");
      }
    };
    void loadModels();
    return () => {
      mounted = false;
    };
  }, [faceApi]);

  useEffect(() => {
    if (!authorized) {
      stopCamera();
      return;
    }
    setStatus("Activando cámara frontal...");
    void setupCamera();
    return () => {
      stopCamera();
    };
  }, [authorized, setupCamera, stopCamera]);

  const fetchProfiles = useCallback(async () => {
    if (!deviceToken || !authorized) {
      setProfiles([]);
      return;
    }
    setLoadingProfiles(true);
    setStatus("Sincronizando rostros registrados...");
    try {
      const res = await fetch(`/api/kiosk/${slug}/faces`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${deviceToken}`,
        },
      });
      if (!res.ok) {
        throw new Error("No se pudieron cargar los rostros registrados.");
      }
      const data = await res.json();
      const rows = Array.isArray(data.faces) ? data.faces : [];
      const mapped: FaceProfile[] = rows.map(
        (face: { employeeId: string; descriptor: number[]; updatedAt: string }) => ({
          employeeId: face.employeeId,
          descriptor: new Float32Array(face.descriptor),
          updatedAt: face.updatedAt,
        }),
      );
      setProfiles(mapped);
    } catch (error) {
      postStatus(
        (error as Error).message ??
          "Ocurrió un error al buscar rostros registrados.",
      );
    } finally {
      setLoadingProfiles(false);
      setStatus(null);
    }
  }, [authorized, deviceToken, postStatus, slug]);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  const captureDescriptor = useCallback(async () => {
    if (!faceApi || !modelsReady || !videoRef.current) {
      postStatus("El reconocimiento aún se está inicializando.");
      return null;
    }
    postStatus("Detectando rostro...");
    const options = new faceApi.TinyFaceDetectorOptions({ inputSize: 320 });
    const detection = await faceApi
      .detectSingleFace(videoRef.current, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) {
      postStatus("No se detectó ningún rostro. Ajusta la posición e iluminación.");
      return null;
    }
    postStatus("Rostro detectado.");
    return detection.descriptor;
  }, [faceApi, modelsReady, postStatus]);

  const recognizeFace = useCallback(async () => {
    if (!authorized) {
      postStatus("Autoriza el kiosco antes de usar reconocimiento facial.");
      return;
    }
    if (!profiles.length) {
      postStatus("Aún no hay rostros registrados para comparar.");
      return;
    }
    setRecognizing(true);
    postStatus("Comparando rostro en vivo con la base local...");
    try {
      const descriptor = await captureDescriptor();
      if (!descriptor || !faceApi) {
        return;
      }
      const resolvedMatch = profiles.reduce<{
        employeeId: string;
        distance: number;
      } | null>((best, profile) => {
        const distance = faceApi.euclideanDistance(
          Array.from(descriptor),
          Array.from(profile.descriptor),
        );
        if (!best || distance < best.distance) {
          return { employeeId: profile.employeeId, distance };
        }
        return best;
      }, null);
      if (!resolvedMatch || resolvedMatch.distance > MATCH_THRESHOLD) {
        postStatus("No se encontró una coincidencia segura.");
        return;
      }
      const confidence = Math.max(0, 1 - resolvedMatch.distance);
      onEmployeeDetected(resolvedMatch.employeeId, confidence);
      const employeeName =
        employees.find((employee) => employee.id === resolvedMatch.employeeId)
          ?.nombreCompleto ?? "Trabajador";
      postStatus(
        `Rostro identificado: ${employeeName} (confianza ${(confidence * 100).toFixed(1)}%)`,
      );
    } catch (error) {
      postStatus(
        (error as Error).message ?? "No se pudo procesar la imagen capturada.",
      );
    } finally {
      setRecognizing(false);
      setStatus(null);
    }
  }, [authorized, captureDescriptor, employees, faceApi, onEmployeeDetected, postStatus, profiles]);

  const enrollFace = useCallback(async () => {
    if (!authorized) {
      postStatus("Autoriza el kiosco antes de registrar rostros.");
      return;
    }
    if (!deviceToken) {
      postStatus("Este dispositivo no tiene un token válido.");
      return;
    }
    if (!selectedEmployee) {
      postStatus("Selecciona primero un trabajador.");
      return;
    }
    setEnrolling(true);
    postStatus("Capturando descriptor para el trabajador seleccionado...");
    try {
      const descriptor = await captureDescriptor();
      if (!descriptor) {
        return;
      }
      const payload = {
        employeeId: selectedEmployee.id,
        descriptor: Array.from(descriptor),
      };
      const res = await fetch(`/api/kiosk/${slug}/faces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deviceToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No fue posible guardar el rostro.");
      }
      postStatus(`Rostro guardado para ${selectedEmployee.nombreCompleto}.`);
      await fetchProfiles();
    } catch (error) {
      postStatus(
        (error as Error).message ?? "No se pudo almacenar el descriptor facial.",
      );
    } finally {
      setEnrolling(false);
      setStatus(null);
    }
  }, [
    authorized,
    captureDescriptor,
    deviceToken,
    fetchProfiles,
    postStatus,
    selectedEmployee,
    slug,
  ]);

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-200/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 text-white shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-400">
            Módulo biométrico
          </p>
          <h3 className="text-2xl font-semibold">Identidad por cámara</h3>
          <p className="text-sm text-white/70">
            Captura, entrena e identifica trabajadores sin depender de servicios externos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchProfiles()}
          disabled={loadingProfiles}
          className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:opacity-40"
        >
          {loadingProfiles ? "Actualizando..." : "Refrescar rostros"}
        </button>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr,2fr]">
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-black/40 p-3">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-6 rounded-[32px] border border-white/15" />
            <div className="absolute inset-12 rounded-[32px] border border-white/10" />
          </div>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-video w-full rounded-[24px] object-cover"
          />
          {!authorized ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-black/70 p-6 text-center text-sm font-medium">
              Autoriza este kiosco para activar la cámara y capturar el rostro.
            </div>
          ) : null}
          {cameraError ? (
            <p className="mt-3 text-sm text-red-300">{cameraError}</p>
          ) : null}
          {status ? (
            <p className="mt-1 text-sm text-white/80">{status}</p>
          ) : null}
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 rounded-3xl border border-white/20 bg-white/5 p-4 text-sm text-white/80 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-white/50">Rostros entrenados</p>
              <p className="text-2xl font-semibold">{profiles.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50">Trabajador seleccionado</p>
              <p className="text-base font-semibold">
                {selectedEmployee?.nombreCompleto ?? "Ninguno"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50">Modelos</p>
              <p className="text-base font-semibold">
                {modelsReady ? "Operativos" : "Inicializando…"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50">Estado cámara</p>
              <p className="text-base font-semibold">
                {authorized ? "Activa" : "Bloqueada"}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={recognizeFace}
              disabled={!authorized || recognizing || !modelsReady}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-emerald-400 px-4 py-4 text-lg font-semibold text-slate-950 shadow-lg shadow-cyan-400/40 transition hover:brightness-110 disabled:opacity-50"
            >
              {recognizing ? "Escaneando en vivo..." : "Identificar automáticamente"}
            </button>
            {allowEnrollment ? (
              <button
                type="button"
                onClick={enrollFace}
                disabled={
                  !authorized ||
                  !selectedEmployee ||
                  enrolling ||
                  !modelsReady
                }
                className="w-full rounded-2xl border border-white/30 px-4 py-4 text-lg font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                {enrolling ? "Guardando rostro..." : "Guardar rostro del trabajador"}
              </button>
            ) : (
              <div className="rounded-2xl border border-white/20 px-4 py-4 text-sm text-white/70">
                Inicia sesión como administrador para registrar nuevos rostros o gestionar el kiosco.
              </div>
            )}
            <p className="text-xs text-white/70">
              Guardamos únicamente descriptores matemáticos. Nunca almacenamos fotos en disco ni
              enviamos datos a servicios externos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
