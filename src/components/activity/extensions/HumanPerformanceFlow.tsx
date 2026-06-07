import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useAccelSample } from "@/hooks/useAccelSample";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

// ── Types ──────────────────────────────────────────────────────────────────────
interface MovementResult {
  movementIndex: number;
  label: string;
  peakMag: number;
  rating: string;
}

interface MemberResult {
  name: string;
  movements: MovementResult[];
}

// ── Movement definitions (3 per spec diagram) ──────────────────────────────────
const MOVEMENTS = [
  {
    index: 1,
    label: "Movement 1 — Slow arm raise",
    instruction: "Hold the phone firmly. Slowly raise your arm from your side to above your head. Move as smoothly as possible.",
    instructionSimple: "Hold phone and slowly lift your arm up. Go as smooth as you can!",
    tip: "The lower the vibration, the smoother your movement.",
  },
  {
    index: 2,
    label: "Movement 2 — Side stretch",
    instruction: "Stand straight. Slowly lean to one side, stretching your arm over your head. Hold for 2 seconds then return.",
    instructionSimple: "Stretch sideways slowly. Try not to wobble!",
    tip: "Keep your core steady to reduce vibration.",
  },
  {
    index: 3,
    label: "Movement 3 — Forward reach",
    instruction: "Extend your arm forward slowly from your chest. Reach as far as comfortable. Return slowly.",
    instructionSimple: "Reach forward slowly like you are picking something up far away.",
    tip: "Faster movements will show higher vibration — try to go slow and controlled.",
  },
];

// ── Vibration rating ───────────────────────────────────────────────────────────
function getRating(mag: number): { label: string; color: string; emoji: string } {
  // mag is in G-force units from accelerometer
  // ~1.0 is gravity baseline, movement adds on top
  const movement = Math.max(0, mag - 1.0);
  if (movement < 0.15) return { label: "Very smooth", color: "#4ade80", emoji: "🌊" };
  if (movement < 0.35) return { label: "Smooth", color: "#86efac", emoji: "✅" };
  if (movement < 0.6)  return { label: "Moderate", color: "#fde68a", emoji: "⚠️" };
  if (movement < 1.0)  return { label: "Shaky", color: "#fb923c", emoji: "📳" };
  return { label: "Very shaky", color: "#ef4444", emoji: "🔴" };
}

