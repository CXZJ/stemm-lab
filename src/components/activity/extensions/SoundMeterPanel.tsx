import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ── Spec table: Sound Levels and Hearing Damage Risk ──────────────────────────
const DB_RISK_LEVELS = [
  { min: 0,   max: 30,  label: "No risk",                          color: "#4ade80", emoji: "✅" },
  { min: 30,  max: 60,  label: "Safe for long periods",            color: "#86efac", emoji: "✅" },
  { min: 60,  max: 85,  label: "Generally safe — long exposure may cause fatigue", color: "#fde68a", emoji: "⚠️" },
  { min: 85,  max: 90,  label: "Hearing damage possible after long exposure",      color: "#fb923c", emoji: "⚠️" },
  { min: 90,  max: 100, label: "Hearing damage likely after short exposure",        color: "#f87171", emoji: "🔴" },
  { min: 100, max: 110, label: "Serious hearing damage in minutes",                color: "#ef4444", emoji: "🔴" },
  { min: 110, max: 120, label: "Painful — immediate damage possible",              color: "#dc2626", emoji: "🚨" },
  { min: 120, max: 130, label: "Immediate and severe hearing damage",              color: "#991b1b", emoji: "🚨" },
  { min: 130, max: Infinity, label: "Instant, permanent hearing damage",           color: "#7f1d1d", emoji: "💀" },
];

