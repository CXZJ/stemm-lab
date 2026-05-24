import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";
import { Audio } from "expo-av";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

const WARNING_TEXT = "85 decibels or more sustained can risk hearing over time. Classroom peaks are usually brief — still avoid very loud tests near ears.";

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
  const [measuring, setMeasuring] = useState(false);
  const lastDb = useRef(55);

  const start = async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    try {
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await rec.startAsync();
      setMeasuring(true);
      const iv = setInterval(async () => {
        const st = await rec.getStatusAsync();
        if (!st.isRecording) return;
        const m = "metering" in st && typeof st.metering === "number" ? st.metering : null;
        if (m != null) {
          lastDb.current = Math.max(30, Math.min(120, 60 + m * 2));
        }
      }, 100);
      setTimeout(async () => {
        clearInterval(iv);
        await rec.stopAndUnloadAsync();
        setMeasuring(false);
        onUpdate({ dbRaw: Math.round(lastDb.current * 10) / 10, readingLabel: "approximate" });
      }, 3000);
    } catch {
      setMeasuring(false);
      onUpdate({ dbRaw: 50, readingLabel: "approximate" });
    }
  };

  return (
    <View style={[styles.box, { borderColor: t.colors.border }]}>
      <StemText variant="h2">Sound sampler</StemText>
      <StemText variant="small" style={{ color: t.colors.muted }}>
        ~85 dB+ sustained can risk hearing over time. Classroom peaks are usually brief — still avoid very loud tests near ears.
      </StemText>
      {ttsEnabled && speak && isSpeaking && (
        <SpeakButton
          id="sound-warning"
          text={WARNING_TEXT}
          isSpeaking={isSpeaking("sound-warning")}
          onPress={() => speak("sound-warning", WARNING_TEXT)}
        />
      )}
      <StemButton
        title={measuring ? "Sampling…" : "Sample 3 seconds"}
        onPress={start}
        disabled={measuring}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 8 },
});