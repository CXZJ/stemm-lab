import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { minTouch } from "@/theme/tokens";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = "intro" | "react_dom" | "react_other" | "trace" | "done";

interface MemberResult {
  name: string;
  dominantMs: number | null;
  otherMs: number | null;
  traceScore: number | null;
}

// ── Path points for tracing accuracy calculation ───────────────────────────────
const TRACE_PATH = "M 20 120 Q 100 20 180 120 T 300 80";

// Sample points along the SVG path for accuracy checking
const PATH_WAYPOINTS = [
  { x: 20, y: 120 }, { x: 40, y: 90 }, { x: 60, y: 55 },
  { x: 80, y: 35 }, { x: 100, y: 30 }, { x: 120, y: 45 },
  { x: 140, y: 70 }, { x: 160, y: 95 }, { x: 180, y: 110 },
  { x: 200, y: 105 }, { x: 220, y: 90 }, { x: 240, y: 75 },
  { x: 260, y: 70 }, { x: 280, y: 72 }, { x: 300, y: 80 },
];

function calcTraceScore(
  pts: { x: number; y: number }[],
  containerWidth: number,
  containerHeight: number
): number {
  if (pts.length < 3) return 0;
  const scaled = scaleWaypoints(PATH_WAYPOINTS, containerWidth, containerHeight);
  const HIT_RADIUS = 30;
  let hits = 0;
  for (const wp of scaled) {
    const closest = pts.reduce((best, p) => {
      const d = Math.hypot(p.x - wp.x, p.y - wp.y);
      return d < best ? d : best;
    }, Infinity);
    if (closest <= HIT_RADIUS) hits++;
  }
  return Math.round((hits / scaled.length) * 100);
}

const description =
  "Phase 1: Tap when the button appears (dominant hand). Phase 2: Repeat with the other hand. Phase 3: Trace the moving path. Rotate through each team member.";

