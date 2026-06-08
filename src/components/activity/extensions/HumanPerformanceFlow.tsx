import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useAccelSample } from "@/hooks/useAccelSample";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

// ── Types ──────────────────────────────────────────────────────────────────────
interface AttemptResult {
  attemptNumber: number;
  memberName: string;
  movementLabel: string;
  prediction: string;
  peakMag: number;
  outcome: string;
  wasRight: boolean | null;
  ratingLabel: string;
  ratingColor: string;
}

type AttemptStep = "pick_movement" | "predict" | "measure" | "compare";

// ── 3 Movements from spec diagram ─────────────────────────────────────────────
const MOVEMENTS = [
  {
    index: 1,
    label: "Movement 1 — Circle / Figure-8",
    instruction: "Hold the phone in your hand. Rotate your hand in a circle, then in a figure-8 pattern. Keep it smooth and controlled.",
    instructionSimple: "Hold phone and draw circles in the air with your hand!",
    tip: "Try to keep your wrist loose and the movement even.",
    emoji: "⭕",
  },
  {
    index: 2,
    label: "Movement 2 — Up and Down",
    instruction: "Hold the phone and move your arm up and down slowly and smoothly, like a slow pump.",
    instructionSimple: "Move your arm up and down slowly while holding the phone.",
    tip: "The smoother you go, the lower the vibration reading.",
    emoji: "↕️",
  },
  {
    index: 3,
    label: "Movement 3 — Side to Side",
    instruction: "Hold the phone and move your arm from left to right and back again, slowly and steadily.",
    instructionSimple: "Move your arm left and right slowly while holding the phone.",
    tip: "Try to keep the speed the same going both directions.",
    emoji: "↔️",
  },
];

const SAMPLE_DURATION_SEC = 10;

// ── Vibration rating ───────────────────────────────────────────────────────────
function getRating(mag: number): { label: string; color: string; emoji: string } {
  const movement = Math.max(0, mag - 1.0);
  if (movement < 0.15) return { label: "Very smooth", color: "#4ade80", emoji: "🌊" };
  if (movement < 0.35) return { label: "Smooth",      color: "#86efac", emoji: "✅" };
  if (movement < 0.6)  return { label: "Moderate",    color: "#fde68a", emoji: "⚠️" };
  if (movement < 1.0)  return { label: "Shaky",       color: "#fb923c", emoji: "📳" };
  return                      { label: "Very shaky",  color: "#ef4444", emoji: "🔴" };
}

