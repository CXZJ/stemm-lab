import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";
import { minTouch } from "@/theme/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = Omit<PressableProps, "style" | "children"> & {
  title?: string;
  children?: ReactNode;
  loading?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
};

export function StemButton({
  title,
  children,
  loading,
  variant = "primary",
  style,
  disabled,
  ...pressableRest
}: Props) {
  const t = useStemTheme();
  const bg =
    variant === "primary"
      ? t.colors.primary
      : variant === "danger"
        ? t.colors.danger
        : variant === "secondary"
          ? t.colors.card
          : "transparent";
  const border =
    variant === "secondary" ? { borderWidth: 2, borderColor: t.colors.primary } : {};
  const fg =
    variant === "secondary" || variant === "ghost" ? t.colors.primary : "#FFFFFF";

  return (
    <Pressable
      {...pressableRest}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: pressed ? 0.9 : 1 },
        border,
        disabled ? { opacity: 0.45 } : null,
        style,
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <StemText variant="body" style={{ color: fg, fontWeight: "700" }}>
            {title ?? children}
          </StemText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouch,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  inner: { alignItems: "center", justifyContent: "center" },
});
