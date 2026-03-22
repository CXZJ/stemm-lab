import { StyleSheet, View } from "react-native";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";

/**
 * AdMob is native-only. Web uses this stub so Metro never loads react-native-google-mobile-ads.
 */
export function AdBanner() {
  const t = useStemTheme();
  return (
    <View style={[styles.box, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
      <StemText variant="caption" style={{ color: t.colors.muted, textAlign: "center" }}>
        STEMM Lab targets mobile. Banner ads load in iOS/Android dev and production builds.
      </StemText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
});
