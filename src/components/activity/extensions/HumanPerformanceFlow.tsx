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
  speedLabel: string;
  durationSec: number;
  prediction: string;
  peakMag: number;
  outcome: string;
  wasRight: boolean | null;
  ratingLabel: string;
  ratingColor: string;
}

type AttemptStep = "predict" | "measure" | "compare";

// ── Speed attempts — same movement at 3 speeds ─────────────────────────────────
const SPEED_ATTEMPTS = [
  {
    index: 1,
    speedLabel: "Slow",
    durationSec: 20,
    instruction: "Perform the movement as slowly and smoothly as possible over 20 seconds.",
    instructionSimple: "Move really slowly for 20 seconds. Try not to wobble!",
    tip: "Slow movements should have the lowest vibration.",
  },
  {
    index: 2,
    speedLabel: "Medium",
    durationSec: 10,
    instruction: "Perform the same movement at a medium pace over 10 seconds.",
    instructionSimple: "Move at a normal speed for 10 seconds.",
    tip: "Does medium speed feel harder to control than slow?",
  },
  {
    index: 3,
    speedLabel: "Fast",
    durationSec: 5,
    instruction: "Perform the same movement as quickly as you can over 5 seconds.",
    instructionSimple: "Move fast for 5 seconds!",
    tip: "Faster movements usually cause more vibration — less control.",
  },
];

// ── The movement everyone does ─────────────────────────────────────────────────
const BASE_MOVEMENT =
  "Raise your arm slowly from your side to above your head, then back down.";
