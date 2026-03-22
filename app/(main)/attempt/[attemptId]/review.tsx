import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { SyncStatusBadge } from "@/components/ui/SyncStatusBadge";
import { getLocalAttempt } from "@/services/sqlite/attemptsLocal";
import type { ActivityAttempt } from "@/types/models";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function AttemptReviewScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const t = useStemTheme();
  const [a, setA] = useState<ActivityAttempt | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    void getLocalAttempt(attemptId).then(setA);
  }, [attemptId]);

  if (!a) {
    return (
      <Screen>
        <StemText variant="body">Loading attempt…</StemText>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <StemText variant="h1">Attempt review</StemText>
        <SyncStatusBadge status={a.syncStatus} />
        <StemCard title="Measurements">
          {Object.entries(a.customData).map(([k, v]) => (
            <StemText key={k} variant="small" style={{ marginBottom: 4 }}>
              {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </StemText>
          ))}
        </StemCard>
        {a.calculations.length > 0 ? (
          <StemCard title="Calculations">
            {a.calculations.map((c) => (
              <StemText key={c.id} variant="small" style={{ marginBottom: 4 }}>
                {c.label}: {c.value} {c.unit ?? ""}
              </StemText>
            ))}
          </StemCard>
        ) : null}
        {a.reflections.length > 0 ? (
          <StemCard title="Reflections">
            {a.reflections.map((r) => (
              <StemText key={r.id} variant="small" style={{ marginBottom: 8 }}>
                {r.prompt}: {r.text}
              </StemText>
            ))}
          </StemCard>
        ) : null}
        {a.comments.length > 0 ? (
          <StemCard title="Comments">
            {a.comments.map((c) => (
              <StemText key={c.id} variant="small">
                {c.text}
              </StemText>
            ))}
          </StemCard>
        ) : null}
        <StemText variant="caption" style={{ color: t.colors.muted, marginTop: 16 }}>
          Media files upload in the background when you are online. Paths:{" "}
          {a.media.map((m) => m.storagePath).join(", ") || "none"}
        </StemText>
      </ScrollView>
    </Screen>
  );
}
