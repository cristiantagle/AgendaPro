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
  autoDetect?: boolean;
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
  autoDetect = false,
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

  useEffect(() => {
    if (!autoDetect) return;
    if (!authorized || !modelsReady || recognizing) return;
    const timer = setTimeout(() => {
      void recognizeFace();
    }, 400);
    return () => clearTimeout(timer);
  }, [autoDetect, authorized, modelsReady, recognizeFace, recognizing]);

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
    <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-[32px] border border-sky-500/30 bg-[#060910] p-6 text-white shadow-[0_0_60px_rgba(14,165,233,0.25)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-sky-400">
            Escaneo facial
          </p>
          <h3 className="text-3xl font-semibold">
            Hola, {selectedEmployee?.nombreCompleto ?? "Trabajador"}
          </h3>
          <p className="text-sm text-white/70">
            Mira la cámara para validar tu identidad antes de marcar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchProfiles()}
          disabled={loadingProfiles}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10 disabled:opacity-40"
        >
          {loadingProfiles ? "Sincronizando..." : "Actualizar rostros"}
        </button>
      </div>
      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        <div className="mx-auto w-full max-w-md flex-1">
          <div className="relative overflow-hidden rounded-[30px] border border-cyan-500/30 bg-black/50 p-3 shadow-[0_0_40px_rgba(14,165,233,0.2)]">
            <div className="relative overflow-hidden rounded-[24px]">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="aspect-[3/4] w-full rounded-[24px] object-cover"
              />
              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-black/80 p-6 text-center text-sm text-red-300">
                  {cameraError}
                </div>
              ) : null}
              {!authorized ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-black/70 p-6 text-center text-sm font-medium">
                  Autoriza este kiosco para activar la cámara y capturar el rostro.
                </div>
              ) : null}
            </div>
            <div className="pointer-events-none absolute inset-3 rounded-[26px] border border-cyan-300/20" />
            <div className="pointer-events-none absolute inset-6 rounded-[22px] border border-cyan-200/20" />
            <div className="pointer-events-none absolute inset-10 grid grid-cols-3 grid-rows-4">
              {[...Array(12)].map((_, index) => (
                <div key={index} className="border border-cyan-200/10" />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border-2 border-cyan-400/70" />
            </div>
            <div className="pointer-events-none absolute left-6 top-6 h-6 w-6 rounded-md border-2 border-sky-400/70" />
            <div className="pointer-events-none absolute right-6 top-6 h-6 w-6 rounded-md border-2 border-sky-400/70" />
            <div className="pointer-events-none absolute left-6 bottom-6 h-6 w-6 rounded-md border-2 border-sky-400/70" />
            <div className="pointer-events-none absolute right-6 bottom-6 h-6 w-6 rounded-md border-2 border-sky-400/70" />
            <div className="pointer-events-none absolute bottom-3 right-4 text-[10px] font-mono text-cyan-300/70">
              <p>ISO 400</p>
              <p>EXP -0.1</p>
              <p>FPS 60</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-5 rounded-[28px] border border-white/10 bg-white/5 p-5 text-white/80">
          <div className="text-xs font-mono uppercase tracking-[0.3em] text-white/50">
            Biometría: {recognizing ? "Procesando" : modelsReady ? "Listo" : "Inicializando"}
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
              style={{
                width: `${recognizing ? 60 : modelsReady ? 100 : 15}%`,
              }}
            />
          </div>
          <p className="text-center text-lg font-semibold text-white">
            {status ??
              (recognizing ? "Escaneando puntos faciales..." : "Manten tu rostro centrado.")}
          </p>
          <button
            type="button"
            onClick={() => recognizeFace()}
            disabled={!authorized || recognizing || !modelsReady}
            className="w-full rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
          >
            {recognizing ? "Procesando..." : "Reintentar escaneo"}
          </button>
          <p className="text-center text-xs text-white/50">
            <button
              type="button"
              className="font-semibold text-cyan-300 underline"
              onClick={() => setStatus("Modo PIN manual no implementado")}
            >
              Usar PIN manual
            </button>
          </p>
          <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
            <div>
              <p className="text-xs uppercase text-white/40">Trabajador</p>
              <p className="text-base font-semibold text-white">
                {selectedEmployee?.nombreCompleto ?? "Sin seleccionar"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-white/40">Rostros registrados</p>
                <p className="text-lg font-bold text-white">{profiles.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-white/40">Modelos</p>
                <p className="text-lg font-bold text-white">
                  {modelsReady ? "Operativos" : "Cargando…"}
                </p>
              </div>
            </div>
          </div>
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
              className="w-full rounded-2xl border border-white/30 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              {enrolling ? "Guardando rostro..." : "Guardar rostro del trabajador"}
            </button>
          ) : (
            <div className="rounded-2xl border border-white/20 px-4 py-4 text-xs text-white/70">
              Inicia sesión como administrador para registrar nuevos rostros o gestionar el kiosco.
            </div>
          )}
          <p className="text-[11px] text-white/60">
            Guardamos únicamente descriptores matemáticos. Nunca almacenamos fotos ni enviamos datos
            fuera del kiosco.
          </p>
        </div>
      </div>
    </section>
  );
}
