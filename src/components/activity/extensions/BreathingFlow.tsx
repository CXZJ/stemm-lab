import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PhaseResult {
  phaseLabel: string;
  prediction: string;
  breathCount: number;
  durationSec: number;
  bpm: number;
  wasRight: boolean | null;
}

interface MemberResult {
  name: string;
  phases: PhaseResult[];
}

type PhaseStep = "predict" | "exercise" | "measure" | "compare";

// ── Phases ─────────────────────────────────────────────────────────────────────
const PHASES = [
  {
    id: "rest",
    label: "Breathing at Rest",
    emoji: "😌",
    instruction: "Place the phone gently on your chest. Lie still or sit quietly. Count your breaths for 30 seconds.",
    instructionSimple: "Put the phone on your chest and breathe normally. Count each breath!",
    exerciseInstruction: null,
    tip: "Don't change how you breathe — just observe it naturally.",
  },
  {
    id: "exercise_1",
    label: "After Exercise 1",
    emoji: "🏃",
    instruction: "Jog on the spot for 1 minute, then immediately place the phone on your chest and count breaths.",
    instructionSimple: "Jog on the spot for 1 minute, then count your breaths!",
    exerciseInstruction: "Jog on the spot for 1 minute now.",
    tip: "Start counting immediately after you stop exercising.",
  },
  {
    id: "exercise_2",
    label: "After Exercise 2",
    emoji: "⭐",
    instruction: "Do 100 star jumps, then immediately place the phone on your chest and count breaths.",
    instructionSimple: "Do 100 star jumps, then count your breaths!",
    exerciseInstruction: "Do 100 star jumps now.",
    tip: "Compare this result to Exercise 1 — did more exercise mean faster breathing?",
  },
];

const DESCRIPTION =
  "Place the phone on your chest and measure breathing rate at rest and after exercise. Predict, measure, then compare.";