const DESCRIPTION =
  "Each team member picks a movement, predicts the vibration, then measures it with the phone sensor.";

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(totalSec: number, active: boolean) {
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
export function HumanPerformanceFlow({
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
  const [selectedMovement, setSelectedMovement] = useState<typeof MOVEMENTS[0] | null>(null);
  const [attemptStep, setAttemptStep] = useState<AttemptStep>("pick_movement");
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [done, setDone] = useState(false);

  const [prediction, setPrediction] = useState("");
  const [wasRight, setWasRight] = useState<boolean | null>(null);

  const accel = useAccelSample();
  const currentMember = memberNames[memberIndex] ?? "Member 1";
  const attemptNumber = results.length + 1;

  const countdown = useCountdown(SAMPLE_DURATION_SEC, accel.sampling);
  const countdownPct = accel.sampling ? (countdown / SAMPLE_DURATION_SEC) * 100 : 0;

  // ── Save attempt ─────────────────────────────────────────────────────────
  const saveAttempt = () => {
    if (accel.maxMag == null || selectedMovement == null) return;
    const mag = accel.maxMag;
    const rating = getRating(mag);
    const outcome = `${mag.toFixed(3)} G — ${rating.label}`;

    const result: AttemptResult = {
      attemptNumber,
      memberName: currentMember,
      movementLabel: selectedMovement.label,
      prediction,
      peakMag: mag,
      outcome,
      wasRight,
      ratingLabel: rating.label,
      ratingColor: rating.color,
    };

    const updated = [...results, result];
    setResults(updated);

    const allMags = updated.map((r) => r.peakMag);
    const avg = allMags.reduce((a, b) => a + b) / allMags.length;
    const peak = Math.max(...allMags);

    onUpdate({
      vibrationProxy: Math.round(avg * 1000) / 1000,
      accelMagnitudeMax: Math.round(peak * 1000) / 1000,
      attemptLabel: `${currentMember} - ${selectedMovement.label}`,
      prediction,
      result: outcome,
      allAttempts: JSON.stringify(
        updated.map((r) => ({
          attempt: r.attemptNumber,
          member: r.memberName,
          movement: r.movementLabel,
          prediction: r.prediction,
          peakG: r.peakMag,
          outcome: r.outcome,
          wasRight: r.wasRight,
          rating: r.ratingLabel,
        }))
      ),
    });

    // Reset for next member
    setPrediction("");
    setWasRight(null);
    setSelectedMovement(null);
    setAttemptStep("pick_movement");

    // Count how many movements this member has now done
    const memberDoneCount = updated.filter(
      (r) => r.memberName === currentMember
    ).length;

    if (memberDoneCount < MOVEMENTS.length) {
      // Same member, more movements to do
      setAttemptStep("pick_movement");
    } else if (memberIndex < memberNames.length - 1) {
      // Move to next member
      setMemberIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  // ── Intro screen ─────────────────────────────────────────────────────────
  if (!started) {
    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">🏃 Human Performance Lab</StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          {DESCRIPTION}
        </StemText>
        {ttsEnabled && speak && isSpeaking && (
          <SpeakButton
            id="perf-desc"
            text={DESCRIPTION}
            isSpeaking={isSpeaking("perf-desc")}
            onPress={() => speak("perf-desc", DESCRIPTION)}
          />
        )}
        <StemText variant="small" style={{ color: t.colors.muted }}>
          {memberNames.length} member(s) · 1 movement each · {SAMPLE_DURATION_SEC}s sample
        </StemText>

        {/* Preview all 3 movements */}
        {MOVEMENTS.map((m) => (
          <View key={m.index} style={[styles.movementBox, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
            <StemText variant="body" style={{ fontWeight: "bold" }}>
              {m.emoji} {m.label}
            </StemText>
            <StemText variant="small" style={{ color: t.colors.muted }}>
              {simple ? m.instructionSimple : m.instruction}
            </StemText>
          </View>
        ))}

        <StemButton title="Start Lab" onPress={() => setStarted(true)} />
      </View>
    );
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    const byMovement: Record<string, number[]> = {};
    for (const r of results) {
      if (!byMovement[r.movementLabel]) byMovement[r.movementLabel] = [];
      byMovement[r.movementLabel].push(r.peakMag);
    }
    const hardest = Object.entries(byMovement)
      .map(([label, mags]) => ({ label, avg: mags.reduce((a, b) => a + b) / mags.length }))
      .sort((a, b) => b.avg - a.avg)[0];

    const byMember: Record<string, number[]> = {};
    for (const r of results) {
      if (!byMember[r.memberName]) byMember[r.memberName] = [];
      byMember[r.memberName].push(r.peakMag);
    }
    const bestMember = Object.entries(byMember)
      .map(([name, mags]) => ({ name, avg: mags.reduce((a, b) => a + b) / mags.length }))
      .sort((a, b) => a.avg - b.avg)[0];

    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">✅ Lab Complete</StemText>

        {hardest && (
          <View style={[styles.highlightBox, { borderColor: t.colors.warning, backgroundColor: t.colors.warning + "18" }]}>
            <StemText variant="small" style={{ fontWeight: "bold", color: t.colors.warning }}>
              📳 Hardest to keep vibration low:
            </StemText>
            <StemText variant="small" style={{ color: t.colors.warning }}>
              {hardest.label} (avg {hardest.avg.toFixed(3)} G)
            </StemText>
          </View>
        )}
        {bestMember && memberNames.length > 1 && (
          <View style={[styles.highlightBox, { borderColor: t.colors.success, backgroundColor: t.colors.success + "18" }]}>
            <StemText variant="small" style={{ fontWeight: "bold", color: t.colors.success }}>
              🏆 Smoothest performer:
            </StemText>
            <StemText variant="small" style={{ color: t.colors.success }}>
              {bestMember.name} (avg {bestMember.avg.toFixed(3)} G)
            </StemText>
          </View>
        )}

        {/* Results table */}
        <StemText variant="body" style={{ fontWeight: "bold", marginTop: 8 }}>All Results</StemText>
        <View style={[styles.tableHeader, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={[styles.colNum, styles.bold]}>#</StemText>
          <StemText variant="small" style={[styles.colMember, styles.bold]}>Member</StemText>
          <StemText variant="small" style={[styles.colMovement, styles.bold]}>Movement</StemText>
          <StemText variant="small" style={[styles.colPredict, styles.bold]}>Prediction</StemText>
          <StemText variant="small" style={[styles.colOutcome, styles.bold]}>Outcome</StemText>
          <StemText variant="small" style={[styles.colRight, styles.bold]}>✓?</StemText>
        </View>
        {results.map((r, i) => (
          <View key={i} style={[styles.tableRow, { borderColor: t.colors.border }]}>
            <StemText variant="small" style={styles.colNum}>{r.attemptNumber}</StemText>
            <StemText variant="small" style={styles.colMember}>{r.memberName}</StemText>
            <StemText variant="small" style={[styles.colMovement, { color: t.colors.primary }]}>
              {r.movementLabel.split("—")[0]}
            </StemText>
            <StemText variant="small" style={styles.colPredict}>{r.prediction || "—"}</StemText>
            <StemText variant="small" style={[styles.colOutcome, { color: r.ratingColor }]}>
              {r.outcome}
            </StemText>
            <StemText variant="small" style={[styles.colRight, {
              color: r.wasRight === true ? "#4ade80" : r.wasRight === false ? "#ef4444" : t.colors.muted,
            }]}>
              {r.wasRight === true ? "✅" : r.wasRight === false ? "❌" : "—"}
            </StemText>
          </View>
        ))}

        <StemButton
          title="Restart"
          variant="secondary"
          onPress={() => {
            setStarted(false);
            setDone(false);
            setMemberIndex(0);
            setSelectedMovement(null);
            setAttemptStep("pick_movement");
            setResults([]);
            setPrediction("");
            setWasRight(null);
          }}
        />
      </View>
    );
  }

  // ── Active attempt ────────────────────────────────────────────────────────
  const rating = accel.maxMag != null ? getRating(accel.maxMag) : null;

  return (
    <View style={[styles.box, { borderColor: t.colors.border }]}>
      <StemText variant="h2">🏃 Human Performance Lab</StemText>

      {/* Progress */}
      <View style={[styles.progressBar, { backgroundColor: t.colors.card }]}>
        <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>
          👤 {currentMember} ({memberIndex + 1}/{memberNames.length})
        </StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          Movement {results.filter((r) => r.memberName === currentMember).length + 1} of {MOVEMENTS.length}
        </StemText>
      </View>

      {/* ── Step 0: Pick movement ── */}
      {attemptStep === "pick_movement" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Pick a movement 🎯
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            {currentMember}, choose which movement you want to do:
          </StemText>
          {MOVEMENTS.map((m) => {
          const alreadyDone = results.some(
            (r) => r.memberName === currentMember && r.movementLabel === m.label
          );
          return (
            <StemButton
              key={m.index}
              title={alreadyDone ? `${m.emoji} ${m.label} ✅ Done` : `${m.emoji} ${m.label}`}
              variant={selectedMovement?.index === m.index ? "primary" : "secondary"}
              onPress={() => !alreadyDone && setSelectedMovement(m)}
              disabled={alreadyDone}
            />
          );
        })}
          <StemButton
            title="Confirm movement →"
            onPress={() => setAttemptStep("predict")}
            disabled={selectedMovement == null}
          />
        </View>
      )}

      {/* Show selected movement instruction */}
      {selectedMovement && attemptStep !== "pick_movement" && (
        <View style={[styles.movementBox, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
          <StemText variant="small" style={{ fontWeight: "bold" }}>
            {selectedMovement.emoji} {selectedMovement.label}
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            {simple ? selectedMovement.instructionSimple : selectedMovement.instruction}
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted, fontStyle: "italic" }}>
            💡 {selectedMovement.tip}
          </StemText>
        </View>
      )}

      {/* ── Step 1: Predict ── */}
      {attemptStep === "predict" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 1 — Predict 🔮
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            {simple
              ? "Will the phone vibrate a lot or a little?"
              : "Predict the phone vibration reading (e.g. Low / 0.2G / very smooth)"}
          </StemText>
          <TextInput
            style={[styles.input, {
              borderColor: t.colors.border,
              color: t.colors.text,
              backgroundColor: t.colors.card,
            }]}
            placeholder="e.g. Low vibration, around 0.2G"
            placeholderTextColor={t.colors.muted}
            value={prediction}
            onChangeText={setPrediction}
          />
          <StemButton
            title="Start measuring →"
            onPress={() => setAttemptStep("measure")}
            disabled={prediction.trim().length === 0}
          />
        </View>
      )}

      {/* ── Step 2: Measure ── */}
      {attemptStep === "measure" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 2 — Measure 📡
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            Press start then perform the movement for {SAMPLE_DURATION_SEC} seconds.
          </StemText>

          {accel.sampling && (
            <View style={[styles.samplingBox, { borderColor: t.colors.primary }]}>
              <StemText variant="h1" style={{ color: t.colors.primary, textAlign: "center", fontSize: 52 }}>
                {countdown}s
              </StemText>
              <StemText variant="small" style={{ color: t.colors.primary, textAlign: "center" }}>
                📡 Keep moving…
              </StemText>
              <View style={[styles.progressTrack, { backgroundColor: t.colors.border }]}>
                <View style={[styles.progressFill, {
                  backgroundColor: t.colors.primary,
                  width: `${100 - countdownPct}%` as any,
                }]} />
              </View>
            </View>
          )}

          {accel.maxMag != null && !accel.sampling && rating && (
            <View style={[styles.resultBox, { borderColor: rating.color, backgroundColor: rating.color + "18" }]}>
              <StemText variant="h1" style={{ color: rating.color, textAlign: "center", fontSize: 44 }}>
                {accel.maxMag.toFixed(3)} G
              </StemText>
              <StemText variant="small" style={{ color: rating.color, textAlign: "center" }}>
                {rating.emoji} {rating.label}
              </StemText>
            </View>
          )}

          <View style={{ gap: 8 }}>
            {!accel.sampling && accel.maxMag == null && (
              <StemButton
                title={`▶ Start ${SAMPLE_DURATION_SEC}s sample`}
                onPress={() => accel.start(SAMPLE_DURATION_SEC * 1000)}
              />
            )}
            {!accel.sampling && accel.maxMag != null && (
              <>
                <StemButton title="🔁 Retry" variant="secondary" onPress={() => accel.start(SAMPLE_DURATION_SEC * 1000)} />
                <StemButton title="Compare result →" onPress={() => setAttemptStep("compare")} />
              </>
            )}
            {accel.sampling && <StemButton title={`Sampling… ${countdown}s left`} disabled />}
          </View>
        </View>
      )}

      {/* ── Step 3: Compare ── */}
      {attemptStep === "compare" && accel.maxMag != null && rating && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 3 — Were you right? 🎯
          </StemText>
          <View style={styles.compareRow}>
            <View style={[styles.compareBox, { borderColor: t.colors.border, backgroundColor: t.colors.card }]}>
              <StemText variant="small" style={{ color: t.colors.muted, fontWeight: "bold" }}>Your prediction</StemText>
              <StemText variant="small">{prediction}</StemText>
            </View>
            <View style={[styles.compareBox, { borderColor: rating.color, backgroundColor: rating.color + "18" }]}>
              <StemText variant="small" style={{ color: rating.color, fontWeight: "bold" }}>Outcome</StemText>
              <StemText variant="small" style={{ color: rating.color }}>
                {accel.maxMag.toFixed(3)} G{"\n"}{rating.emoji} {rating.label}
              </StemText>
            </View>
          </View>

          <StemText variant="small" style={{ color: t.colors.muted }}>
            Was your prediction correct?
          </StemText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton title="✅ Yes" variant={wasRight === true ? "primary" : "secondary"} onPress={() => setWasRight(true)} />
            <StemButton title="❌ No" variant={wasRight === false ? "primary" : "secondary"} onPress={() => setWasRight(false)} />
          </View>
          <StemButton title="Save & next →" onPress={saveAttempt} disabled={wasRight === null} />
        </View>
      )}

      {/* Results so far */}
      {results.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 4 }}>Results so far:</StemText>
          {results.map((r, i) => {
            const rr = getRating(r.peakMag);
            return (
              <StemText key={i} variant="small" style={{ color: rr.color }}>
                {rr.emoji} {r.memberName} — {r.movementLabel.split("—")[0].trim()}: {r.peakMag.toFixed(3)} G · {r.wasRight === true ? "✅" : r.wasRight === false ? "❌" : "—"}
              </StemText>
            );
          })}
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
  progressBar: {
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  movementBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  stepBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  resultBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  samplingBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  compareRow: {
    flexDirection: "row",
    gap: 8,
  },
  compareBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  highlightBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  tableHeader: {
    flexDirection: "row",
    padding: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "flex-start",
  },
  colNum: { width: 20 },
  colMember: { width: 55 },
  colMovement: { width: 55 },
  colPredict: { flex: 1 },
  colOutcome: { flex: 1 },
  colRight: { width: 28, textAlign: "center" },
  bold: { fontWeight: "bold" },
});