import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";

export function BreathingFlow({
  simple,
  onUpdate,
}: {
  simple: boolean;
  onUpdate: (patch: Record<string, number | string>) => void;
}) {
  const t = useStemTheme();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const startAt = useRef(0);
  const breathsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  const start = () => {
    breathsRef.current = 0;
    setBreaths(0);
    setElapsed(0);
    setRunning(true);
    startAt.current = Date.now();
    tick.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startAt.current) / 1000));
    }, 200);
  };

  const stop = () => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    setRunning(false);
    const secs = Math.max(1, Math.floor((Date.now() - startAt.current) / 1000));
    onUpdate({
      breathCount: breathsRef.current,
      sampleDurationSec: secs,
    });
  };

  return (
    <View style={styles.box}>
      <StemText variant="h2">Breathing counter</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 8 }}>
        {simple
          ? "Tap each breath you see. One student at a time."
          : "Count breaths over a fixed window for rest vs after-exercise phases."}
      </StemText>
      <StemText variant="body" accessibilityLiveRegion="polite">
        Time: {elapsed}s · Breaths: {breaths}
      </StemText>
      <View style={styles.row}>
        {!running ? (
          <StemButton title="Start timer" onPress={start} />
        ) : (
          <>
            <StemButton
              title="Count breath (+1)"
              onPress={() => {
                breathsRef.current += 1;
                setBreaths(breathsRef.current);
              }}
            />
            <StemButton title="Stop & save counts" variant="secondary" onPress={stop} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginBottom: 16, gap: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
});
