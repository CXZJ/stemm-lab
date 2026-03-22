import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";
import { minTouch } from "@/theme/tokens";

type Phase = "intro" | "react_dom" | "react_other" | "trace" | "done";

export function ReactionBoardFlow({
  simple,
  onUpdate,
}: {
  simple: boolean;
  onUpdate: (patch: Record<string, number | string>) => void;
}) {
  const t = useStemTheme();
  const [phase, setPhase] = useState<Phase>("intro");
  const [traceScore, setTraceScore] = useState<number | null>(null);

  return (
    <View style={styles.box}>
      <StemText variant="h2">Reaction board</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 12 }}>
        {simple
          ? "Tap when the target turns green. Try both hands. Then trace along the dotted line."
          : "Measure reaction for dominant vs non-dominant hand, then complete the tracing task."}
      </StemText>

      {phase === "intro" && (
        <StemButton title="Start" onPress={() => setPhase("react_dom")} />
      )}

      {phase === "react_dom" && (
        <ReactionTapPhase
          label={simple ? "Use your writing hand" : "Dominant hand"}
          onComplete={(ms) => {
            onUpdate({ handDominantMs: Math.round(ms) });
            setPhase("react_other");
          }}
        />
      )}

      {phase === "react_other" && (
        <ReactionTapPhase
          label={simple ? "Use your other hand" : "Non-dominant hand"}
          onComplete={(ms) => {
            onUpdate({ handOtherMs: Math.round(ms) });
            setPhase("trace");
          }}
        />
      )}

      {phase === "trace" && (
        <TracePhase
          simple={simple}
          onComplete={(score) => {
            setTraceScore(score);
            onUpdate({ traceScore: Math.round(score) });
            setPhase("done");
          }}
        />
      )}

      {phase === "done" && (
        <StemText variant="body">
          {simple ? "Great job!" : "All phases saved to this attempt."} Trace score:{" "}
          {traceScore?.toFixed(0) ?? "—"}
        </StemText>
      )}
    </View>
  );
}

function ReactionTapPhase({
  label,
  onComplete,
}: {
  label: string;
  onComplete: (ms: number) => void;
}) {
  const t = useStemTheme();
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [startAt, setStartAt] = useState(0);

  const arm = () => {
    setArmed(true);
    setVisible(false);
    const delay = Math.floor(Math.random() * 2200) + 500;
    setTimeout(() => {
      setVisible(true);
      setStartAt(Date.now());
    }, delay);
  };

  return (
    <View>
      <StemText variant="body" style={{ marginBottom: 8 }}>
        {label}
      </StemText>
      {!armed ? (
        <StemButton title="Ready — wait for green" onPress={arm} />
      ) : (
        <Pressable
          onPress={() => {
            if (!visible) return;
            onComplete(Date.now() - startAt);
          }}
          style={[styles.target, { borderColor: visible ? t.colors.success : t.colors.border }]}
          accessibilityLabel={visible ? "Tap now reaction target" : "Wait for green target"}
        >
          <StemText variant="h2">{visible ? "TAP!" : "Wait…"}</StemText>
        </Pressable>
      )}
    </View>
  );
}

function TracePhase({
  simple,
  onComplete,
}: {
  simple: boolean;
  onComplete: (score: number) => void;
}) {
  const [pts, setPts] = useState<{ x: number; y: number }[]>([]);
  const pathD = "M 20 120 Q 100 20 180 120 T 300 80";

  const finish = () => {
    const base = Math.min(100, pts.length * 4);
    const score = pts.length < 4 ? Math.max(0, base - 20) : base;
    onComplete(score);
  };

  return (
    <View style={{ minHeight: 240 }}>
      <StemText variant="small" style={{ marginBottom: 6 }}>
        {simple
          ? "Tap and drag along the dotted path."
          : "Trace the path; score rewards coverage along the guide."}
      </StemText>
      <View style={styles.traceWrap}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) => {
            const { locationX, locationY } = e.nativeEvent;
            setPts((p) => [...p, { x: locationX, y: locationY }].slice(-100));
          }}
        >
          <Svg width="100%" height="200" viewBox="0 0 320 200">
            <Path d={pathD} stroke="#94a3b8" strokeWidth={3} fill="none" strokeDasharray="6 6" />
            {pts.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={4} fill="#2A9D8F" />
            ))}
          </Svg>
        </Pressable>
      </View>
      <StemButton title="Finish tracing" onPress={finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginBottom: 16 },
  target: {
    minHeight: minTouch * 3,
    borderWidth: 3,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  traceWrap: { height: 200, marginBottom: 8 },
});
