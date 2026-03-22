import { useCallback, useEffect, useState } from "react";
import { StemButton } from "@/components/ui/StemButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { listSyncQueue, type LocalSyncRow } from "@/services/sqlite/syncQueueLocal";
import { processSyncQueueOnce } from "@/services/sync/syncEngine";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function SyncQueueScreen() {
  const t = useStemTheme();
  const [rows, setRows] = useState<LocalSyncRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await listSyncQueue());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <StemText variant="h1">Offline drafts & sync</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 12 }}>
        Pending uploads retry automatically. You can run sync manually anytime.
      </StemText>
      <StemButton
        title={busy ? "Syncing…" : "Retry sync now"}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await processSyncQueueOnce();
          await load();
          setBusy(false);
        }}
      />
      {rows.length === 0 ? (
        <StemText variant="body" style={{ marginTop: 16 }}>
          Queue is empty.
        </StemText>
      ) : (
        rows.map((r) => (
          <StemCard key={r.id} title={r.kind}>
            <StemText variant="small">Status: {r.status}</StemText>
            <StemText variant="caption" style={{ color: t.colors.muted }}>
              Retries: {r.retries}
            </StemText>
            {r.lastError ? (
              <StemText variant="caption" style={{ color: t.colors.danger }}>
                {r.lastError}
              </StemText>
            ) : null}
          </StemCard>
        ))
      )}
    </Screen>
  );
}
