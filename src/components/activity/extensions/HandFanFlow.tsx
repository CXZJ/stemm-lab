import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DesignResult {
  designNumber: number;
  designLabel: string;
  material: string;
  distanceCm: number;
  bendAngleDeg: number;
  prediction: string;
  notes: string;
  wasRight: boolean | null;
  stiffnessProxy: number;
  estimatedForce: number | null;
}

type DesignStep = "predict" | "measure" | "compare";

// ── Material stiffness table from spec ────────────────────────────────────────
const MATERIAL_STIFFNESS: Record<string, { k: number; thickness: string; label: string }> = {
  thin_paper:    { k: 0.05, thickness: "0.1mm", label: "Thin printer paper" },
  standard_card: { k: 0.2,  thickness: "0.25mm", label: "Standard card stock" },
  thin_cardboard:{ k: 0.5,  thickness: "0.5mm",  label: "Thin cardboard" },
  corrugated:    { k: 2.5,  thickness: "3mm",    label: "Corrugated cardboard" },
};

const DISTANCES = [15, 30, 45];
const MAX_DESIGNS = 3;

// ── Force estimate from spec formula: F = k × θ (radians) ────────────────────
function estimateForce(bendAngleDeg: number, materialKey: string): number | null {
  const mat = MATERIAL_STIFFNESS[materialKey];
  if (!mat || bendAngleDeg <= 0) return null;
  const radians = (bendAngleDeg * Math.PI) / 180;
  return Math.round(mat.k * radians * 1000) / 1000;
}

// ── Stiffness proxy from existing physics.ts formula ─────────────────────────
function fanStiffnessProxy(angleDeg: number, distanceCm: number): number {
  if (distanceCm <= 0) return 0;
  return Math.round(angleDeg * (distanceCm / 15) * 100) / 100;
}

const DESCRIPTION =
  "Test how different fan designs and distances affect how much paper or cardboard bends. Record bend angle for each design.";