const DESCRIPTION =
  "Hold the phone during each movement. The app measures vibration to show how smooth and controlled your motion is. Lower vibration means better coordination.";

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
  const [movementIndex, setMovementIndex] = useState(0);
  const [allResults, setAllResults] = useState<MemberResult[]>(
    memberNames.map((name) => ({ name, movements: [] }))
  );
  const [done, setDone] = useState(false);

  const accel = useAccelSample();
  const currentMember = allResults[memberIndex];
  const currentMovement = MOVEMENTS[movementIndex];

  const saveAggregate = (updated: MemberResult[]) => {
    // Average peak vibration across all members and movements
    const allMags = updated.flatMap((m) => m.movements.map((mv) => mv.peakMag));
    if (allMags.length > 0) {
      const avg = allMags.reduce((a, b) => a + b) / allMags.length;
      onUpdate({
        vibrationProxy: Math.round(avg * 1000) / 1000,
        accelMagnitudeMax: Math.round(Math.max(...allMags) * 1000) / 1000,
      });
    }
  };

  const handleSaveMovement = () => {
    if (accel.maxMag == null) return;
    const mag = accel.maxMag;
    const rating = getRating(mag);
    const result: MovementResult = {
      movementIndex: currentMovement.index,
      label: currentMovement.label,
      peakMag: mag,
      rating: rating.label,
    };

    const updated = allResults.map((r, i) =>
      i === memberIndex
        ? { ...r, movements: [...r.movements, result] }
        : r
    );
    setAllResults(updated);
    saveAggregate(updated);

    // Move to next movement or next member or done
    if (movementIndex < MOVEMENTS.length - 1) {
      setMovementIndex((i) => i + 1);
    } else if (memberIndex < memberNames.length - 1) {
      setMovementIndex(0);
      setMemberIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

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
        <StemText variant="small" style={{ color: t.colors.muted, marginTop: 4 }}>
          Each member will perform 3 movements while holding the phone.
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
            {/* Header */}
            <View style={[styles.tableHeader, { backgroundColor: t.colors.card }]}>
              <StemText variant="small" style={[styles.colMove, { fontWeight: "bold" }]}>Movement</StemText>
              <StemText variant="small" style={[styles.colMag, { fontWeight: "bold" }]}>Peak (G)</StemText>
              <StemText variant="small" style={[styles.colRating, { fontWeight: "bold" }]}>Rating</StemText>
            </View>
            {member.movements.map((mv, mvi) => {
              const rating = getRating(mv.peakMag);
              return (
                <View key={mvi} style={[styles.tableRow, { borderColor: t.colors.border }]}>
                  <StemText variant="small" style={styles.colMove}>M{mv.movementIndex}</StemText>
                  <StemText variant="small" style={[styles.colMag, { color: rating.color, fontWeight: "bold" }]}>
                    {mv.peakMag.toFixed(3)}
                  </StemText>
                  <StemText variant="small" style={[styles.colRating, { color: rating.color }]}>
                    {rating.emoji} {rating.label}
                  </StemText>
                </View>
              );
            })}
          </View>
        ))}

        {/* Best performer */}
        {(() => {
          const withAvg = allResults
            .filter((r) => r.movements.length > 0)
            .map((r) => ({
              name: r.name,
              avg: r.movements.reduce((a, b) => a + b.peakMag, 0) / r.movements.length,
            }));
          const best = withAvg.reduce((a, b) => (a.avg < b.avg ? a : b), withAvg[0]);
          return best ? (
            <StemText variant="small" style={{ color: t.colors.success, marginTop: 8 }}>
              🏆 Smoothest performer: {best.name} (avg {best.avg.toFixed(3)} G)
            </StemText>
          ) : null;
        })()}

        <StemButton
          title="Restart"
          variant="secondary"
          onPress={() => {
            setStarted(false);
            setDone(false);
            setMemberIndex(0);
            setMovementIndex(0);
            setAllResults(memberNames.map((name) => ({ name, movements: [] })));
          }}
        />
      </View>
    );
  }

  // ── Active measurement screen ──────────────────────────────────────────────
  const rating = accel.maxMag != null ? getRating(accel.maxMag) : null;

  return (
    <View style={[styles.box, { borderColor: t.colors.border }]}>
      <StemText variant="h2">🏃 Human Performance Lab</StemText>

      {/* Progress indicator */}
      <View style={[styles.progressBar, { backgroundColor: t.colors.card }]}>
        <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>
          {currentMovement.label}
        </StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          👤 {currentMember?.name} ({memberIndex + 1}/{memberNames.length}) · Movement {movementIndex + 1}/3
        </StemText>
      </View>

      {/* Instruction */}
      <StemText variant="body" style={{ marginTop: 4 }}>
        {simple ? currentMovement.instructionSimple : currentMovement.instruction}
      </StemText>
      <StemText variant="small" style={{ color: t.colors.muted, fontStyle: "italic" }}>
        💡 {currentMovement.tip}
      </StemText>

      {/* Sensor readout */}
      {accel.maxMag != null && rating && (
        <View style={[styles.resultBox, { borderColor: rating.color, backgroundColor: rating.color + "18" }]}>
          <StemText variant="h1" style={{ color: rating.color, textAlign: "center", fontSize: 44 }}>
            {accel.maxMag.toFixed(3)} G
          </StemText>
          <StemText variant="small" style={{ color: rating.color, textAlign: "center" }}>
            {rating.emoji} {rating.label}
          </StemText>
        </View>
      )}

      {/* Sampling state */}
      {accel.sampling && (
        <View style={[styles.samplingBox, { borderColor: t.colors.primary }]}>
          <StemText variant="body" style={{ color: t.colors.primary, textAlign: "center" }}>
            📡 Measuring… perform your movement now
          </StemText>
        </View>
      )}

      {/* Buttons */}
      <View style={{ gap: 8, marginTop: 8 }}>
        {!accel.sampling && accel.maxMag == null && (
          <StemButton
            title="▶ Start 2.5s Sample"
            onPress={() => accel.start(2500)}
          />
        )}
        {!accel.sampling && accel.maxMag != null && (
          <>
            <StemButton
              title="🔁 Retry movement"
              variant="secondary"
              onPress={() => accel.start(2500)}
            />
            <StemButton
              title="Save & next"
              onPress={handleSaveMovement}
            />
          </>
        )}
        {accel.sampling && (
          <StemButton
            title="Sampling…"
            disabled
          />
        )}
      </View>

      {/* Previous results this session */}
      {currentMember && currentMember.movements.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 4 }}>
            {currentMember.name}'s results so far:
          </StemText>
          {currentMember.movements.map((mv, i) => {
            const r = getRating(mv.peakMag);
            return (
              <StemText key={i} variant="small" style={{ color: r.color }}>
                {r.emoji} M{mv.movementIndex}: {mv.peakMag.toFixed(3)} G — {r.label}
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
  resultBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginVertical: 8,
  },
  samplingBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    borderStyle: "dashed",
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
  },
  colMove: { width: 40 },
  colMag: { width: 80 },
  colRating: { flex: 1 },
});