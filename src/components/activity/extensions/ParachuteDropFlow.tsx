import { CameraCaptureModal } from "@/components/activity/CameraCaptureModal";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import {
    accelerationFromVelocityDistance,
    dragForceEstimate,
    finalVelocityFromHeight,
    G,
    gForceFromStop,
    netForce,
} from "@/lib/calculations/physics";
import { useStemTheme } from "@/theme/ThemeProvider";
import { ResizeMode, Video } from "expo-av";
import { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";


// ── Types ──────────────────────────────────────────────────────────────────────
interface DropResult {
  actionNumber: number;
  actionLabel: string;
  hasParachute: boolean;
  dropHeightM: number;
  timeToGroundSec: number;
  timeToStopSec: number | null;
  bounced: boolean;
  massKg: number;
  prediction: string;
  wasRight: boolean | null;
  dropVideoUri: string | null;
  // Calculated
  finalVelocity: number;
  acceleration: number;
  netForce: number | null;
  dragForce: number | null;
  gForce: number | null;
}

type ActionStep = "predict" | "record" | "review" | "record_stop" | "compare";

// ── G-force risk levels ────────────────────────────────────────────────────────
const GFORCE_LEVELS = [
  { min: 0,  max: 5,  label: "No injury",                    color: "#4ade80", emoji: "✅" },
  { min: 5,  max: 10, label: "Possible bruising or strains",  color: "#86efac", emoji: "⚠️" },
  { min: 10, max: 30, label: "Serious injuries possible",     color: "#fde68a", emoji: "⚠️" },
  { min: 30, max: 50, label: "High risk of severe injury",    color: "#fb923c", emoji: "🔴" },
  { min: 50, max: Infinity, label: "Life-threatening",        color: "#ef4444", emoji: "🚨" },
];

function getGForceLevel(g: number) {
  return GFORCE_LEVELS.find((l) => g >= l.min && g < l.max) ?? GFORCE_LEVELS[0];
}

const MAX_ACTIONS = 3;
const DESCRIPTION =
  "Record each drop on video, play it back, then enter fall and stop times from the recording for accurate measurements.";

function DropVideoPlayer({ uri }: { uri: string }) {
  const t = useStemTheme();
  const videoRef = useRef<Video>(null);

  return (
    <View style={styles.videoWrap}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
      />
      <StemText variant="small" style={{ color: t.colors.muted, textAlign: "center" }}>
        Pause at release and at ground contact to measure times accurately.
      </StemText>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ParachuteDropFlow({
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
  const [actionIndex, setActionIndex] = useState(0);
  const [actionStep, setActionStep] = useState<ActionStep>("predict");
  const [results, setResults] = useState<DropResult[]>([]);
  const [done, setDone] = useState(false);

  // Per-action inputs
  const [actionLabel, setActionLabel] = useState("");
  const [hasParachute, setHasParachute] = useState(false);
  const [dropHeightM, setDropHeightM] = useState("1.0");
  const [massKg, setMassKg] = useState("0.05");
  const [timeToGroundSec, setTimeToGroundSec] = useState<number | null>(null);
  const [timeToStopSec, setTimeToStopSec] = useState("");
  const [bounced, setBounced] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [wasRight, setWasRight] = useState<boolean | null>(null);
  const [groundTimeInput, setGroundTimeInput] = useState("");
  const [dropVideoUri, setDropVideoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const actionNumber = actionIndex + 1;

  const resetAction = () => {
    setActionLabel("");
    setHasParachute(actionIndex > 0); // baseline = no parachute
    setTimeToGroundSec(null);
    setTimeToStopSec("");
    setBounced(false);
    setPrediction("");
    setWasRight(null);
    setGroundTimeInput("");
    setDropVideoUri(null);
    setActionStep("predict");
  };

  // Calculate results for current action
  const computeResults = (
    height: number,
    tGround: number,
    tStop: number | null,
    mass: number,
    bounce: boolean,
    impactV: number
  ) => {
    const finalV = finalVelocityFromHeight(height);
    const accel = accelerationFromVelocityDistance(impactV, height);
    const netF = simple ? null : netForce(mass, accel);
    const dragF = simple ? null : dragForceEstimate(mass, G, accel);

    let gF: number | null = null;
    if (!simple && tStop != null && tStop > 0) {
      if (bounce) {
        // Case 2: bounce — Δv = v_impact + v_rebound
        // Approximate v_rebound from tStop (time to max height)
        const vRebound = G * tStop;
        const deltaV = impactV + vRebound;
        gF = gForceFromStop(deltaV, tStop);
      } else {
        // Case 1: no bounce — Δv = v_impact
        gF = gForceFromStop(impactV, tStop);
      }
    }

    return { finalV, accel, netF, dragF, gF };
  };

  const saveAction = () => {
    const height = parseFloat(dropHeightM) || 1.0;
    const mass = parseFloat(massKg) || 0.05;
    const tGround = timeToGroundSec ?? parseFloat(groundTimeInput) ?? 0;
    const tStop = timeToStopSec ? parseFloat(timeToStopSec) : null;
    const impactV = finalVelocityFromHeight(height);
    const { finalV, accel, netF, dragF, gF } = computeResults(height, tGround, tStop, mass, bounced, impactV);

    const result: DropResult = {
      actionNumber,
      actionLabel: actionLabel.trim() || (actionIndex === 0 ? "No parachute (baseline)" : `Prototype ${actionIndex}`),
      hasParachute,
      dropHeightM: height,
      timeToGroundSec: tGround,
      timeToStopSec: tStop,
      bounced,
      massKg: mass,
      prediction,
      wasRight,
      dropVideoUri,
      finalVelocity: finalV,
      acceleration: accel,
      netForce: netF,
      dragForce: dragF,
      gForce: gF,
    };

    const updated = [...results, result];
    setResults(updated);

    // Push to form
    onUpdate({
      timeToGroundSec: tGround,
      dropHeightM: height,
      massKg: mass,
      hasParachute: hasParachute ? "true" : "false",
      prototypeIndex: String(actionNumber),
      prediction,
      dropVideoUri: dropVideoUri ?? "",
      allDrops: JSON.stringify(
        updated.map((r) => ({
          action: r.actionNumber,
          label: r.actionLabel,
          hasParachute: r.hasParachute,
          dropHeightM: r.dropHeightM,
          timeToGroundSec: r.timeToGroundSec,
          timeToStopSec: r.timeToStopSec,
          bounced: r.bounced,
          massKg: r.massKg,
          dropVideoUri: r.dropVideoUri,
          finalVelocity: r.finalVelocity,
          acceleration: r.acceleration,
          netForce: r.netForce,
          dragForce: r.dragForce,
          gForce: r.gForce,
          prediction: r.prediction,
          wasRight: r.wasRight,
        }))
      ),
    });

    resetAction();

    if (actionIndex < MAX_ACTIONS - 1) {
      setActionIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  // ── Intro ─────────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">🪂 Parachute Drop Challenge</StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>{DESCRIPTION}</StemText>
        {ttsEnabled && speak && isSpeaking && (
          <SpeakButton
            id="para-desc"
            text={DESCRIPTION}
            isSpeaking={isSpeaking("para-desc")}
            onPress={() => speak("para-desc", DESCRIPTION)}
          />
        )}
        <View style={[styles.infoBox, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={{ fontWeight: "bold" }}>How it works:</StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>1. Set up and predict</StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>2. Record the drop on video</StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>3. Play back the video and enter times</StemText>
        </View>
        <View style={[styles.infoBox, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={{ fontWeight: "bold" }}>3 actions:</StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>Action 1 — No parachute (baseline)</StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>Action 2 — Prototype 1</StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>Action 3 — Prototype 2</StemText>
        </View>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          You have 20 minutes. Build and test up to 3 designs.
        </StemText>
        <StemButton title="Start Challenge" onPress={() => { setStarted(true); setHasParachute(false); }} />
      </View>
    );
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    const withParachute = results.filter((r) => r.hasParachute);
    const bestDesign = withParachute.length > 0
      ? withParachute.reduce((a, b) => a.timeToGroundSec > b.timeToGroundSec ? a : b)
      : null;

    return (
      <View style={[styles.box, { borderColor: t.colors.border }]}>
        <StemText variant="h2">✅ Results</StemText>

        {bestDesign && (
          <View style={[styles.highlightBox, { borderColor: t.colors.success, backgroundColor: t.colors.success + "18" }]}>
            <StemText variant="small" style={{ fontWeight: "bold", color: t.colors.success }}>
              🏆 Slowest landing (best design):
            </StemText>
            <StemText variant="small" style={{ color: t.colors.success }}>
              {bestDesign.actionLabel} — {bestDesign.timeToGroundSec}s to ground
            </StemText>
          </View>
        )}

        {/* Results table matching spec */}
        <StemText variant="body" style={{ fontWeight: "bold", marginTop: 8 }}>All Drops</StemText>
        <View style={[styles.tableHeader, { backgroundColor: t.colors.card }]}>
          <StemText variant="small" style={[styles.colAction, styles.bold]}>Action</StemText>
          <StemText variant="small" style={[styles.colTime, styles.bold]}>Time to ground</StemText>
          <StemText variant="small" style={[styles.colTime, styles.bold]}>Stop time</StemText>
          {!simple && <StemText variant="small" style={[styles.colForce, styles.bold]}>G-Force</StemText>}
          <StemText variant="small" style={[styles.colRight, styles.bold]}>✓?</StemText>
        </View>
        {results.map((r, i) => {
          const gLevel = r.gForce != null ? getGForceLevel(r.gForce) : null;
          return (
            <View key={i} style={[styles.tableRow, { borderColor: t.colors.border }]}>
              <StemText variant="small" style={styles.colAction}>{r.actionLabel}</StemText>
              <StemText variant="small" style={[styles.colTime, { color: t.colors.primary }]}>
                {r.timeToGroundSec}s
              </StemText>
              <StemText variant="small" style={styles.colTime}>
                {r.timeToStopSec != null ? `${r.timeToStopSec}s` : "—"}
              </StemText>
              {!simple && (
                <StemText variant="small" style={[styles.colForce, { color: gLevel?.color ?? t.colors.muted }]}>
                  {r.gForce != null ? `${r.gForce}g` : "—"}
                </StemText>
              )}
              <StemText variant="small" style={[styles.colRight, {
                color: r.wasRight === true ? "#4ade80" : r.wasRight === false ? "#ef4444" : t.colors.muted,
              }]}>
                {r.wasRight === true ? "✅" : r.wasRight === false ? "❌" : "—"}
              </StemText>
            </View>
          );
        })}

        {/* Advanced: calculations breakdown */}
        {!simple && results.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <StemText variant="body" style={{ fontWeight: "bold", marginBottom: 4 }}>Calculations</StemText>
            {results.map((r, i) => (
              <View key={i} style={[styles.calcBlock, { borderColor: t.colors.border }]}>
                <StemText variant="small" style={{ fontWeight: "bold", color: t.colors.primary }}>
                  {r.actionLabel}
                </StemText>
                <StemText variant="small" style={{ color: t.colors.muted }}>
                  v = √(2 × 9.81 × {r.dropHeightM}) = {r.finalVelocity} m/s
                </StemText>
                <StemText variant="small" style={{ color: t.colors.muted }}>
                  a = v²/2d = {r.acceleration} m/s²
                </StemText>
                {r.netForce != null && (
                  <StemText variant="small" style={{ color: t.colors.muted }}>
                    F_net = {r.massKg}kg × {r.acceleration} = {r.netForce} N
                  </StemText>
                )}
                {r.dragForce != null && (
                  <StemText variant="small" style={{ color: t.colors.muted }}>
                    F_drag = m(g-a) = {r.dragForce} N
                  </StemText>
                )}
                {r.gForce != null && (
                  <StemText variant="small" style={{ color: getGForceLevel(r.gForce).color }}>
                    G-force = {r.gForce}g — {getGForceLevel(r.gForce).label}
                  </StemText>
                )}
              </View>
            ))}
          </View>
        )}

        {/* G-force reference table — advanced only */}
        {!simple && (
          <View style={{ marginTop: 12 }}>
            <StemText variant="body" style={{ fontWeight: "bold", marginBottom: 4 }}>G-Force Reference</StemText>
            {GFORCE_LEVELS.map((l, i) => (
              <View key={i} style={[styles.gRow, { borderLeftColor: l.color }]}>
                <StemText variant="small" style={{ color: l.color, width: 70, fontWeight: "bold" }}>
                  {l.min}–{l.max === Infinity ? "50+" : l.max}g
                </StemText>
                <StemText variant="small" style={{ flex: 1, color: t.colors.text }}>
                  {l.emoji} {l.label}
                </StemText>
              </View>
            ))}
          </View>
        )}

        <StemButton
          title="Start over"
          variant="secondary"
          onPress={() => {
            setStarted(false);
            setDone(false);
            setActionIndex(0);
            setResults([]);
            resetAction();
          }}
        />
      </View>
    );
  }

  // ── Active action ─────────────────────────────────────────────────────────
  const height = parseFloat(dropHeightM) || 1.0;
  const mass = parseFloat(massKg) || 0.05;
  const impactV = finalVelocityFromHeight(height);
  const tGround = timeToGroundSec ?? 0;
  const tStop = timeToStopSec ? parseFloat(timeToStopSec) : null;
  const { finalV, accel, netF, dragF, gF } = computeResults(height, tGround, tStop, mass, bounced, impactV);

  return (
    <View style={[styles.box, { borderColor: t.colors.border }]}>
      <StemText variant="h2">🪂 Parachute Drop Challenge</StemText>

      {/* Progress */}
      <View style={[styles.progressBar, { backgroundColor: t.colors.card }]}>
        <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>
          Action {actionNumber} of {MAX_ACTIONS}
        </StemText>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
          {Array.from({ length: MAX_ACTIONS }).map((_, i) => (
            <View key={i} style={[styles.dot, {
              backgroundColor: i < actionIndex ? t.colors.success : i === actionIndex ? t.colors.primary : t.colors.border,
            }]} />
          ))}
        </View>
      </View>

      {/* ── Step 1: Predict + Setup ── */}
      {actionStep === "predict" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 1 — Setup & Predict 🔮
          </StemText>

          {/* Action label */}
          <StemText variant="small" style={{ color: t.colors.muted }}>Action name:</StemText>
          <TextInput
            style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder={actionIndex === 0 ? "e.g. No parachute (baseline)" : `e.g. Plastic with 4 corners tied to toy`}
            placeholderTextColor={t.colors.muted}
            value={actionLabel}
            onChangeText={setActionLabel}
          />

          {/* Has parachute */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton
              title="🧸 No parachute"
              variant={!hasParachute ? "primary" : "secondary"}
              onPress={() => setHasParachute(false)}
            />
            <StemButton
              title="🪂 With parachute"
              variant={hasParachute ? "primary" : "secondary"}
              onPress={() => setHasParachute(true)}
            />
          </View>

          {/* Drop height */}
          <StemText variant="small" style={{ color: t.colors.muted }}>Drop height (m):</StemText>
          <TextInput
            style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder="e.g. 1.0"
            placeholderTextColor={t.colors.muted}
            value={dropHeightM}
            onChangeText={setDropHeightM}
            keyboardType="decimal-pad"
          />

          {/* Mass */}
          {!simple && (
            <>
              <StemText variant="small" style={{ color: t.colors.muted }}>Mass of toy (kg):</StemText>
              <TextInput
                style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
                placeholder="e.g. 0.05"
                placeholderTextColor={t.colors.muted}
                value={massKg}
                onChangeText={setMassKg}
                keyboardType="decimal-pad"
              />
            </>
          )}

          {/* Prediction */}
          <StemText variant="small" style={{ color: t.colors.muted }}>
            {simple ? "How long do you think the toy will take to fall?" : "Predict the fall time and what will happen:"}
          </StemText>
          <TextInput
            style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder={
              actionIndex === 0
                ? "e.g. About 0.5 seconds, hits the ground fast"
                : "e.g. About 2 seconds, floats down slowly"
            }
            placeholderTextColor={t.colors.muted}
            value={prediction}
            onChangeText={setPrediction}
          />

          {/* Theory preview for advanced */}
          {!simple && height > 0 && (
            <View style={[styles.calcPreview, { backgroundColor: t.colors.card }]}>
              <StemText variant="small" style={{ color: t.colors.muted }}>
                Predicted final velocity (no drag): v = √(2 × 9.81 × {height}) = {finalVelocityFromHeight(height)} m/s
              </StemText>
            </View>
          )}

          <StemButton
            title="Ready to record →"
            onPress={() => setActionStep("record")}
            disabled={prediction.trim().length === 0}
          />
        </View>
      )}

      {/* ── Step 2: Record drop video ── */}
      {actionStep === "record" && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 2 — Record the drop 🎥
          </StemText>

          <View style={[styles.infoBox, { backgroundColor: t.colors.card }]}>
            <StemText variant="small" style={{ color: t.colors.muted }}>
              {actionLabel || (actionIndex === 0 ? "No parachute (baseline)" : `Prototype ${actionIndex}`)} · {height}m height
            </StemText>
            <StemText variant="small" style={{ color: t.colors.muted }}>
              {hasParachute ? "🪂 With parachute" : "🧸 No parachute"}
            </StemText>
          </View>

          <StemText variant="small" style={{ color: t.colors.muted }}>
            {simple
              ? "Film the full drop from release to landing. You will watch the video back in the next step to enter the fall time."
              : "Film the full drop from release through landing and stopping. Use slow-motion if your phone supports it. You will measure times from the playback in the next step."}
          </StemText>

          {dropVideoUri ? (
            <View style={[styles.infoBox, { backgroundColor: t.colors.success + "18", borderColor: t.colors.success, borderWidth: 1 }]}>
              <StemText variant="small" style={{ color: t.colors.success, fontWeight: "bold" }}>
                ✅ Video recorded
              </StemText>
              <DropVideoPlayer uri={dropVideoUri} />
              <StemButton title="Re-record video" variant="secondary" onPress={() => setShowCamera(true)} />
            </View>
          ) : (
            <StemButton title="🎥 Record drop video" onPress={() => setShowCamera(true)} />
          )}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton title="← Back" variant="ghost" onPress={() => setActionStep("predict")} />
            <StemButton
              title="Review video →"
              onPress={() => setActionStep("review")}
              disabled={!dropVideoUri}
            />
          </View>
        </View>
      )}

      {/* ── Step 3: Review video & enter times ── */}
      {actionStep === "review" && dropVideoUri && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 3 — Review & measure ⏱️
          </StemText>

          <StemText variant="small" style={{ color: t.colors.muted }}>
            Play your recording. Pause at the moment of release and at first ground contact, then enter the time to ground below.
            {simple ? "" : " Tip: slow-motion makes this easier to read."}
          </StemText>

          <DropVideoPlayer uri={dropVideoUri} />

          <StemText variant="small" style={{ color: t.colors.muted }}>Time to first ground contact (s):</StemText>
          <TextInput
            style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder="e.g. 1.23"
            placeholderTextColor={t.colors.muted}
            value={groundTimeInput}
            onChangeText={(v) => {
              setGroundTimeInput(v);
              const parsed = parseFloat(v);
              setTimeToGroundSec(Number.isFinite(parsed) ? parsed : null);
            }}
            keyboardType="decimal-pad"
          />

          {timeToGroundSec != null && timeToGroundSec > 0 && (
            <View style={[styles.timerBox, { borderColor: t.colors.success, backgroundColor: t.colors.success + "18" }]}>
              <StemText variant="h1" style={{ color: t.colors.success, textAlign: "center", fontSize: 40 }}>
                {timeToGroundSec}s
              </StemText>
              <StemText variant="small" style={{ color: t.colors.success, textAlign: "center" }}>
                Time to first ground contact
              </StemText>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton title="← Re-record" variant="ghost" onPress={() => setActionStep("record")} />
            <StemButton
              title={simple ? "Compare result →" : "Measure stop time →"}
              onPress={() => setActionStep(simple ? "compare" : "record_stop")}
              disabled={timeToGroundSec == null || timeToGroundSec <= 0}
            />
          </View>
        </View>
      )}

      {/* ── Step 3b: Record stop time from video (advanced) ── */}
      {actionStep === "record_stop" && !simple && dropVideoUri && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step 3b — Stop time from video 🎬
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            Watch the playback again. Measure the time from first ground contact until the toy stops moving (or reaches max height after a bounce).
          </StemText>

          <DropVideoPlayer uri={dropVideoUri} />

          {/* Bounce or no bounce */}
          <StemText variant="small" style={{ color: t.colors.muted }}>Did the toy bounce?</StemText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton
              title="No bounce"
              variant={!bounced ? "primary" : "secondary"}
              onPress={() => setBounced(false)}
            />
            <StemButton
              title="Bounced"
              variant={bounced ? "primary" : "secondary"}
              onPress={() => setBounced(true)}
            />
          </View>

          <StemText variant="small" style={{ color: t.colors.muted }}>
            {bounced
              ? "Time from first contact to maximum height after bounce (s):"
              : "Time from first contact to fully stopped (s):"}
          </StemText>
          <TextInput
            style={[styles.input, { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card }]}
            placeholder="e.g. 0.05"
            placeholderTextColor={t.colors.muted}
            value={timeToStopSec}
            onChangeText={setTimeToStopSec}
            keyboardType="decimal-pad"
          />

          {/* G-force preview */}
          {timeToStopSec && parseFloat(timeToStopSec) > 0 && timeToGroundSec != null && (
            <View style={[styles.calcPreview, { backgroundColor: t.colors.card }]}>
              {(() => {
                const tS = parseFloat(timeToStopSec);
                let gForceVal: number;
                if (bounced) {
                  const vRebound = G * tS;
                  gForceVal = gForceFromStop(impactV + vRebound, tS);
                } else {
                  gForceVal = gForceFromStop(impactV, tS);
                }
                const level = getGForceLevel(gForceVal);
                return (
                  <>
                    <StemText variant="small" style={{ color: level.color, fontWeight: "bold" }}>
                      G-force: {gForceVal}g — {level.emoji} {level.label}
                    </StemText>
                    <StemText variant="small" style={{ color: t.colors.muted }}>
                      {bounced ? `Δv = ${impactV} + ${Math.round(G * tS * 100) / 100} = ${Math.round((impactV + G * tS) * 100) / 100} m/s` : `Δv = ${impactV} m/s`}
                    </StemText>
                  </>
                );
              })()}
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton title="← Back" variant="ghost" onPress={() => setActionStep("review")} />
            <StemButton title="Skip →" variant="ghost" onPress={() => setActionStep("compare")} />
            <StemButton title="Compare result →" onPress={() => setActionStep("compare")} />
          </View>
        </View>
      )}

      {/* ── Step 4: Compare ── */}
      {actionStep === "compare" && timeToGroundSec != null && (
        <View style={[styles.stepBox, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ fontWeight: "bold" }}>
            Step {simple ? "4" : "5"} — Were you right? 🎯
          </StemText>

          {dropVideoUri && <DropVideoPlayer uri={dropVideoUri} />}

          <View style={styles.compareRow}>
            <View style={[styles.compareBox, { borderColor: t.colors.border, backgroundColor: t.colors.card }]}>
              <StemText variant="small" style={{ color: t.colors.muted, fontWeight: "bold" }}>Your prediction</StemText>
              <StemText variant="small">{prediction}</StemText>
            </View>
            <View style={[styles.compareBox, { borderColor: t.colors.primary, backgroundColor: t.colors.primary + "18" }]}>
              <StemText variant="small" style={{ color: t.colors.primary, fontWeight: "bold" }}>Outcome</StemText>
              <StemText variant="small" style={{ color: t.colors.primary }}>
                {timeToGroundSec}s to ground{tStop != null ? `\n${tStop}s to stop` : ""}
              </StemText>
            </View>
          </View>

          {/* Inline calculations */}
          {!simple && (
            <View style={[styles.calcPreview, { backgroundColor: t.colors.card }]}>
              <StemText variant="small" style={{ color: t.colors.muted, fontWeight: "bold" }}>Calculations:</StemText>
              <StemText variant="small" style={{ color: t.colors.muted }}>Final velocity: {finalV} m/s</StemText>
              <StemText variant="small" style={{ color: t.colors.muted }}>Acceleration: {accel} m/s²</StemText>
              {netF != null && <StemText variant="small" style={{ color: t.colors.muted }}>Net force: {netF} N</StemText>}
              {dragF != null && <StemText variant="small" style={{ color: t.colors.muted }}>Drag force: {dragF} N</StemText>}
              {gF != null && (
                <StemText variant="small" style={{ color: getGForceLevel(gF).color }}>
                  G-force: {gF}g — {getGForceLevel(gF).label}
                </StemText>
              )}
            </View>
          )}

          <StemText variant="small" style={{ color: t.colors.muted }}>Was your prediction correct?</StemText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StemButton title="✅ Yes" variant={wasRight === true ? "primary" : "secondary"} onPress={() => setWasRight(true)} />
            <StemButton title="❌ No" variant={wasRight === false ? "primary" : "secondary"} onPress={() => setWasRight(false)} />
          </View>

          <StemButton
            title={actionIndex < MAX_ACTIONS - 1 ? "Save & next action →" : "Save & see results →"}
            onPress={saveAction}
            disabled={wasRight === null}
          />
        </View>
      )}

      {/* Previous drops */}
      {results.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 4 }}>Drops so far:</StemText>
          {results.map((r, i) => (
            <StemText key={i} variant="small" style={{ color: t.colors.primary }}>
              🪂 {r.actionLabel}: {r.timeToGroundSec}s · {r.wasRight === true ? "✅" : r.wasRight === false ? "❌" : "—"}
            </StemText>
          ))}
        </View>
      )}

      <CameraCaptureModal
        visible={showCamera}
        mode="video"
        onClose={() => setShowCamera(false)}
        onCaptured={(uri) => {
          setDropVideoUri(uri);
          onUpdate({ dropVideoUri: uri });
        }}
      />
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
  infoBox: {
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
  timerBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  videoWrap: {
    gap: 8,
    width: "100%",
  },
  video: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#000",
  },
  calcPreview: {
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  calcBlock: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 6,
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
  gRow: {
    flexDirection: "row",
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 3,
    gap: 6,
    alignItems: "flex-start",
    marginBottom: 2,
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
  colAction: { flex: 1.5 },
  colTime: { width: 60, textAlign: "center" },
  colForce: { width: 55, textAlign: "center" },
  colRight: { width: 28, textAlign: "center" },
  bold: { fontWeight: "bold" },
});