import { Accelerometer } from "expo-sensors";
import { useCallback, useRef, useState } from "react";

export function useAccelSample() {
  const [sampling, setSampling] = useState(false);
  const [maxMag, setMaxMag] = useState<number | null>(null);
  const sub = useRef<{ remove: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peakRef = useRef(0);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    sub.current?.remove();
    sub.current = null;
    setSampling(false);
  }, []);

  const start = useCallback(
    (durationMs = 2500) => {
      stop();
      peakRef.current = 0;
      setMaxMag(null);
      setSampling(true);
      Accelerometer.setUpdateInterval(50);
      sub.current = Accelerometer.addListener(({ x, y, z }) => {
        const m = Math.sqrt(x * x + y * y + z * z);
        if (m > peakRef.current) peakRef.current = m;
      });
      timer.current = setTimeout(() => {
        const peak = peakRef.current;
        stop();
        setMaxMag(peak);
      }, durationMs);
    },
    [stop],
  );

  return { sampling, maxMag, start, stop };
}
