import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStemTheme } from "@/theme/ThemeProvider";

export function Screen({
  children,
  scroll = true,
  footer,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
}) {
  const t = useStemTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scroll, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.bg }]} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {body}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, padding: 16, paddingBottom: 32 },
});
