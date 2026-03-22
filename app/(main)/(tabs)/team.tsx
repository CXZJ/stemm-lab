import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextInput, StyleSheet } from "react-native";
import { StemButton } from "@/components/ui/StemButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  gradeLevel: z.string().min(1),
  membersRaw: z.string().min(1),
});

export default function TeamScreen() {
  const t = useStemTheme();
  const team = useTeamStore((s) => s.team);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const { control, reset, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", gradeLevel: "", membersRaw: "" },
  });

  useEffect(() => {
    if (team) {
      reset({
        name: team.name,
        gradeLevel: team.gradeLevel,
        membersRaw: team.memberNames.join(", "),
      });
    }
  }, [team, reset]);

  if (!team) {
    return (
      <Screen>
        <StemText variant="body">No team profile yet.</StemText>
      </Screen>
    );
  }

  return (
    <Screen>
      <StemText variant="h1">Team profile</StemText>
      <StemCard title="Team code">
        <StemText variant="h2" accessibilityLabel={`Team code ${team.discriminator}`}>
          {team.discriminator}
        </StemText>
        <StemText variant="small" style={{ color: t.colors.muted }}>
          Share this code with your teacher to identify submissions.
        </StemText>
      </StemCard>
      <StemCard title="Edit team">
        <StemText variant="body">Team name</StemText>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
            />
          )}
        />
        <StemText variant="body" style={{ marginTop: 12 }}>
          Grade level
        </StemText>
        <Controller
          control={control}
          name="gradeLevel"
          render={({ field: { value, onChange } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
            />
          )}
        />
        <StemText variant="body" style={{ marginTop: 12 }}>
          Members (comma separated)
        </StemText>
        <Controller
          control={control}
          name="membersRaw"
          render={({ field: { value, onChange } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
            />
          )}
        />
        <StemButton
          title="Save changes"
          style={{ marginTop: 16 }}
          onPress={handleSubmit(async (v) => {
            await updateTeam({
              name: v.name,
              gradeLevel: v.gradeLevel,
              memberNames: v.membersRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            });
          })}
        />
      </StemCard>
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
