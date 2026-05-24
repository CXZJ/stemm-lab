import { Screen } from "@/components/ui/Screen";
import { StemButton } from "@/components/ui/StemButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { Profanity } from "@2toad/profanity";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TextInput } from "react-native";
import { z } from "zod";

const profanity = new Profanity({ languages: ["en", "de"] });

const schema = z.object({
  name: z
    .string()
    .min(3, "Team name must be at least 3 characters.")
    .max(30, "Team name must be 30 characters or less.")
    .refine((v) => !profanity.exists(v), {
      message: "Team name contains inappropriate language.",
    }),
  gradeLevel: z.string().min(1, "Grade level is required."),
  membersRaw: z
    .string()
    .min(1, "Please add at least one member.")
    .refine(
      (v) => {
        const names = v.split(",").map((s) => s.trim()).filter(Boolean);
        return names.every((name) => !profanity.exists(name));
      },
      { message: "One or more member names contain inappropriate language." }
    ),
});

export default function TeamScreen() {
  const t = useStemTheme();
  const team = useTeamStore((s) => s.team);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
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
              maxLength={30}
              autoCapitalize="words"
              style={[
                styles.input,
                { color: t.colors.text, borderColor: errors.name ? "#ff4d4d" : t.colors.border },
              ]}
            />
          )}
        />
        {errors.name && (
          <StemText variant="small" style={styles.error}>
            {errors.name.message}
          </StemText>
        )}

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
              style={[
                styles.input,
                { color: t.colors.text, borderColor: errors.gradeLevel ? "#ff4d4d" : t.colors.border },
              ]}
            />
          )}
        />
        {errors.gradeLevel && (
          <StemText variant="small" style={styles.error}>
            {errors.gradeLevel.message}
          </StemText>
        )}

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
              style={[
                styles.input,
                { color: t.colors.text, borderColor: errors.membersRaw ? "#ff4d4d" : t.colors.border },
              ]}
            />
          )}
        />
        {errors.membersRaw && (
          <StemText variant="small" style={styles.error}>
            {errors.membersRaw.message}
          </StemText>
        )}

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
  error: {
    color: "#ff4d4d",
    marginTop: 4,
  },
});