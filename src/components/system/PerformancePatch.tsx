"use client";

import { useEffect } from "react";

export function PerformancePatch() {
  useEffect(() => {
    if (typeof performance === "undefined" || !performance.measure) {
      return;
    }

    const originalMeasure = performance.measure.bind(performance);

    performance.measure = (
      name: string,
      startOrMeasureOptions?: string | PerformanceMeasureOptions,
      endMark?: string,
    ) => {
      try {
        return originalMeasure(name, startOrMeasureOptions as never, endMark);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.message?.includes("negative time stamp")
        ) {
          console.warn(
            "Ignorando error de performance.measure por timestamp negativo",
            error,
          );
          return undefined as unknown as PerformanceMeasure;
        }
        throw error;
      }
    };

    return () => {
      performance.measure = originalMeasure;
    };
  }, []);

  return null;
}
