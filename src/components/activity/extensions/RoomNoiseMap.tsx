import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";
import { minTouch } from "@/theme/tokens";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

const DESCRIPTION = "Tap a cell after each sound reading to mark that spot on the map.";

export function RoomNoiseMap({
  dbLevel,
  onPickCell,
  ttsEnabled,
  speak,
  isSpeaking,
}: {
  dbLevel: number | null;
  onPickCell: (x: number, y: number) => void;
  ttsEnabled?: boolean;
  speak?: (id: string, text: string) => void;
  isSpeaking?: (id: string) => boolean;
}) {
  const t = useStemTheme();
  const rows = 6;
  const cols = 6;

  // Each cell stores its own dB reading when tapped
  const [cellReadings, setCellReadings] = useState<Record<string, number>>({});

  const cells: { x: number; y: number; key: string }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: c / (cols - 1), y: r / (rows - 1), key: `${r}-${c}` });
    }
  }

  const heat = (d: number | null) => {
    if (d == null) return t.colors.border; // untapped = grey
    if (d < 55) return "#2A9D8F";          // quiet = teal
    if (d < 75) return "#F4A261";          // moderate = orange  
    return "#E76F51";                       // loud = red
  };

  const handleCellPress = (cell: { x: number; y: number; key: string }) => {
    if (dbLevel != null) {
      // Save current dB reading to THIS cell only
      setCellReadings((prev) => ({ ...prev, [cell.key]: dbLevel }));
    }
    onPickCell(cell.x, cell.y);
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <StemText variant="h2">Room map</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 8 }}>
        {DESCRIPTION}
      </StemText>
      {ttsEnabled && speak && isSpeaking && (
        <SpeakButton
          id="roommap-desc"
          text={DESCRIPTION}
          isSpeaking={isSpeaking("roommap-desc")}
          onPress={() => speak("roommap-desc", DESCRIPTION)}
        />
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: "#2A9D8F" }]} />
        <StemText variant="caption">Quiet (&lt;55dB)</StemText>
        <View style={[styles.legendDot, { backgroundColor: "#F4A261" }]} />
        <StemText variant="caption">Moderate (55–75dB)</StemText>
        <View style={[styles.legendDot, { backgroundColor: "#E76F51" }]} />
        <StemText variant="caption">Loud (&gt;75dB)</StemText>
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const cellDb = cellReadings[cell.key] ?? null;
          const isTapped = cellDb != null;
          return (
            <Pressable
              key={cell.key}
              onPress={() => handleCellPress(cell)}
              style={[
                styles.cell,
                {
                  minWidth: minTouch,
                  minHeight: minTouch,
                  backgroundColor: heat(cellDb),
                  opacity: isTapped ? 1 : 0.25, // untapped cells are faded
                  borderWidth: isTapped ? 2 : 1,
                  borderColor: isTapped ? "#fff" : t.colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Room cell, ${isTapped ? `${cellDb} dB recorded` : "not yet measured"}`}
            />
          );
        })}
      </View>

      {dbLevel == null && (
        <StemText variant="caption" style={{ color: t.colors.muted, marginTop: 4 }}>
          Take a sound reading first, then tap a cell to mark it.
        </StemText>
      )}
      {dbLevel != null && (
        <StemText variant="caption" style={{ color: t.colors.muted, marginTop: 4 }}>
          Ready to mark — tap a cell to record {dbLevel} dB at that spot.
        </StemText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "center" },
  cell: { flexGrow: 1, flexBasis: "14%", borderRadius: 8, margin: 2 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
});