import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useAccelSample } from "@/hooks/useAccelSample";
import { useStemTheme } from "@/theme/ThemeProvider";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DesignResult {
  designNumber: number;
  folds: number;
  pillars: number;
  peakMag: number;
  rating: string;
  ratingColor: string;
}

// ── Vibration rating ───────────────────────────────────────────────────────────
function getRating(mag: number): { label: string; color: string; emoji: string } {
  const movement = Math.max(0, mag - 1.0);
  if (movement < 0.2)  return { label: "Very stable", color: "#4ade80", emoji: "🏆" };
  if (movement < 0.5)  return { label: "Stable",      color: "#86efac", emoji: "✅" };
  if (movement < 0.9)  return { label: "Moderate",    color: "#fde68a", emoji: "⚠️" };
  if (movement < 1.5)  return { label: "Shaky",       color: "#fb923c", emoji: "📳" };
  return                      { label: "Very shaky",  color: "#ef4444", emoji: "🔴" };
}

const MAX_DESIGNS = 3;

const DESCRIPTION =
  "Build an anti-vibration structure, place the phone on top, then shake the table to simulate an earthquake. Lower vibration means a better design.";

// ── Main Component ─────────────────────────────────────────────────────────────
export function EarthquakeFlow({
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
  const accel = useAccelSample();

  const [designs, setDesigns] = useState<DesignResult[]>([]);
  const [currentDesign, setCurrentDesign] = useState(1);
  const [folds, setFolds] = useState(0);
  const [pillars, setPillars] = useState(0);
  const [done, setDone] = useState(false);

  const isWebUnsupported = Platform.OS === "web";

  const saveDesign = () => {
    if (accel.maxMag == null) return;
    const rating = getRating(accel.maxMag);
    const result: DesignResult = {
      designNumber: currentDesign,
      folds,
      pillars,
      peakMag: accel.maxMag,
      rating: rating.label,
      ratingColor: rating.color,
    };

    const updated = [...designs, result];
    setDesigns(updated);

    // this to save to activity engine
    
    const best = updated.reduce((a, b) => (a.peakMag < b.peakMag ? a : b));
    // Inside saveDesign, change your multiplier to 100
    const rawMovement = Math.max(0, best.peakMag - 1.0);

    const calculatedScore = Math.min(10, Math.round(rawMovement * 6.66));

    onUpdate({
      accelMagnitudeMax: Math.round(best.peakMag * 1000) / 1000,
      movementAmount: calculatedScore, // This will now safely be 10 instead of 377!
      foldCount: best.folds,
      pillarCount: best.pillars,
    });

    if (currentDesign >= MAX_DESIGNS) {
      setDone(true);
    } else {
      setCurrentDesign((d) => d + 1);
      setFolds(0);
      setPillars(0);
    }
  };

  const reset = () => {
    setDesigns([]);
    setCurrentDesign(1);
    setFolds(0);
    setPillars(0);
    setDone(false);
  };

  const currentRating = accel.maxMag != null ? getRating(accel.maxMag) : null;

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (done) {
    const best = designs.reduce((a, b) => (a.peakMag < b.peakMag ? a : b));
    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">🏗️ Results</StemText>

        {/* Results table */}
        <View style={[styles.tableHeader, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={[styles.colDesign, styles.bold]}>Design</StemText>
          <StemText variant="small" style={[styles.colFolds, styles.bold]}>Folds</StemText>
          <StemText variant="small" style={[styles.colFolds, styles.bold]}>Pillars</StemText>
          <StemText variant="small" style={[styles.colMag, styles.bold]}>Peak (G)</StemText>
          <StemText variant="small" style={[styles.colRating, styles.bold]}>Rating</StemText>
        </View>
        {designs.map((d, i) => {
          const r = getRating(d.peakMag);
          const isBest = d.designNumber === best.designNumber;
          return (
            <View
              key={i}
              style={[
                styles.tableRow,
                { borderColor: t.colors.border },
                isBest && { backgroundColor: t.colors.success + "11" },
              ]}
            >
              <StemText variant="small" style={styles.colDesign}>
                {isBest ? "🏆" : `D${d.designNumber}`}
              </StemText>
              <StemText variant="small" style={styles.colFolds}>{d.folds}</StemText>
              <StemText variant="small" style={styles.colFolds}>{d.pillars}</StemText>
              <StemText variant="small" style={[styles.colMag, { color: r.color, fontWeight: "bold" }]}>
                {d.peakMag.toFixed(3)}
              </StemText>
              <StemText variant="small" style={[styles.colRating, { color: r.color }]}>
                {r.emoji} {r.label}
              </StemText>
            </View>
          );
        })}

        <StemText variant="small" style={{ color: t.colors.success, marginTop: 8 }}>
          🏆 Best design: Design {best.designNumber} ({best.folds} folds, {best.pillars} pillars) — {best.peakMag.toFixed(3)} G
        </StemText>

        <StemButton title="Start over" variant="secondary" onPress={reset} />
      </View>
    );
  }

  // ── Active design screen ───────────────────────────────────────────────────
  return (
    <View style={[styles.box, { borderColor: t.colors.border }]}>
      <StemText variant="h2">🏗️ Earthquake Tester</StemText>
      <StemText variant="small" style={{ color: t.colors.muted }}>
        {simple
          ? "Build your structure, put the phone on top, then shake the table!"
          : DESCRIPTION}
      </StemText>

      {ttsEnabled && speak && isSpeaking && (
        <SpeakButton
          id="earthquake-desc"
          text={DESCRIPTION}
          isSpeaking={isSpeaking("earthquake-desc")}
          onPress={() => speak("earthquake-desc", DESCRIPTION)}
        />
      )}

      {/* Design progress */}
      <View style={[styles.progressBar, { backgroundColor: t.colors.card }]}>
        <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>
          Design {currentDesign} of {MAX_DESIGNS}
        </StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          {designs.length > 0 ? `${designs.length} design(s) recorded` : "No designs yet"}
        </StemText>
      </View>

      {/* Structure inputs */}
      <StemText variant="body" style={{ marginTop: 4 }}>
        {simple ? "How many folds?" : "Enter your structure details:"}
      </StemText>

      {/* Fold counter */}
      <View style={styles.counterRow}>
        <StemText variant="body" style={{ flex: 1 }}>
          📄 Folds: <StemText variant="body" style={{ fontWeight: "bold", color: t.colors.primary }}>{folds}</StemText>
        </StemText>
        <StemButton title="−" variant="secondary" onPress={() => setFolds((f) => Math.max(0, f - 1))} />
        <StemButton title="+" onPress={() => setFolds((f) => f + 1)} />
      </View>

      {/* Pillar counter */}
      <View style={styles.counterRow}>
        <StemText variant="body" style={{ flex: 1 }}>
          🏛️ Pillars: <StemText variant="body" style={{ fontWeight: "bold", color: t.colors.primary }}>{pillars}</StemText>
        </StemText>
        <StemButton title="−" variant="secondary" onPress={() => setPillars((p) => Math.max(0, p - 1))} />
        <StemButton title="+" onPress={() => setPillars((p) => p + 1)} />
      </View>

      {/* Web warning */}
      {isWebUnsupported && (
        <View style={[styles.warningBox, { borderColor: t.colors.warning, backgroundColor: t.colors.warning + "18" }]}>
          <StemText variant="small" style={{ color: t.colors.warning }}>
            ⚠️ Accelerometer not available on web. Test on a real device.
          </StemText>
        </View>
      )}

      {/* Instructions */}
      <View style={[styles.instructionBox, { backgroundColor: t.colors.card }]}>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          {simple
            ? "1. Build your structure\n2. Place phone on top\n3. Press Sample then shake the table!"
            : "1. Build your anti-vibration layer\n2. Place platform and phone on top\n3. Press Sample\n4. Shake the table to simulate earthquake\n5. Save when done"}
        </StemText>
      </View>

      {/* Live readout */}
      {accel.maxMag != null && currentRating && (
        <View style={[styles.resultBox, { borderColor: currentRating.color, backgroundColor: currentRating.color + "18" }]}>
          <StemText variant="h1" style={{ color: currentRating.color, textAlign: "center", fontSize: 44 }}>
            {accel.maxMag.toFixed(3)} G
          </StemText>
          <StemText variant="small" style={{ color: currentRating.color, textAlign: "center" }}>
            {currentRating.emoji} {currentRating.label}
          </StemText>
        </View>
      )}

      {/* Sampling indicator */}
      {accel.sampling && (
        <View style={[styles.samplingBox, { borderColor: t.colors.primary }]}>
          <StemText variant="body" style={{ color: t.colors.primary, textAlign: "center" }}>
            📡 Sampling… shake the table now!
          </StemText>
        </View>
      )}

      {/* Action buttons */}
      <View style={{ gap: 8, marginTop: 4 }}>
        {!accel.sampling && accel.maxMag == null && (
          <StemButton
            title="▶ Sample 2.5s"
            onPress={() => accel.start(2500)}
            disabled={isWebUnsupported}
          />
        )}
        {!accel.sampling && accel.maxMag != null && (
          <>
            <StemButton
              title="🔁 Retry shake"
              variant="secondary"
              onPress={() => accel.start(2500)}
            />
            <StemButton
              title={currentDesign < MAX_DESIGNS ? `Save Design ${currentDesign} & next` : "Save & see results"}
              onPress={saveDesign}
            />
          </>
        )}
        {accel.sampling && (
          <StemButton title="Sampling…" disabled />
        )}
      </View>

      {/* Previous designs */}
      {designs.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 4 }}>
            Previous designs:
          </StemText>
          {designs.map((d, i) => {
            const r = getRating(d.peakMag);
            return (
              <StemText key={i} variant="small" style={{ color: r.color }}>
                {r.emoji} Design {d.designNumber}: {d.folds} folds, {d.pillars} pillars → {d.peakMag.toFixed(3)} G — {r.label}
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
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  instructionBox: {
    borderRadius: 8,
    padding: 10,
  },
  resultBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginVertical: 4,
  },
  samplingBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    borderStyle: "dashed",
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
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
  colDesign: { width: 44 },
  colFolds: { width: 44, textAlign: "center" },
  colMag: { width: 70, textAlign: "center" },
  colRating: { flex: 1 },
  bold: { fontWeight: "bold" },
});