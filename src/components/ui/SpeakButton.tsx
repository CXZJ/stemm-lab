import { StemText } from "@/components/ui/StemText";
import { StyleSheet, TouchableOpacity } from "react-native";

interface Props {
  id: string;
  text: string;
  isSpeaking: boolean;
  onPress: () => void;
}

export function SpeakButton({ isSpeaking, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={isSpeaking ? "Stop reading" : "Read aloud"}
      style={[styles.button, isSpeaking && styles.buttonActive]}
    >
      <StemText variant="small" style={{ color: "#fff" }}>
        {isSpeaking ? "⏹ Stop" : "🔊 Read aloud"}
      </StemText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#2e86de",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  buttonActive: {
    backgroundColor: "#c0392b",
  },
});