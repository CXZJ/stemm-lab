import { Pressable, StyleSheet, View } from "react-native";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";
import { minTouch } from "@/theme/tokens";

export function RoomNoiseMap({
  dbLevel,
  onPickCell,
}: {
  dbLevel: number | null;
  onPickCell: (x: number, y: number) => void;
}) {
  const t = useStemTheme();
  const rows = 6;
  const cols = 6;
  const cells: { x: number; y: number; key: string }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: c / (cols - 1), y: r / (rows - 1), key: `${r}-${c}` });
    }
  }

  const heat = (d: number | null) => {
    if (d == null) return t.colors.border;
    if (d < 55) return "#2A9D8F";
    if (d < 75) return "#F4A261";
    return "#E76F51";
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <StemText variant="h2">Room map</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 8 }}>
        Tap where you measured. Loudness tint uses your last dB reading when set.
      </StemText>
      <View style={styles.grid}>
        {cells.map((cell) => (
          <Pressable
            key={cell.key}
            onPress={() => onPickCell(cell.x, cell.y)}
            style={[
              styles.cell,
              {
                minWidth: minTouch,
                minHeight: minTouch,
                backgroundColor: heat(dbLevel),
                opacity: 0.35,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Room cell column ${cell.x.toFixed(2)} row ${cell.y.toFixed(2)}`}
          />
        ))}
      </View>
      <StemText variant="caption" style={{ color: t.colors.muted }}>
        Tip: with Google Maps API keys configured you can switch to a GPS map for outdoor sessions.
      </StemText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
  },
  cell: {
    flexGrow: 1,
    flexBasis: "14%",
    borderRadius: 8,
    margin: 2,
  },
});
