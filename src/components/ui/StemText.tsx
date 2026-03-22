import type { TextProps } from "react-native";
import { Text, StyleSheet } from "react-native";
import { useStemTheme } from "@/theme/ThemeProvider";

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  h2: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  body: { fontSize: 17, lineHeight: 24 },
  small: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18 },
});

export function StemText({
  variant = "body",
  color,
  children,
  style,
  ...rest
}: TextProps & {
  variant?: keyof typeof styles;
  color?: string;
}) {
  const t = useStemTheme();
  return (
    <Text
      style={[styles[variant], { color: color ?? t.colors.text }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