// ── Main Component ─────────────────────────────────────────────────────────────
export function HandFanFlow({
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

  const [started, setStarted] = useState(false);
  const [designIndex, setDesignIndex] = useState(0);
  const [designStep, setDesignStep] = useState<DesignStep>("predict");
  const [results, setResults] = useState<DesignResult[]>([]);
  const [done, setDone] = useState(false);

  // Per-design inputs
  const [designLabel, setDesignLabel] = useState("");
  const [material, setMaterial] = useState("thin_paper");
  const [distanceCm, setDistanceCm] = useState(30);
  const [bendAngleDeg, setBendAngleDeg] = useState("");
  const [prediction, setPrediction] = useState("");
  const [notes, setNotes] = useState("");
  const [wasRight, setWasRight] = useState<boolean | null>(null);

  const designNumber = designIndex + 1;

  const resetDesignInputs = () => {
    setDesignLabel("");
    setMaterial("thin_paper");
    setDistanceCm(30);
    setBendAngleDeg("");
    setPrediction("");
    setNotes("");
    setWasRight(null);
    setDesignStep("predict");
  };

  const saveDesign = () => {
    const angle = parseFloat(bendAngleDeg) || 0;
    const proxy = fanStiffnessProxy(angle, distanceCm);
    const force = estimateForce(angle, material);

    const result: DesignResult = {
      designNumber,
      designLabel: designLabel.trim() || `Design ${designNumber}`,
      material,
      distanceCm,
      bendAngleDeg: angle,
      prediction,
      notes,
      wasRight,
      stiffnessProxy: proxy,
      estimatedForce: force,
    };

    const updated = [...results, result];
    setResults(updated);

    // Push best result to form fields
    const bestDesign = updated.reduce((a, b) => a.bendAngleDeg > b.bendAngleDeg ? a : b);
    onUpdate({
      bendAngleDeg: angle,
      materialType: material,
      fanDistanceCm: String(distanceCm),
      notes,
      prediction,
      result: `${angle}° at ${distanceCm}cm — stiffness proxy: ${proxy}`,
      allDesigns: JSON.stringify(
        updated.map((r) => ({
          design: r.designNumber,
          label: r.designLabel,
          material: MATERIAL_STIFFNESS[r.material]?.label ?? r.material,
          distanceCm: r.distanceCm,
          bendAngleDeg: r.bendAngleDeg,
          stiffnessProxy: r.stiffnessProxy,
          estimatedForce: r.estimatedForce,
          prediction: r.prediction,
          wasRight: r.wasRight,
          notes: r.notes,
        }))
      ),
    });

    resetDesignInputs();

    if (designIndex < MAX_DESIGNS - 1) {
      setDesignIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  // ── Intro screen ─────────────────────────────────────────────────────────
  if (!started) {
    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">💨 Hand Fan Challenge</StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          {DESCRIPTION}
        </StemText>
        {ttsEnabled && speak && isSpeaking && (
          <SpeakButton
            id="handfan-desc"
            text={DESCRIPTION}
            isSpeaking={isSpeaking("handfan-desc")}
            onPress={() => speak("handfan-desc", DESCRIPTION)}
          />
        )}
        <View style={[styles.instructionBox, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={{ fontWeight: "bold" }}>Setup:</StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            1. Stand paper or cardboard upright on a table{"\n"}
            2. Fan from 15, 30, or 45 cm away{"\n"}
            3. Measure how many degrees it bends{"\n"}
            4. Try different fan designs — up to 3 designs
          </StemText>
        </View>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          Up to {MAX_DESIGNS} designs to compare
        </StemText>
        <StemButton title="Start Challenge" onPress={() => setStarted(true)} />
      </View>
    );
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    const best = results.reduce((a, b) => a.bendAngleDeg > b.bendAngleDeg ? a : b);
    const worst = results.reduce((a, b) => a.bendAngleDeg < b.bendAngleDeg ? a : b);

    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">✅ Results</StemText>

        {/* Key findings */}
        <View style={[styles.highlightBox, { borderColor: t.colors.success, backgroundColor: t.colors.success + "18" }]}>
          <StemText variant="small" style={{ fontWeight: "bold", color: t.colors.success }}>
            💨 Most movement:
          </StemText>
          <StemText variant="small" style={{ color: t.colors.success }}>
            {best.designLabel} — {best.bendAngleDeg}° at {best.distanceCm}cm
          </StemText>
        </View>

        {results.length > 1 && (
          <View style={[styles.highlightBox, { borderColor: t.colors.muted, backgroundColor: t.colors.card }]}>
            <StemText variant="small" style={{ fontWeight: "bold", color: t.colors.muted }}>
              🪨 Least movement:
            </StemText>
            <StemText variant="small" style={{ color: t.colors.muted }}>
              {worst.designLabel} — {worst.bendAngleDeg}° at {worst.distanceCm}cm
            </StemText>
          </View>
        )}

        {/* Results table */}
        <StemText variant="body" style={{ fontWeight: "bold", marginTop: 8 }}>
          All Designs
        </StemText>
        <View style={[styles.tableHeader, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={[styles.colDesign, styles.bold]}>Design</StemText>
          <StemText variant="small" style={[styles.colMaterial, styles.bold]}>Material</StemText>
          <StemText variant="small" style={[styles.colDist, styles.bold]}>Dist</StemText>
          <StemText variant="small" style={[styles.colAngle, styles.bold]}>Bend°</StemText>
          {!simple && (
            <StemText variant="small" style={[styles.colForce, styles.bold]}>F (N)</StemText>
          )}
          <StemText variant="small" style={[styles.colRight, styles.bold]}>✓?</StemText>
        </View>
        {results.map((r, i) => (
          <View key={i} style={[styles.tableRow, { borderColor: t.colors.border }]}>
            <StemText variant="small" style={styles.colDesign}>{r.designLabel}</StemText>
            <StemText variant="small" style={styles.colMaterial}>
              {MATERIAL_STIFFNESS[r.material]?.label.split(" ")[0] ?? r.material}
            </StemText>
            <StemText variant="small" style={styles.colDist}>{r.distanceCm}cm</StemText>
            <StemText variant="small" style={[styles.colAngle, { color: t.colors.primary, fontWeight: "bold" }]}>
              {r.bendAngleDeg}°
            </StemText>
            {!simple && (
              <StemText variant="small" style={[styles.colForce, { color: t.colors.accent }]}>
                {r.estimatedForce != null ? r.estimatedForce : "—"}
              </StemText>
            )}
            <StemText variant="small" style={[styles.colRight, {
              color: r.wasRight === true ? "#4ade80" : r.wasRight === false ? "#ef4444" : t.colors.muted,
            }]}>
              {r.wasRight === true ? "✅" : r.wasRight === false ? "❌" : "—"}
            </StemText>
          </View>
        ))}

        {/* Advanced: stiffness reference table */}
        {!simple && (
          <View style={{ marginTop: 12 }}>
            <StemText variant="body" style={{ fontWeight: "bold", marginBottom: 4 }}>
              Material Stiffness Reference
            </StemText>
            <View style={[styles.tableHeader, { backgroundColor: t.colors.card }]}>
              <StemText variant="small" style={[{ flex: 2 }, styles.bold]}>Material</StemText>
              <StemText variant="small" style={[{ width: 55 }, styles.bold]}>Thickness</StemText>
              <StemText variant="small" style={[{ width: 60 }, styles.bold]}>k (N/rad)</StemText>
            </View>
            {Object.entries(MATERIAL_STIFFNESS).map(([key, mat]) => (
              <View key={key} style={[styles.tableRow, { borderColor: t.colors.border }]}>
                <StemText variant="small" style={{ flex: 2 }}>{mat.label}</StemText>
                <StemText variant="small" style={{ width: 55 }}>{mat.thickness}</StemText>
                <StemText variant="small" style={{ width: 60, color: t.colors.primary }}>{mat.k}</StemText>
              </View>
            ))}
            <StemText variant="caption" style={{ color: t.colors.muted, marginTop: 4 }}>
              Formula: F = k × θ (radians). Higher k = stiffer material = more force needed.
            </StemText>
          </View>
        )}

        <StemButton
          title="Start over"
          variant="secondary"
          onPress={() => {
            setStarted(false);
            setDone(false);
            setDesignIndex(0);
            setResults([]);
            resetDesignInputs();
          }}
        />
      </View>
    );
  }

  // ── Active design screen ──────────────────────────────────────────────────
  const currentAngle = parseFloat(bendAngleDeg) || 0;
  const currentForce = estimateForce(currentAngle, material);
  const currentProxy = fanStiffnessProxy(currentAngle, distanceCm);

  return (
    <View style={[styles.box, { borderColor: t.colors.border }]}>
      <StemText variant="h2">💨 Hand Fan Challenge</StemText>

      {/* Progress */}
      <View style={[styles.progressBar, { backgroundColor: t.colors.card }]}>
        <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>
          Design {designNumber} of {MAX_DESIGNS}
        </StemText>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
          {Array.from({ length: MAX_DESIGNS }).map((_, i) => (
            <View key={i} style={[styles.dot, {
              backgroundColor:
                i < designIndex ? t.colors.success
                : i === designIndex ? t.colors.primary
                : t.colors.border,
            }]} />
          ))}
        </View>
      </View>

      {/* ── Step 1: Setup + Predict ── */}
      {designStep === "predict" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 1 — Setup & Predict 🔮
          </StemText>

          {/* Design label */}
          <StemText variant="small" style={{ color: t.colors.muted }}>
            Give this design a name:
          </StemText>
          <TextInput
            style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder={`e.g. 4 folds, no folds, zigzag folds`}
            placeholderTextColor={t.colors.muted}
            value={designLabel}
            onChangeText={setDesignLabel}
          />

          {/* Material picker */}
          <StemText variant="small" style={{ color: t.colors.muted }}>Material:</StemText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(MATERIAL_STIFFNESS).map(([key, mat]) => (
              <StemButton
                key={key}
                title={mat.label.split(" ").slice(0, 2).join(" ")}
                variant={material === key ? "primary" : "secondary"}
                onPress={() => setMaterial(key)}
              />
            ))}
          </View>

          {/* Distance picker */}
          <StemText variant="small" style={{ color: t.colors.muted }}>Fan distance:</StemText>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {DISTANCES.map((d) => (
              <StemButton
                key={d}
                title={`${d}cm`}
                variant={distanceCm === d ? "primary" : "secondary"}
                onPress={() => setDistanceCm(d)}
              />
            ))}
          </View>

          {/* Prediction */}
          <StemText variant="small" style={{ color: t.colors.muted, marginTop: 4 }}>
            {simple
              ? "How much do you think the paper will bend?"
              : `Predict the bend angle in degrees for ${designLabel || `Design ${designNumber}`}:`}
          </StemText>
          <TextInput
            style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder="e.g. 30°, bends a lot, barely moves"
            placeholderTextColor={t.colors.muted}
            value={prediction}
            onChangeText={setPrediction}
          />

          <StemButton
            title="Start fanning →"
            onPress={() => setDesignStep("measure")}
            disabled={prediction.trim().length === 0}
          />
        </View>
      )}

      {/* ── Step 2: Measure ── */}
      {designStep === "measure" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 2 — Fan & Measure 📐
          </StemText>

          {/* Reminder of setup */}
          <View style={[styles.reminderBox, { backgroundColor: t.colors.card }]}>
            <StemText variant="small" style={{ color: t.colors.muted }}>
              {designLabel || `Design ${designNumber}`} · {MATERIAL_STIFFNESS[material]?.label} · {distanceCm}cm away
            </StemText>
          </View>

          <StemText variant="small" style={{ color: t.colors.muted }}>
            {simple
              ? "Fan the paper and write how many degrees it bends:"
              : `Fan from ${distanceCm}cm away. Use a protractor or estimate the bend angle in degrees:`}
          </StemText>

          {/* Bend angle input */}
          <StemText variant="small" style={{ color: t.colors.muted }}>Bend angle (degrees):</StemText>
          <TextInput
            style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder="e.g. 30"
            placeholderTextColor={t.colors.muted}
            value={bendAngleDeg}
            onChangeText={setBendAngleDeg}
            keyboardType="decimal-pad"
          />

          {/* Live calculation preview */}
          {currentAngle > 0 && (
            <View style={[styles.calcBox, { borderColor: t.colors.primary, backgroundColor: t.colors.primary + "18" }]}>
              <StemText variant="body" style={{ color: t.colors.primary, textAlign: "center", fontWeight: "bold" }}>
                {currentAngle}° bend
              </StemText>
              <StemText variant="small" style={{ color: t.colors.primary, textAlign: "center" }}>
                Stiffness proxy: {currentProxy}
              </StemText>
              {!simple && currentForce != null && (
                <StemText variant="small" style={{ color: t.colors.accent, textAlign: "center" }}>
                  Estimated force: {currentForce} N (F = k × θ)
                </StemText>
              )}
            </View>
          )}

          {/* Notes */}
          <StemText variant="small" style={{ color: t.colors.muted }}>Observation notes:</StemText>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder="e.g. Paper bent quickly, cardboard barely moved"
            placeholderTextColor={t.colors.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton
              title="← Back"
              variant="ghost"
              onPress={() => setDesignStep("predict")}
            />
            <StemButton
              title="Compare result →"
              onPress={() => setDesignStep("compare")}
              disabled={bendAngleDeg.trim().length === 0}
            />
          </View>
        </View>
      )}

      {/* ── Step 3: Compare ── */}
      {designStep === "compare" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 3 — Were you right? 🎯
          </StemText>

          <View style={styles.compareRow}>
            <View style={[styles.compareBox, { borderColor: t.colors.border, backgroundColor: t.colors.card }]}>
              <StemText variant="small" style={{ color: t.colors.muted, fontWeight: "bold" }}>Your prediction</StemText>
              <StemText variant="small">{prediction}</StemText>
            </View>
            <View style={[styles.compareBox, { borderColor: t.colors.primary, backgroundColor: t.colors.primary + "18" }]}>
              <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>Outcome</StemText>
              <StemText variant="small" style={{ color: t.colors.primary }}>
                {currentAngle}° at {distanceCm}cm{"\n"}
                {!simple && currentForce != null ? `~${currentForce}N force` : ""}
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
            title={designIndex < MAX_DESIGNS - 1 ? "Save & next design →" : "Save & see results →"}
            onPress={saveDesign}
            disabled={wasRight === null}
          />
        </View>
      )}

      {/* Previous designs */}
      {results.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 4 }}>
            Designs so far:
          </StemText>
          {results.map((r, i) => (
            <StemText key={i} variant="small" style={{ color: t.colors.primary }}>
              💨 {r.designLabel}: {r.bendAngleDeg}° at {r.distanceCm}cm · {r.wasRight === true ? "✅" : r.wasRight === false ? "❌" : "—"}
            </StemText>
          ))}
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
  instructionBox: {
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
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  reminderBox: {
    borderRadius: 8,
    padding: 8,
  },
  calcBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 4,
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
  colDesign: { flex: 1.2 },
  colMaterial: { flex: 1 },
  colDist: { width: 40 },
  colAngle: { width: 45, textAlign: "center" },
  colForce: { width: 45, textAlign: "center" },
  colRight: { width: 28, textAlign: "center" },
  bold: { fontWeight: "bold" },
});