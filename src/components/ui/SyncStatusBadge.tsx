import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";
import type { SyncStatus } from "@/types/models";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

const LABELS: Record<SyncStatus, string> = {
  local_only: "Saved on device",
  pending_upload: "Waiting to upload 🔄", // Added emoji to signal it's a button
  uploading: "Uploading",
  uploaded: "Synced",
  failed: "Needs retry 🔄",
};

interface SyncStatusBadgeProps {
  status: SyncStatus;
  onRetry?: () => Promise<void> | void; // 1. Add optional retry action
}

export function SyncStatusBadge({ status, onRetry }: SyncStatusBadgeProps) {
  const t = useStemTheme();

  const isActionable = (status === "pending_upload" || status === "failed") && !!onRetry;
  const isUploading = status === "uploading";

  const color =
    status === "uploaded"
      ? t.colors.success
      : status === "failed"
        ? t.colors.danger
        : status === "pending_upload" || status === "uploading"
          ? t.colors.warning
          : t.colors.muted;

  // 2. Dynamically use TouchableOpacity if it can be synced, otherwise standard View
  const Container = isActionable ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.wrap, { borderColor: color }, isActionable && styles.actionable]}
      accessibilityLabel={`Sync status: ${LABELS[status]}`}
      onPress={isActionable ? onRetry : undefined}
      activeOpacity={0.7}
    >
      {isUploading && (
        <ActivityIndicator size="small" color={color} style={styles.loader} />
      )}
      <StemText variant="caption" style={{ color, fontWeight: "600" }}>
        {LABELS[status]}
      </StemText>
    </Container>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  actionable: {
    borderStyle: "dashed", // Gives a visual hint that it can be interacted with
  },
  loader: {
    marginRight: 4,
  },
});