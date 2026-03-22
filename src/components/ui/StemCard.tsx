import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";

export function StemCard({
  title,
  subtitle,
  onPress,
  children,
  footer,
}: {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const t = useStemTheme();
  const Inner = (
    <View style={[styles.card, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
      {title ? (
        <StemText variant="h2" accessibilityRole="header">
          {title}
        </StemText>
      ) : null}
      {subtitle ? (
        <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 8 }}>
          {subtitle}
        </StemText>
      ) : null}
      {children}
      {footer}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        {Inner}
      </Pressable>
    );
  }
  return Inner;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
