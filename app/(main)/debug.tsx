import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { isFirebaseConfigured } from "@/services/firebase/config";

export default function DebugScreen() {
  return (
    <Screen>
      <StemText variant="h1">Debug</StemText>
      <StemCard title="Firebase">
        <StemText variant="body">
          Configured: {isFirebaseConfigured() ? "yes" : "no — check .env"}
        </StemText>
      </StemCard>
      <StemCard title="Native modules">
        <StemText variant="small">
          This screen is for development. Production builds should disable it or protect it behind a
          feature flag.
        </StemText>
      </StemCard>
    </Screen>
  );
}
