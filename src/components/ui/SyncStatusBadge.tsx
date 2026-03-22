import { StyleSheet, View } from "react-native";
import { StemText } from "@/components/ui/StemText";
import { useStemTheme } from "@/theme/ThemeProvider";
import type { SyncStatus } from "@/types/models";

const LABELS: Record<SyncStatus, string> = {
  local_only: "Saved on device",
  pending_upload: "Waiting to upload",
  uploading: "Uploading",
  uploaded: "Synced",
  failed: "Needs retry",
};

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const t = useStemTheme();
  const color =
    status === "uploaded"
      ? t.colors.success
      : status === "failed"
        ? t.colors.danger
        : status === "pending_upload" || status === "uploading"
          ? t.colors.warning
          : t.colors.muted;
  return (
    <View
      style={[styles.wrap, { borderColor: color }]}
      accessibilityLabel={`Sync status: ${LABELS[status]}`}
    >
      <StemText variant="caption" style={{ color, fontWeight: "600" }}>
        {LABELS[status]}
      </StemText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
