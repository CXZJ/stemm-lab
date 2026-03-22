import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { Controller, useForm } from "react-hook-form";
import { TextInput, StyleSheet } from "react-native";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { getLocalUserId } from "@/services/localIdentity";
import { useStemTheme } from "@/theme/ThemeProvider";
import { z } from "zod";

const schema = z.object({
  teamName: z.string().min(2, "Enter a team name"),
  gradeLevel: z.string().min(1, "Enter grade or year level"),
  membersRaw: z.string().min(3, "Add at least one first name"),
});

export default function TeamWizardScreen() {
  const t = useStemTheme();
  const router = useRouter();
  const createTeam = useTeamStore((s) => s.createTeam);
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { teamName: "", gradeLevel: "", membersRaw: "" },
  });

  return (
    <Screen>
      <StemText variant="h1">Create your team</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 16 }}>
        Enter a team name, each member&apos;s first name (comma separated), and your grade level. We
        generate a short team code automatically.
      </StemText>
      <StemText variant="body">Team name</StemText>
      <Controller
        control={control}
        name="teamName"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
            accessibilityLabel="Team name"
          />
        )}
      />
      <StemText variant="body" style={{ marginTop: 12 }}>
        Grade / year level
      </StemText>
      <Controller
        control={control}
        name="gradeLevel"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="e.g. Year 6"
            placeholderTextColor={t.colors.muted}
            style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
            accessibilityLabel="Grade level"
          />
        )}
      />
      <StemText variant="body" style={{ marginTop: 12 }}>
        Team member first names (comma separated)
      </StemText>
      <Controller
        control={control}
        name="membersRaw"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Alex, Sam, Jordan"
            placeholderTextColor={t.colors.muted}
            style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
            accessibilityLabel="Member names"
          />
        )}
      />
      <StemButton
        title="Save team"
        style={{ marginTop: 24 }}
        onPress={handleSubmit(async (v) => {
          const memberNames = v.membersRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const uid =
            useAuthStore.getState().firebaseUser?.uid ?? (await getLocalUserId());
          await createTeam({
            name: v.teamName,
            gradeLevel: v.gradeLevel,
            memberNames,
            uid,
            useRemote: isFirebaseConfigured(),
          });
          await useAuthStore.getState().refreshTeamId();
          router.replace(href("/"));
        })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    fontSize: 17,
    minHeight: 48,
  },
});