const BASE_MOVEMENT_SIMPLE =
  "Lift your arm up and back down again.";

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
  "Do the same arm movement at 3 different speeds. See how speed affects vibration and smoothness.";

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
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [attemptStep, setAttemptStep] = useState<AttemptStep>("predict");
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [done, setDone] = useState(false);

  // Per-attempt state
  const [prediction, setPrediction] = useState("");
  const [wasRight, setWasRight] = useState<boolean | null>(null);

  const accel = useAccelSample();
  const currentMember = memberNames[memberIndex] ?? "Member 1";
  const currentAttempt = SPEED_ATTEMPTS[attemptIndex];
  const attemptNumber = results.length + 1;

  // Countdown timer — only active while sampling
  const countdown = useCountdown(currentAttempt.durationSec, accel.sampling);

  // Progress percentage for countdown bar
  const countdownPct = accel.sampling
    ? (countdown / currentAttempt.durationSec) * 100
    : 0;

  // ── Save attempt ─────────────────────────────────────────────────────────
  const saveAttempt = () => {
    if (accel.maxMag == null) return;
    const mag = accel.maxMag;
    const rating = getRating(mag);
    const outcome = `${mag.toFixed(3)} G in ${currentAttempt.durationSec}s — ${rating.label}`;

    const result: AttemptResult = {
      attemptNumber,
      memberName: currentMember,
      speedLabel: currentAttempt.speedLabel,
      durationSec: currentAttempt.durationSec,
      prediction,
      peakMag: mag,
      outcome,
      wasRight,
      ratingLabel: rating.label,
      ratingColor: rating.color,
    };

    const updated = [...results, result];
    setResults(updated);

    // Aggregate across ALL attempts from ALL members
    const allMags = updated.map((r) => r.peakMag);
    const avg = allMags.reduce((a, b) => a + b) / allMags.length;
    const peak = Math.max(...allMags);

    onUpdate({
      vibrationProxy: Math.round(avg * 1000) / 1000,
      accelMagnitudeMax: Math.round(peak * 1000) / 1000,
      attemptLabel: `${currentMember} - ${currentAttempt.speedLabel} (${currentAttempt.durationSec}s)`,
      prediction,
      result: outcome,
      allAttempts: JSON.stringify(
        updated.map((r) => ({
          attempt: r.attemptNumber,
          member: r.memberName,
          speed: r.speedLabel,
          durationSec: r.durationSec,
          prediction: r.prediction,
          peakG: r.peakMag,
          outcome: r.outcome,
          wasRight: r.wasRight,
          rating: r.ratingLabel,
        }))
      ),
    });

    // Reset for next attempt
    setPrediction("");
    setWasRight(null);
    setAttemptStep("predict");

    // Advance speed attempt → member → done
    if (attemptIndex < SPEED_ATTEMPTS.length - 1) {
      setAttemptIndex((i) => i + 1);
    } else if (memberIndex < memberNames.length - 1) {
      setAttemptIndex(0);
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
        <View style={[styles.movementBox, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            The movement:
          </StemText>
          <StemText variant="body">
            {simple ? BASE_MOVEMENT_SIMPLE : BASE_MOVEMENT}
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted, marginTop: 4 }}>
            You'll do this 3 times — slow (20s), medium (10s), fast (5s).
          </StemText>
        </View>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          {memberNames.length} member(s) · 3 speed attempts each
        </StemText>
        <StemButton title="Start Lab" onPress={() => setStarted(true)} />
      </View>
    );
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    // Which speed was hardest (highest avg G)
    const bySpeed: Record<string, number[]> = {};
    for (const r of results) {
      if (!bySpeed[r.speedLabel]) bySpeed[r.speedLabel] = [];
      bySpeed[r.speedLabel].push(r.peakMag);
    }
    const speedAvgs = Object.entries(bySpeed).map(([label, mags]) => ({
      label,
      avg: mags.reduce((a, b) => a + b) / mags.length,
    }));
    const hardest = [...speedAvgs].sort((a, b) => b.avg - a.avg)[0];
    const smoothest = [...speedAvgs].sort((a, b) => a.avg - b.avg)[0];

    // Per member avg
    const byMember: Record<string, number[]> = {};
    for (const r of results) {
      if (!byMember[r.memberName]) byMember[r.memberName] = [];
      byMember[r.memberName].push(r.peakMag);
    }
    const memberAvgs = Object.entries(byMember).map(([name, mags]) => ({
      name,
      avg: mags.reduce((a, b) => a + b) / mags.length,
    }));
    const bestMember = [...memberAvgs].sort((a, b) => a.avg - b.avg)[0];

    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">✅ Lab Complete</StemText>

        {/* Key findings */}
        {hardest && (
          <View style={[styles.highlightBox, { borderColor: t.colors.warning, backgroundColor: t.colors.warning + "18" }]}>
            <StemText variant="small" style={{ fontWeight: "bold", color: t.colors.warning }}>
              📳 Hardest speed to keep smooth:
            </StemText>
            <StemText variant="small" style={{ color: t.colors.warning }}>
              {hardest.label} speed (avg {hardest.avg.toFixed(3)} G)
            </StemText>
          </View>
        )}
        {smoothest && (
          <View style={[styles.highlightBox, { borderColor: t.colors.success, backgroundColor: t.colors.success + "18" }]}>
            <StemText variant="small" style={{ fontWeight: "bold", color: t.colors.success }}>
              🌊 Smoothest speed:
            </StemText>
            <StemText variant="small" style={{ color: t.colors.success }}>
              {smoothest.label} speed (avg {smoothest.avg.toFixed(3)} G)
            </StemText>
          </View>
        )}
        {bestMember && memberNames.length > 1 && (
          <View style={[styles.highlightBox, { borderColor: t.colors.primary, backgroundColor: t.colors.primary + "18" }]}>
            <StemText variant="small" style={{ fontWeight: "bold", color: t.colors.primary }}>
              🏆 Smoothest performer:
            </StemText>
            <StemText variant="small" style={{ color: t.colors.primary }}>
              {bestMember.name} (avg {bestMember.avg.toFixed(3)} G)
            </StemText>
          </View>
        )}

        {/* Full results table */}
        <StemText variant="body" style={{ fontWeight: "bold", marginTop: 8 }}>
          All Results
        </StemText>
        <View style={[styles.tableHeader, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={[styles.colNum, styles.bold]}>#</StemText>
          <StemText variant="small" style={[styles.colMember, styles.bold]}>Member</StemText>
          <StemText variant="small" style={[styles.colSpeed, styles.bold]}>Speed</StemText>
          <StemText variant="small" style={[styles.colPredict, styles.bold]}>Prediction</StemText>
          <StemText variant="small" style={[styles.colOutcome, styles.bold]}>Outcome</StemText>
          <StemText variant="small" style={[styles.colRight, styles.bold]}>✓?</StemText>
        </View>
        {results.map((r, i) => (
          <View key={i} style={[styles.tableRow, { borderColor: t.colors.border }]}>
            <StemText variant="small" style={styles.colNum}>{r.attemptNumber}</StemText>
            <StemText variant="small" style={styles.colMember}>{r.memberName}</StemText>
            <StemText variant="small" style={[styles.colSpeed, { color: t.colors.primary }]}>
              {r.speedLabel}{"\n"}({r.durationSec}s)
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
            setAttemptIndex(0);
            setAttemptStep("predict");
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
          {currentAttempt.speedLabel} speed — {currentAttempt.durationSec}s
        </StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          👤 {currentMember} ({memberIndex + 1}/{memberNames.length}) · Attempt {attemptNumber} of {memberNames.length * SPEED_ATTEMPTS.length}
        </StemText>
        {/* Speed progress dots */}
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
          {SPEED_ATTEMPTS.map((a, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < attemptIndex
                      ? t.colors.success
                      : i === attemptIndex
                      ? t.colors.primary
                      : t.colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Movement reminder */}
      <View style={[styles.movementBox, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
        <StemText variant="small" style={{ color: t.colors.muted, fontWeight: "bold" }}>
          Movement:
        </StemText>
        <StemText variant="small">
          {simple ? BASE_MOVEMENT_SIMPLE : BASE_MOVEMENT}
        </StemText>
      </View>

      {/* Speed instruction */}
      <StemText variant="body">
        {simple ? currentAttempt.instructionSimple : currentAttempt.instruction}
      </StemText>
      <StemText variant="small" style={{ color: t.colors.muted, fontStyle: "italic" }}>
        💡 {currentAttempt.tip}
      </StemText>

      {/* ── Step 1: Predict ── */}
      {attemptStep === "predict" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 1 — Predict 🔮
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            {simple
              ? "Will the phone vibrate a lot or a little at this speed?"
              : `Predict the vibration for the ${currentAttempt.speedLabel.toLowerCase()} speed attempt (e.g. Low / 0.2G / very smooth)`}
          </StemText>
          <TextInput
            style={[styles.input, {
              borderColor: t.colors.border,
              color: t.colors.text,
              backgroundColor: t.colors.card,
            }]}
            placeholder={
              currentAttempt.speedLabel === "Slow"
                ? "e.g. Very smooth, low vibration around 0.1G"
                : currentAttempt.speedLabel === "Medium"
                ? "e.g. Some vibration, around 0.3G"
                : "e.g. High vibration, hard to control"
            }
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
            Press start, then perform the movement for {currentAttempt.durationSec} seconds.
          </StemText>

          {/* Countdown + progress bar */}
          {accel.sampling && (
            <View style={[styles.samplingBox, { borderColor: t.colors.primary }]}>
              <StemText variant="h1" style={{ color: t.colors.primary, textAlign: "center", fontSize: 52 }}>
                {countdown}s
              </StemText>
              <StemText variant="small" style={{ color: t.colors.primary, textAlign: "center" }}>
                📡 Keep moving… {currentAttempt.speedLabel} pace
              </StemText>
              {/* Progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: t.colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: t.colors.primary,
                      width: `${100 - countdownPct}%` as any,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Result after sampling */}
          {accel.maxMag != null && !accel.sampling && rating && (
            <View style={[styles.resultBox, { borderColor: rating.color, backgroundColor: rating.color + "18" }]}>
              <StemText variant="h1" style={{ color: rating.color, textAlign: "center", fontSize: 44 }}>
                {accel.maxMag.toFixed(3)} G
              </StemText>
              <StemText variant="small" style={{ color: rating.color, textAlign: "center" }}>
                {rating.emoji} {rating.label} · in {currentAttempt.durationSec}s
              </StemText>
            </View>
          )}

          <View style={{ gap: 8 }}>
            {!accel.sampling && accel.maxMag == null && (
              <StemButton
                title={`▶ Start ${currentAttempt.durationSec}s sample`}
                onPress={() => accel.start(currentAttempt.durationSec * 1000)}
              />
            )}
            {!accel.sampling && accel.maxMag != null && (
              <>
                <StemButton
                  title="🔁 Retry"
                  variant="secondary"
                  onPress={() => accel.start(currentAttempt.durationSec * 1000)}
                />
                <StemButton
                  title="Compare result →"
                  onPress={() => setAttemptStep("compare")}
                />
              </>
            )}
            {accel.sampling && (
              <StemButton title={`Sampling… ${countdown}s left`} disabled />
            )}
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
              <StemText variant="small" style={{ color: t.colors.muted, fontWeight: "bold" }}>
                Your prediction
              </StemText>
              <StemText variant="small">{prediction}</StemText>
            </View>
            <View style={[styles.compareBox, { borderColor: rating.color, backgroundColor: rating.color + "18" }]}>
              <StemText variant="small" style={{ color: rating.color, fontWeight: "bold" }}>
                Outcome
              </StemText>
              <StemText variant="small" style={{ color: rating.color }}>
                {accel.maxMag.toFixed(3)} G in {currentAttempt.durationSec}s{"\n"}{rating.emoji} {rating.label}
              </StemText>
            </View>
          </View>

          <StemText variant="small" style={{ color: t.colors.muted }}>
            Was your prediction correct?
          </StemText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton
              title="✅ Yes"
              variant={wasRight === true ? "primary" : "secondary"}
              onPress={() => setWasRight(true)}
            />
            <StemButton
              title="❌ No"
              variant={wasRight === false ? "primary" : "secondary"}
              onPress={() => setWasRight(false)}
            />
          </View>

          <StemButton
            title="Save & next →"
            onPress={saveAttempt}
            disabled={wasRight === null}
          />
        </View>
      )}

      {/* Results so far */}
      {results.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 4 }}>
            Results so far:
          </StemText>
          {results.map((r, i) => {
            const rr = getRating(r.peakMag);
            return (
              <StemText key={i} variant="small" style={{ color: rr.color }}>
                {rr.emoji} {r.memberName} — {r.speedLabel} ({r.durationSec}s): {r.peakMag.toFixed(3)} G · {r.wasRight === true ? "✅" : r.wasRight === false ? "❌" : "—"}
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  colSpeed: { width: 50 },
  colPredict: { flex: 1 },
  colOutcome: { flex: 1 },
  colRight: { width: 28, textAlign: "center" },
  bold: { fontWeight: "bold" },
});