function getRiskLevel(db: number) {
  return DB_RISK_LEVELS.find((r) => db >= r.min && db < r.max) ?? DB_RISK_LEVELS[0];
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Reading {
  id: number;
  actionName: string;
  db: number;
  location: string | null;
  timestamp: string;
}

const WARNING_TEXT =
  "85 decibels or more sustained can risk hearing over time. Classroom peaks are usually brief — still avoid very loud tests near ears.";

// ── Component ─────────────────────────────────────────────────────────────────
export function SoundMeterPanel({
  onUpdate,
  ttsEnabled,
  speak,
  isSpeaking,
}: {
  onUpdate: (patch: Record<string, number | string>) => void;
  ttsEnabled?: boolean;
  speak?: (id: string, text: string) => void;
  isSpeaking?: (id: string) => boolean;
}) {
  const t = useStemTheme();

  // State
  const [measuring, setMeasuring] = useState(false);
  const [liveDb, setLiveDb] = useState<number | null>(null);
  const [actionName, setActionName] = useState("");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [nextId, setNextId] = useState(1);

  const lastDb = useRef(30);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getLocation = async (): Promise<string | null> => {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`;
    } catch {
      return null;
    }
  };

  // ── Start Sampling ─────────────────────────────────────────────────────────
  const start = async () => {
    const label = actionName.trim() || `Action ${nextId}`;

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      onUpdate({ dbRaw: 0, readingLabel: "permission denied" });
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const rec = new Audio.Recording();
    lastDb.current = 30;
    setLiveDb(null);

    try {
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await rec.startAsync();
      setMeasuring(true);

      // Fetch location in parallel while sampling
      const locationPromise = getLocation();

      const iv = setInterval(async () => {
        const st = await rec.getStatusAsync();
        if (!st.isRecording) return;
        const metering = typeof st.metering === "number" ? st.metering : null;
        if (metering != null) {
          // Proper dBFS → dB SPL conversion
          const DEVICE_OFFSET = 90;
          const dbSPL = Math.max(0, Math.min(140, metering + DEVICE_OFFSET));
          lastDb.current = dbSPL;
          setLiveDb(Math.round(dbSPL * 10) / 10);
          onUpdate({ dbRaw: Math.round(dbSPL * 10) / 10, readingLabel: "live" });
        }
      }, 100);

      setTimeout(async () => {
        clearInterval(iv);
        await rec.stopAndUnloadAsync();
        setMeasuring(false);

        const finalDb = Math.round(lastDb.current * 10) / 10;
        const location = await locationPromise;
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        // Save reading to results table
        const newReading: Reading = {
          id: nextId,
          actionName: label,
          db: finalDb,
          location,
          timestamp,
        };
        setReadings((prev) => [...prev, newReading]);
        setNextId((n) => n + 1);
        setActionName(""); // clear input for next action
        setLiveDb(null);

        onUpdate({ dbRaw: finalDb, readingLabel: "approximate" });
      }, 3000);
    } catch {
      setMeasuring(false);
      setLiveDb(null);
      onUpdate({ dbRaw: 0, readingLabel: "error" });
    }
  };

  const clearReadings = () => {
    setReadings([]);
    setNextId(1);
  };

  // ── Live dB display risk ───────────────────────────────────────────────────
  const liveRisk = liveDb != null ? getRiskLevel(liveDb) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.box, { borderColor: t.colors.border }]}>

      {/* Header */}
      <StemText variant="h2">🔊 Sound Pollution Hunter</StemText>
      <StemText variant="small" style={{ color: t.colors.muted }}>
        Measure noise from different classroom actions and compare sound levels.
      </StemText>

      {ttsEnabled && speak && isSpeaking && (
        <SpeakButton
          id="sound-warning"
          text={WARNING_TEXT}
          isSpeaking={isSpeaking("sound-warning")}
          onPress={() => speak("sound-warning", WARNING_TEXT)}
        />
      )}

      {/* ── Action name input ── */}
      <StemText variant="body" style={{ marginTop: 8 }}>
        What action are you testing?
      </StemText>
      <TextInput
        style={[
          styles.input,
          { borderColor: t.colors.border, color: t.colors.text, backgroundColor: t.colors.card },
        ]}
        placeholder={`e.g. Dropping a book, Talking, Stamping feet…`}
        placeholderTextColor={t.colors.muted}
        value={actionName}
        onChangeText={setActionName}
        editable={!measuring}
      />

      {/* ── Sample button ── */}
      <StemButton
        title={measuring ? "Sampling… (3 sec)" : "▶ Sample 3 Seconds"}
        onPress={start}
        disabled={measuring}
      />

      {/* ── Live dB meter ── */}
      {measuring && liveDb != null && liveRisk && (
        <View style={[styles.liveMeter, { backgroundColor: liveRisk.color + "22", borderColor: liveRisk.color }]}>
          <StemText variant="h1" style={{ color: liveRisk.color, textAlign: "center", fontSize: 52 }}>
            {liveDb} dB
          </StemText>
          <StemText variant="small" style={{ color: liveRisk.color, textAlign: "center" }}>
            {liveRisk.emoji} {liveRisk.label}
          </StemText>
        </View>
      )}

      {measuring && liveDb == null && (
        <View style={[styles.liveMeter, { borderColor: t.colors.border }]}>
          <StemText variant="body" style={{ textAlign: "center", color: t.colors.muted }}>
            Listening…
          </StemText>
        </View>
      )}

      {/* ── Results table ── */}
      {readings.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <View style={styles.tableHeaderRow}>
            <StemText variant="small" style={[styles.colAction, styles.tableHeader]}>#</StemText>
            <StemText variant="small" style={[styles.colAction, styles.tableHeader]}>Action</StemText>
            <StemText variant="small" style={[styles.colDb, styles.tableHeader]}>dB</StemText>
            <StemText variant="small" style={[styles.colRisk, styles.tableHeader]}>Risk</StemText>
          </View>

          {readings.map((r) => {
            const risk = getRiskLevel(r.db);
            return (
              <View key={r.id} style={[styles.tableRow, { borderColor: t.colors.border }]}>
                <StemText variant="small" style={styles.colAction}>{r.id}</StemText>
                <StemText variant="small" style={styles.colAction}>{r.actionName}</StemText>
                <StemText variant="small" style={[styles.colDb, { color: risk.color, fontWeight: "bold" }]}>
                  {r.db}
                </StemText>
                <StemText variant="small" style={[styles.colRisk, { color: risk.color }]}>
                  {risk.emoji} {risk.label}
                </StemText>
              </View>
            );
          })}

          {/* GPS location note under table */}
          {readings.some((r) => r.location) && (
            <StemText variant="small" style={{ color: t.colors.muted, marginTop: 4 }}>
              📍 Locations recorded for each sample.
            </StemText>
          )}

          <TouchableOpacity onPress={clearReadings} style={styles.clearBtn}>
            <StemText variant="small" style={{ color: t.colors.muted }}>
              Clear all readings
            </StemText>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Spec dB risk reference table ── */}
      <View style={{ marginTop: 16 }}>
        <StemText variant="body" style={{ fontWeight: "bold", marginBottom: 4 }}>
          Sound Levels & Hearing Damage Risk
        </StemText>
        {DB_RISK_LEVELS.filter((r) => r.max !== Infinity || r.min === 130).map((r, i) => (
          <View key={i} style={[styles.riskRow, { borderLeftColor: r.color }]}>
            <StemText variant="small" style={{ color: r.color, fontWeight: "bold", width: 90 }}>
              {r.min}–{r.max === Infinity ? "140+" : r.max} dB
            </StemText>
            <StemText variant="small" style={{ flex: 1, color: t.colors.text }}>
              {r.emoji} {r.label}
            </StemText>
          </View>
        ))}
      </View>
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  liveMeter: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginVertical: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 4,
    gap: 4,
  },
  tableHeader: {
    fontWeight: "bold",
    opacity: 0.6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 6,
    gap: 4,
    alignItems: "flex-start",
  },
  colAction: {
    width: 40,
  },
  colDb: {
    width: 50,
  },
  colRisk: {
    flex: 1,
  },
  riskRow: {
    flexDirection: "row",
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 3,
    gap: 6,
    alignItems: "flex-start",
    marginBottom: 2,
  },
  clearBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
  },
});