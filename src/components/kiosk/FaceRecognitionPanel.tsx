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
        await tf.setBackend("webgl");
        await tf.ready();
        await Promise.all([
          faceModule.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
          faceModule.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
          faceModule.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
        ]);
        if (mounted) {
          setFaceApi(faceModule);
          setModelsReady(true);
        }
      } catch (error) {
        setCameraError(
          (error as Error).message ??
            "No se pudieron cargar los modelos de reconocimiento.",
        );
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
    const options = new faceApi.TinyFaceDetectorOptions({ inputSize: 320 });
    const detection = await faceApi
      .detectSingleFace(videoRef.current, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) {
      postStatus("No se detectó ningún rostro. Ajusta la posición e iluminación.");
      return null;
    }
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
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Reconocimiento facial
          </h3>
          <p className="text-sm text-slate-500">
            Captura automática del trabajador utilizando la cámara de la tablet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchProfiles()}
          disabled={loadingProfiles}
          className="rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
        >
          {loadingProfiles ? "Actualizando..." : "Actualizar rostros"}
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="aspect-video w-full object-cover"
            />
            {!authorized ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 p-4 text-center text-sm text-white">
                Autoriza el kiosco con el PIN antes de usar la cámara.
              </div>
            ) : null}
          </div>
          {cameraError ? (
            <p className="text-sm text-red-600">{cameraError}</p>
          ) : null}
          {status ? (
            <p className="text-sm text-slate-600">{status}</p>
          ) : null}
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              Rostros registrados:{" "}
              <span className="font-semibold text-slate-900">
                {profiles.length}
              </span>
            </p>
            <p>
              Trabajador seleccionado:{" "}
              <span className="font-semibold text-slate-900">
                {selectedEmployee?.nombreCompleto ?? "Ninguno"}
              </span>
            </p>
            <p>
              Modelos cargados:{" "}
              <span className="font-semibold text-slate-900">
                {modelsReady ? "Sí" : "Inicializando..."}
              </span>
            </p>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={recognizeFace}
              disabled={!authorized || recognizing || !modelsReady}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-lg font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {recognizing ? "Analizando..." : "Identificar trabajador"}
            </button>
            <button
              type="button"
              onClick={enrollFace}
              disabled={
                !authorized ||
                !selectedEmployee ||
                enrolling ||
                !modelsReady
              }
              className="w-full rounded-xl border border-emerald-600 px-4 py-3 text-lg font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            >
              {enrolling ? "Guardando..." : "Guardar rostro del seleccionado"}
            </button>
            <p className="text-xs text-slate-500">
              El rostro se almacena como descriptor matemático (no como foto),
              y sólo se utiliza para identificar trabajadores de esta empresa.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