// ── Main Component ─────────────────────────────────────────────────────────────
export function ReactionBoardFlow({
  simple,
  onUpdate,
  ttsEnabled,
  speak,
  isSpeaking,
  onSetScrollEnabled,
}: {
  simple: boolean;
  onUpdate: (patch: Record<string, number | string>) => void;
  ttsEnabled?: boolean;
  speak?: (id: string, text: string) => void;
  isSpeaking?: (id: string) => boolean;
  onSetScrollEnabled?: (enabled: boolean) => void;
}) {
  const t = useStemTheme();
  const team = useTeamStore((s) => s.team);
  const memberNames: string[] = team?.memberNames ?? ["Member 1"];

  const [phase, setPhase] = useState<Phase>("intro");
  const [memberIndex, setMemberIndex] = useState(0);
  const [results, setResults] = useState<MemberResult[]>(
    memberNames.map((name) => ({ name, dominantMs: null, otherMs: null, traceScore: null }))
  );

  const currentMember = results[memberIndex];
  const currentName = currentMember?.name ?? `Member ${memberIndex + 1}`;

  const updateMember = (patch: Partial<MemberResult>) => {
    setResults((prev) =>
      prev.map((r, i) => (i === memberIndex ? { ...r, ...patch } : r))
    );
  };

  // Move to next member or next phase
  const nextMemberOrPhase = (currentPhase: Phase, nextPhase: Phase) => {
    if (memberIndex < memberNames.length - 1) {
      setMemberIndex((i) => i + 1);
      setPhase(currentPhase); // stay on same phase for next member
    } else {
      setMemberIndex(0); // reset for next phase
      setPhase(nextPhase);
    }
  };

  // Save aggregate to onUpdate whenever results change
  const saveAggregate = (updated: MemberResult[]) => {
    const domTimes = updated.map((r) => r.dominantMs).filter((v): v is number => v != null);
    const othTimes = updated.map((r) => r.otherMs).filter((v): v is number => v != null);
    const traces = updated.map((r) => r.traceScore).filter((v): v is number => v != null);
    if (domTimes.length) onUpdate({ handDominantMs: Math.round(domTimes.reduce((a, b) => a + b) / domTimes.length) });
    if (othTimes.length) onUpdate({ handOtherMs: Math.round(othTimes.reduce((a, b) => a + b) / othTimes.length) });
    if (traces.length) onUpdate({ traceScore: Math.round(traces.reduce((a, b) => a + b) / traces.length) });
  };

  return (
    <View style={[styles.box, { borderColor: t.colors.border }]}>
      <StemText variant="h2">⚡ Reaction Board</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 8 }}>
        {simple
          ? "Tap when green appears. Try both hands. Then trace the path."
          : "3 phases: dominant hand, non-dominant hand, tracing. Rotate all team members."}
      </StemText>

      {ttsEnabled && speak && isSpeaking && (
        <SpeakButton
          id="reaction-desc"
          text={description}
          isSpeaking={isSpeaking("reaction-desc")}
          onPress={() => speak("reaction-desc", description)}
        />
      )}

      {/* ── Phase indicator ── */}
      {phase !== "intro" && phase !== "done" && (
        <View style={[styles.phaseBar, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>
            {phase === "react_dom" && "Phase 1 — Dominant Hand"}
            {phase === "react_other" && "Phase 2 — Other Hand"}
            {phase === "trace" && "Phase 3 — Tracing"}
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            👤 {currentName} ({memberIndex + 1}/{memberNames.length})
          </StemText>
        </View>
      )}

      {/* ── Phases ── */}
      {phase === "intro" && (
        <StemButton title="Start Reaction Board" onPress={() => setPhase("react_dom")} />
      )}

      {phase === "react_dom" && (
        <ReactionTapPhase
          key={`dom-${memberIndex}`}
          label={simple ? `${currentName} — use your writing hand` : `${currentName} — dominant hand`}
          simple={simple}
          onComplete={(ms) => {
            const updated = results.map((r, i) =>
              i === memberIndex ? { ...r, dominantMs: ms } : r
            );
            setResults(updated);
            saveAggregate(updated);
            nextMemberOrPhase("react_dom", "react_other");
          }}
        />
      )}

      {phase === "react_other" && (
        <ReactionTapPhase
          key={`oth-${memberIndex}`}
          label={simple ? `${currentName} — use your other hand` : `${currentName} — non-dominant hand`}
          simple={simple}
          onComplete={(ms) => {
            const updated = results.map((r, i) =>
              i === memberIndex ? { ...r, otherMs: ms } : r
            );
            setResults(updated);
            saveAggregate(updated);
            nextMemberOrPhase("react_other", "trace");
          }}
        />
      )}

      {phase === "trace" && (
        <TracePhase
          key={`trace-${memberIndex}`}
          memberName={currentName}
          simple={simple}
          onSetScrollEnabled={onSetScrollEnabled}
          onComplete={(score) => {
            const updated = results.map((r, i) =>
              i === memberIndex ? { ...r, traceScore: score } : r
            );
            setResults(updated);
            saveAggregate(updated);
            nextMemberOrPhase("trace", "done");
          }}
        />
      )}

      {phase === "done" && (
        <View>
          <StemText variant="body" style={{ fontWeight: "bold", marginBottom: 8 }}>
            ✅ All done! Results:
          </StemText>
          {/* Results table */}
          <View style={[styles.tableHeader, { backgroundColor: t.colors.card }]}>
            <StemText variant="small" style={[styles.col1, { fontWeight: "bold" }]}>Member</StemText>
            <StemText variant="small" style={[styles.col2, { fontWeight: "bold" }]}>Dom. Hand</StemText>
            <StemText variant="small" style={[styles.col2, { fontWeight: "bold" }]}>Other Hand</StemText>
            <StemText variant="small" style={[styles.col2, { fontWeight: "bold" }]}>Trace</StemText>
          </View>
          {results.map((r, i) => (
            <View key={i} style={[styles.tableRow, { borderColor: t.colors.border }]}>
              <StemText variant="small" style={styles.col1}>{r.name}</StemText>
              <StemText variant="small" style={[styles.col2, { color: t.colors.primary }]}>
                {r.dominantMs != null ? `${r.dominantMs}ms` : "—"}
              </StemText>
              <StemText variant="small" style={[styles.col2, { color: t.colors.accent }]}>
                {r.otherMs != null ? `${r.otherMs}ms` : "—"}
              </StemText>
              <StemText variant="small" style={[styles.col2, { color: t.colors.success }]}>
                {r.traceScore != null ? `${r.traceScore}%` : "—"}
              </StemText>
            </View>
          ))}
          <StemButton
            title="Restart"
            variant="secondary"
            onPress={() => {
              setPhase("intro");
              setMemberIndex(0);
              setResults(memberNames.map((name) => ({ name, dominantMs: null, otherMs: null, traceScore: null })));
            }}
          />
        </View>
      )}
    </View>
  );
}