// ── Exercise countdown hook ────────────────────────────────────────────────────
function useExerciseTimer(totalSec: number, active: boolean) {
  const [remaining, setRemaining] = useState(totalSec);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      setRemaining(totalSec);
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRemaining(totalSec);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, totalSec]);

  return remaining;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function BreathingFlow({
  simple,
  onUpdate,
  ttsEnabled,
  speak,
  isSpeaking,
}: {
  simple: boolean;
  onUpdate: (patch: Record<string, number | string>) => void;
  ttsEnabled?: boolean;
  speak?: (id: string, text: string) => void;
  isSpeaking?: (id: string) => boolean;
}) {
  const t = useStemTheme();
  const team = useTeamStore((s) => s.team);
  const memberNames: string[] = team?.memberNames ?? ["Member 1"];

  const [started, setStarted] = useState(false);
  const [memberIndex, setMemberIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseStep, setPhaseStep] = useState<PhaseStep>("predict");
  const [allResults, setAllResults] = useState<MemberResult[]>(
    memberNames.map((name) => ({ name, phases: [] }))
  );
  const [done, setDone] = useState(false);

  const [prediction, setPrediction] = useState("");
  const [wasRight, setWasRight] = useState<boolean | null>(null);

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const [savedResult, setSavedResult] = useState<{ breathCount: number; durationSec: number; bpm: number } | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const startAt = useRef(0);
  const breathsRef = useRef(0);

  const [exercising, setExercising] = useState(false);
  const exerciseDuration = phaseIndex === 1 ? 60 : 120;
  const exerciseCountdown = useExerciseTimer(exerciseDuration, exercising);

  useEffect(() => {
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  const currentMember = memberNames[memberIndex] ?? "Member 1";
  const currentPhase = PHASES[phaseIndex];

  const startBreathTimer = () => {
    breathsRef.current = 0;
    setBreaths(0);
    setElapsed(0);
    setSavedResult(null);
    setRunning(true);
    startAt.current = Date.now();
    tick.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startAt.current) / 1000));
    }, 200);
  };

  const stopBreathTimer = () => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    setRunning(false);
    const secs = Math.max(1, Math.floor((Date.now() - startAt.current) / 1000));
    const bpm = Math.round((breathsRef.current / secs) * 60);
    setSavedResult({ breathCount: breathsRef.current, durationSec: secs, bpm });
  };

  const savePhase = () => {
    if (!savedResult) return;
    const result: PhaseResult = {
      phaseLabel: currentPhase.label,
      prediction,
      breathCount: savedResult.breathCount,
      durationSec: savedResult.durationSec,
      bpm: savedResult.bpm,
      wasRight,
    };

    const updated = allResults.map((r, i) =>
      i === memberIndex ? { ...r, phases: [...r.phases, result] } : r
    );
    setAllResults(updated);

    const allBpms = updated.flatMap((m) => m.phases.map((p) => p.bpm));
    const avgBpm = allBpms.length > 0
      ? Math.round(allBpms.reduce((a, b) => a + b) / allBpms.length)
      : 0;

    onUpdate({
      breathCount: savedResult.breathCount,
      sampleDurationSec: savedResult.durationSec,
      memberName: currentMember,
      phase: currentPhase.id,
      prediction,
      result: `${savedResult.bpm} breaths/min`,
      avgBpm,
      allAttempts: JSON.stringify(
        updated.flatMap((m) =>
          m.phases.map((p) => ({
            member: m.name,
            phase: p.phaseLabel,
            prediction: p.prediction,
            breathCount: p.breathCount,
            durationSec: p.durationSec,
            bpm: p.bpm,
            wasRight: p.wasRight,
          }))
        )
      ),
    });

    setPrediction("");
    setWasRight(null);
    setSavedResult(null);
    setBreaths(0);
    setElapsed(0);
    setExercising(false);
    setPhaseStep("predict");

    if (phaseIndex < PHASES.length - 1) {
      setPhaseIndex((i) => i + 1);
    } else if (memberIndex < memberNames.length - 1) {
      setPhaseIndex(0);
      setMemberIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  if (!started) {
    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">🫁 Breathing Pace Trainer</StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>{DESCRIPTION}</StemText>
        {ttsEnabled && speak && isSpeaking && (
          <SpeakButton
            id="breathing-desc"
            text={DESCRIPTION}
            isSpeaking={isSpeaking("breathing-desc")}
            onPress={() => speak("breathing-desc", DESCRIPTION)}
          />
        )}
        <View style={[styles.instructionBox, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={{ fontWeight: "bold" }}>3 phases per member:</StemText>
          {PHASES.map((p) => (
            <StemText key={p.id} variant="small" style={{ color: t.colors.muted }}>
              {p.emoji} {p.label}
            </StemText>
          ))}
        </View>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          {memberNames.length} member(s) · Place phone on chest during measurement
        </StemText>
        <StemButton title="Start Lab" onPress={() => setStarted(true)} />
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">✅ Lab Complete</StemText>
        {allResults.map((member, mi) => (
          <View key={mi} style={{ marginBottom: 12 }}>
            <StemText variant="body" style={{ fontWeight: "bold", marginBottom: 4 }}>
              👤 {member.name}
            </StemText>
            <View style={[styles.tableHeader, { backgroundColor: t.colors.card }]}>
              <StemText variant="small" style={[styles.colPhase, styles.bold]}>Phase</StemText>
              <StemText variant="small" style={[styles.colPredict, styles.bold]}>Prediction</StemText>
              <StemText variant="small" style={[styles.colBpm, styles.bold]}>BPM</StemText>
              <StemText variant="small" style={[styles.colRight, styles.bold]}>✓?</StemText>
            </View>
            {member.phases.map((p, pi) => (
              <View key={pi} style={[styles.tableRow, { borderColor: t.colors.border }]}>
                <StemText variant="small" style={styles.colPhase}>{p.phaseLabel}</StemText>
                <StemText variant="small" style={styles.colPredict}>{p.prediction || "—"}</StemText>
                <StemText variant="small" style={[styles.colBpm, { color: t.colors.primary, fontWeight: "bold" }]}>
                  {p.bpm}
                </StemText>
                <StemText variant="small" style={[styles.colRight, {
                  color: p.wasRight === true ? "#4ade80" : p.wasRight === false ? "#ef4444" : t.colors.muted,
                }]}>
                  {p.wasRight === true ? "✅" : p.wasRight === false ? "❌" : "—"}
                </StemText>
              </View>
            ))}
          </View>
        ))}
        <StemButton
          title="Restart"
          variant="secondary"
          onPress={() => {
            setStarted(false);
            setDone(false);
            setMemberIndex(0);
            setPhaseIndex(0);
            setPhaseStep("predict");
            setAllResults(memberNames.map((name) => ({ name, phases: [] })));
            setPrediction("");
            setWasRight(null);
            setSavedResult(null);
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: t.colors.border }]}>
      <StemText variant="h2">🫁 Breathing Pace Trainer</StemText>

      <View style={[styles.progressBar, { backgroundColor: t.colors.card }]}>
        <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>
          {currentPhase.emoji} {currentPhase.label}
        </StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          👤 {currentMember} ({memberIndex + 1}/{memberNames.length}) · Phase {phaseIndex + 1}/3
        </StemText>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
          {PHASES.map((_, i) => (
            <View key={i} style={[styles.dot, {
              backgroundColor: i < phaseIndex ? t.colors.success : i === phaseIndex ? t.colors.primary : t.colors.border,
            }]} />
          ))}
        </View>
      </View>

      {phaseStep === "predict" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>Step 1 — Predict 🔮</StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            {simple ? "How many breaths per minute do you think you will take?" : `Predict breaths per minute for: ${currentPhase.label}`}
          </StemText>
          <TextInput
            style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder={
              currentPhase.id === "rest" ? "e.g. 6 breaths per minute"
              : currentPhase.id === "exercise_1" ? "e.g. 20 breaths per minute after jogging"
              : "e.g. 30 breaths per minute after star jumps"
            }
            placeholderTextColor={t.colors.muted}
            value={prediction}
            onChangeText={setPrediction}
          />
          <StemButton
            title={currentPhase.exerciseInstruction ? "Next — do exercise →" : "Start measuring →"}
            onPress={() => setPhaseStep(currentPhase.exerciseInstruction ? "exercise" : "measure")}
            disabled={prediction.trim().length === 0}
          />
        </View>
      )}

      {phaseStep === "exercise" && currentPhase.exerciseInstruction && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            {currentPhase.emoji} Do the exercise now!
          </StemText>
          <StemText variant="body">
            {simple ? currentPhase.instructionSimple : currentPhase.exerciseInstruction}
          </StemText>
          {!exercising && exerciseCountdown === exerciseDuration && (
            <StemButton
              title={`▶ Start ${currentPhase.id === "exercise_1" ? "1 min jog timer" : "2 min star jump timer"}`}
              onPress={() => setExercising(true)}
            />
          )}
          {exercising && exerciseCountdown > 0 && (
            <View style={[styles.exerciseBox, { borderColor: t.colors.primary, backgroundColor: t.colors.primary + "18" }]}>
              <StemText variant="h1" style={{ color: t.colors.primary, textAlign: "center", fontSize: 52 }}>
                {exerciseCountdown}s
              </StemText>
              <StemText variant="small" style={{ color: t.colors.primary, textAlign: "center" }}>Keep going!</StemText>
            </View>
          )}
          {(exerciseCountdown === 0 || (!exercising && exerciseCountdown < exerciseDuration)) && (
            <>
              <View style={[styles.exerciseBox, { borderColor: t.colors.success, backgroundColor: t.colors.success + "18" }]}>
                <StemText variant="body" style={{ color: t.colors.success, textAlign: "center", fontWeight: "bold" }}>
                  ✅ Exercise done! Now measure your breathing.
                </StemText>
              </View>
              <StemButton title="Start measuring →" onPress={() => { setExercising(false); setPhaseStep("measure"); }} />
            </>
          )}
        </View>
      )}

      {phaseStep === "measure" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>Step 2 — Measure 📡</StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            {simple ? "Place the phone on your chest. Press +1 each time you breathe in." : currentPhase.instruction}
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted, fontStyle: "italic" }}>💡 {currentPhase.tip}</StemText>
          {running && (
            <View style={[styles.counterBox, { borderColor: t.colors.primary, backgroundColor: t.colors.primary + "18" }]}>
              <StemText variant="h1" style={{ color: t.colors.primary, textAlign: "center", fontSize: 52 }}>{breaths}</StemText>
              <StemText variant="small" style={{ color: t.colors.primary, textAlign: "center" }}>breaths · {elapsed}s elapsed</StemText>
            </View>
          )}
          {savedResult && !running && (
            <View style={[styles.counterBox, { borderColor: t.colors.success, backgroundColor: t.colors.success + "18" }]}>
              <StemText variant="h1" style={{ color: t.colors.success, textAlign: "center", fontSize: 52 }}>{savedResult.bpm}</StemText>
              <StemText variant="small" style={{ color: t.colors.success, textAlign: "center" }}>
                breaths per minute · ({savedResult.breathCount} breaths in {savedResult.durationSec}s)
              </StemText>
            </View>
          )}
          <View style={styles.row}>
            {!running && !savedResult && <StemButton title="▶ Start counting" onPress={startBreathTimer} />}
            {running && (
              <>
                <StemButton title={`+1 Breath (${breaths})`} onPress={() => { breathsRef.current += 1; setBreaths(breathsRef.current); }} />
                <StemButton title="Stop & save" variant="secondary" onPress={stopBreathTimer} />
              </>
            )}
            {!running && savedResult && (
              <>
                <StemButton title="🔁 Retry" variant="secondary" onPress={() => { setSavedResult(null); setBreaths(0); setElapsed(0); }} />
                <StemButton title="Compare result →" onPress={() => setPhaseStep("compare")} />
              </>
            )}
          </View>
        </View>
      )}

      {phaseStep === "compare" && savedResult && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>Step 3 — Were you right? 🎯</StemText>
          <View style={styles.compareRow}>
            <View style={[styles.compareBox, { borderColor: t.colors.border, backgroundColor: t.colors.card }]}>
              <StemText variant="small" style={{ color: t.colors.muted, fontWeight: "bold" }}>Your prediction</StemText>
              <StemText variant="small">{prediction}</StemText>
            </View>
            <View style={[styles.compareBox, { borderColor: t.colors.primary, backgroundColor: t.colors.primary + "18" }]}>
              <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>Outcome</StemText>
              <StemText variant="small" style={{ color: t.colors.primary }}>
                {savedResult.bpm} breaths/min{"\n"}({savedResult.breathCount} in {savedResult.durationSec}s)
              </StemText>
            </View>
          </View>
          <StemText variant="small" style={{ color: t.colors.muted }}>Was your prediction correct?</StemText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton title="✅ Yes" variant={wasRight === true ? "primary" : "secondary"} onPress={() => setWasRight(true)} />
            <StemButton title="❌ No" variant={wasRight === false ? "primary" : "secondary"} onPress={() => setWasRight(false)} />
          </View>
          <StemButton title="Save & next →" onPress={savePhase} disabled={wasRight === null} />
        </View>
      )}

      {allResults[memberIndex]?.phases.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 4 }}>
            {currentMember}'s results so far:
          </StemText>
          {allResults[memberIndex].phases.map((p, i) => (
            <StemText key={i} variant="small" style={{ color: t.colors.primary }}>
              {PHASES.find(ph => ph.label === p.phaseLabel)?.emoji ?? "•"} {p.phaseLabel}: {p.bpm} BPM · {p.wasRight === true ? "✅" : p.wasRight === false ? "❌" : "—"}
            </StemText>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 8 },
  progressBar: { borderRadius: 8, padding: 10, gap: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  instructionBox: { borderRadius: 8, padding: 10, gap: 4 },
  stepBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  exerciseBox: { borderWidth: 2, borderRadius: 12, padding: 20, alignItems: "center" },
  counterBox: { borderWidth: 2, borderRadius: 12, padding: 20, alignItems: "center" },
  compareRow: { flexDirection: "row", gap: 8 },
  compareBox: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tableHeader: { flexDirection: "row", padding: 8, borderRadius: 8, marginBottom: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 6, paddingHorizontal: 4, alignItems: "flex-start" },
  colPhase: { flex: 1.2 },
  colPredict: { flex: 1 },
  colBpm: { width: 50, textAlign: "center" },
  colRight: { width: 28, textAlign: "center" },
  bold: { fontWeight: "bold" },
});