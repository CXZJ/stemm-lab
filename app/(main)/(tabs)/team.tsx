import { Screen } from "@/components/ui/Screen";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemButton } from "@/components/ui/StemButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { useSpeech } from "@/hooks/useSpeech";
import { useSettingsStore } from "@/store/settingsStore";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { Profanity } from "@2toad/profanity";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
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
  const hydrated = useTeamStore((s) => s.hydrated); // ← add this
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled);
  const { speak, stop, isSpeaking, speakingId } = useSpeech();

  console.log("[TeamScreen] render — hydrated:", hydrated, "team:", team);

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

  // ✅ Still reading from AsyncStorage — show spinner
  if (!hydrated) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={t.colors.primary} />
      </Screen>
    );
  }

  // ✅ Hydrated but genuinely no team exists yet
  if (!team) {
    return (
      <Screen>
        <StemText variant="body">No team profile yet.</StemText>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StemText variant="h1">Team profile</StemText>

        <StemCard
          title="Team code"
          footer={
            ttsEnabled ? (
              <SpeakButton
                id="team-code"
                text={`Your team code is ${team.discriminator}. Share this code with your teacher to identify submissions.`}
                isSpeaking={isSpeaking("team-code")}
                onPress={() =>
                  speak(
                    "team-code",
                    `Your team code is ${team.discriminator}. Share this code with your teacher to identify submissions.`
                  )
                }
              />
            ) : null
          }
        >
          <StemText
            variant="h2"
            accessibilityLabel={`Team code ${team.discriminator}`}
          >
            {team.discriminator}
          </StemText>
          <StemText variant="small" style={{ color: t.colors.muted }}>
            Share this code with your teacher to identify submissions.
          </StemText>
        </StemCard>

        <StemCard
          title="Edit team"
          footer={
            ttsEnabled ? (
              <SpeakButton
                id="team-info"
                text={`Team name: ${team.name}. Grade level: ${team.gradeLevel}. Members: ${team.memberNames.join(", ")}.`}
                isSpeaking={isSpeaking("team-info")}
                onPress={() =>
                  speak(
                    "team-info",
                    `Team name: ${team.name}. Grade level: ${team.gradeLevel}. Members: ${team.memberNames.join(", ")}.`
                  )
                }
              />
            ) : null
          }
        >
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
                  {
                    color: t.colors.text,
                    borderColor: errors.name ? "#ff4d4d" : t.colors.border,
                  },
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
                  {
                    color: t.colors.text,
                    borderColor: errors.gradeLevel ? "#ff4d4d" : t.colors.border,
                  },
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
                  {
                    color: t.colors.text,
                    borderColor: errors.membersRaw ? "#ff4d4d" : t.colors.border,
                  },
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

        {ttsEnabled && speakingId && (
          <TouchableOpacity style={styles.stopAll} onPress={stop}>
            <StemText variant="body" style={{ color: "#fff" }}>
              ⏹ Stop reading
            </StemText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    fontSize: 17,
    minHeight: 48,
    backgroundColor: "transparent",
  },
  error: {
    color: "#ff4d4d",
    marginTop: 4,
  },
  stopAll: {
    backgroundColor: "#555",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
});