// ── Reaction Tap Phase ─────────────────────────────────────────────────────────
function ReactionTapPhase({
  label,
  simple,
  onComplete,
}: {
  label: string;
  simple: boolean;
  onComplete: (ms: number) => void;
}) {
  const t = useStemTheme();
  const [state, setState] = useState<"idle" | "waiting" | "ready" | "result">("idle");
  const [startAt, setStartAt] = useState(0);
  const [resultMs, setResultMs] = useState<number | null>(null);
  const [tooEarly, setTooEarly] = useState(false);

  const arm = () => {
    setState("waiting");
    setTooEarly(false);
    setResultMs(null);
    const delay = Math.floor(Math.random() * 2500) + 800;
    setTimeout(() => {
      setState("ready");
      setStartAt(Date.now());
    }, delay);
  };

  const handlePress = () => {
    if (state === "waiting") {
      // Tapped too early
      setTooEarly(true);
      setState("idle");
      return;
    }
    if (state === "ready") {
      const ms = Date.now() - startAt;
      setResultMs(ms);
      setState("result");
    }
  };

  return (
    <View>
      <StemText variant="body" style={{ marginBottom: 8 }}>{label}</StemText>

      {state === "idle" && (
        <>
          {tooEarly && (
            <StemText variant="small" style={{ color: t.colors.danger, marginBottom: 6 }}>
              Too early! Wait for green. Try again.
            </StemText>
          )}
          <StemButton title="Ready — tap to arm" onPress={arm} />
        </>
      )}

      {(state === "waiting" || state === "ready") && (
        <Pressable
          onPress={handlePress}
          style={[
            styles.target,
            {
              borderColor: state === "ready" ? t.colors.success : t.colors.border,
              backgroundColor: state === "ready" ? t.colors.success + "22" : t.colors.card,
            },
          ]}
          accessibilityLabel={state === "ready" ? "Tap now" : "Wait for green"}
        >
          <StemText variant="h1" style={{
            color: state === "ready" ? t.colors.success : t.colors.muted,
            fontSize: 36,
          }}>
            {state === "ready" ? "TAP!" : "Wait…"}
          </StemText>
        </Pressable>
      )}

      {state === "result" && resultMs != null && (
        <View style={[styles.resultBox, { borderColor: t.colors.success, backgroundColor: t.colors.success + "11" }]}>
          <StemText variant="h2" style={{ color: t.colors.success, textAlign: "center" }}>
            {resultMs} ms
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted, textAlign: "center" }}>
            {resultMs < 200 ? "⚡ Excellent!" : resultMs < 300 ? "👍 Good" : resultMs < 400 ? "Average" : "Keep practising!"}
          </StemText>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <StemButton title="Retry" variant="secondary" onPress={() => setState("idle")} />
            <StemButton title="Save & continue" onPress={() => onComplete(resultMs)} />
          </View>
        </View>
      )}
    </View>
  );
}

// Scale SVG path from 320x200 base to actual container size
function scalePath(path: string, w: number, h: number): string {
  const scaleX = w / 320;
  const scaleY = h / 200;
  return path.replace(/(-?\d+\.?\d*)/g, (match, num, offset, str) => {
    // This is a simple approach — scale all numbers
    return String(parseFloat(num));
  })
  // Better approach: rebuild the path with scaled coords
  .replace("M 20 120", `M ${20 * scaleX} ${120 * scaleY}`)
  .replace("Q 100 20 180 120", `Q ${100 * scaleX} ${20 * scaleY} ${180 * scaleX} ${120 * scaleY}`)
  .replace("T 300 80", `T ${300 * scaleX} ${80 * scaleY}`);
}

// Scale waypoints from 320x200 base to actual container size
function scaleWaypoints(
  waypoints: { x: number; y: number }[],
  w: number,
  h: number
): { x: number; y: number }[] {
  const scaleX = w / 320;
  const scaleY = h / 200;
  return waypoints.map((wp) => ({
    x: wp.x * scaleX,
    y: wp.y * scaleY,
  }));
}

// ── Trace Phase ────────────────────────────────────────────────────────────────
function TracePhase({
  memberName,
  simple,
  onComplete,
  onSetScrollEnabled,
}: {
  memberName: string;
  simple: boolean;
  onComplete: (score: number) => void;
  onSetScrollEnabled?: (enabled: boolean) => void;
}) {
  const t = useStemTheme();
  const [pts, setPts] = useState<{ x: number; y: number }[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(320);
  const [containerHeight, setContainerHeight] = useState(200);
  const [isTracing, setIsTracing] = useState(false);

  const finish = () => {
    const s = calcTraceScore(pts, containerWidth, containerHeight);
    setScore(s);
    setFinished(true);
  };

  const reset = () => {
    setPts([]);
    setFinished(false);
    setScore(null);
  };

  return (
    <View>
      <StemText variant="body" style={{ marginBottom: 4 }}>
        {memberName} — {simple
          ? "Drag your finger along the dotted path."
          : "Trace the guide path. Score is based on how closely you follow it."}
      </StemText>

      {/* ScrollView blocking fix — tell parent not to scroll while tracing */}
      <View
      style={[styles.traceWrap, { borderColor: t.colors.border }]}
      onLayout={(e) => {
        setContainerWidth(e.nativeEvent.layout.width);
        setContainerHeight(e.nativeEvent.layout.height);
      }}
      onTouchStart={(e) => {
        if (finished) return;
        setIsTracing(true);
        const { locationX, locationY } = e.nativeEvent;
        setPts((p) => [...p, { x: locationX, y: locationY }].slice(-300));
      }}
      onTouchMove={(e) => {
        if (finished || !isTracing) return;
        const { locationX, locationY } = e.nativeEvent;
        setPts((p) => [...p, { x: locationX, y: locationY }].slice(-300));
      }}
      onTouchEnd={() => setIsTracing(false)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        if (finished) return;
        onSetScrollEnabled?.(false);
        setIsTracing(true);
        const { locationX, locationY } = e.nativeEvent;
        setPts((p) => [...p, { x: locationX, y: locationY }].slice(-300));
      }}
      onResponderMove={(e) => {
        if (finished) return;
        const { locationX, locationY } = e.nativeEvent;
        setPts((p) => [...p, { x: locationX, y: locationY }].slice(-300));
      }}
      onResponderRelease={() => {
        onSetScrollEnabled?.(true);
        setIsTracing(false);
      }}
      onResponderTerminate={() => {
        onSetScrollEnabled?.(true);
        setIsTracing(false);
      }}
    >
        {/* Use actual pixel coordinates — NO viewBox scaling */}
        <Svg
          width={containerWidth}
          height={containerHeight}
        >
          {/* Scale the path to fit the actual container size */}
          <Path
            d={scalePath(TRACE_PATH, containerWidth, containerHeight)}
            stroke="#94a3b8"
            strokeWidth={4}
            fill="none"
            strokeDasharray="8 6"
          />
          {scaleWaypoints(PATH_WAYPOINTS, containerWidth, containerHeight).map((wp, i) => (
            <Circle key={i} cx={wp.x} cy={wp.y} r={4} fill="#94a3b855" />
          ))}
          {pts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={6} fill={t.colors.primary + "cc"} />
          ))}
        </Svg>
      </View>

      <StemText variant="caption" style={{ color: t.colors.muted, marginBottom: 8 }}>
        {pts.length} points traced
      </StemText>

      {!finished ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <StemButton title="Clear" variant="ghost" onPress={reset} />
          <StemButton
            title="Finish tracing"
            onPress={finish}
            disabled={pts.length < 3}
          />
        </View>
      ) : (
        <View style={[styles.resultBox, {
          borderColor: t.colors.primary,
          backgroundColor: t.colors.primary + "11",
        }]}>
          <StemText variant="h2" style={{ color: t.colors.primary, textAlign: "center" }}>
            {score}% accuracy
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted, textAlign: "center" }}>
            {score != null && score >= 80
              ? "🎯 Excellent tracing!"
              : score != null && score >= 50
              ? "👍 Good effort"
              : "Keep practising!"}
          </StemText>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <StemButton title="Retry" variant="secondary" onPress={reset} />
            <StemButton
              title="Save & continue"
              onPress={() => score != null && onComplete(score)}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  phaseBar: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 2,
  },
  target: {
    minHeight: minTouch * 3,
    borderWidth: 3,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  resultBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    alignItems: "center",
  },
  traceWrap: {
    height: 200,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  col1: { flex: 1.2 },
  col2: { flex: 1, textAlign: "center" },
});