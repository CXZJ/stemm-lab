import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { Controller, useForm } from "react-hook-form";
import { TextInput, StyleSheet } from "react-native";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { useAuthStore } from "@/store/authStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export default function SignUpScreen() {
  const t = useStemTheme();
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const err = useAuthStore((s) => s.error);
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  return (
    <Screen>
      <StemText variant="h1">Join STEMM Lab</StemText>
      {err ? (
        <StemText variant="small" style={{ color: t.colors.danger, marginBottom: 8 }}>
          {err}
        </StemText>
      ) : null}
      <StemText variant="body">Your first name or nickname</StemText>
      <Controller
        control={control}
        name="displayName"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
          />
        )}
      />
      <StemText variant="body" style={{ marginTop: 12 }}>
        Email
      </StemText>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
          />
        )}
      />
      <StemText variant="body" style={{ marginTop: 12 }}>
        Password
      </StemText>
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            secureTextEntry
            style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
          />
        )}
      />
      <StemButton
        title="Create account"
        onPress={handleSubmit(async (v) => {
          await signUp(v.email, v.password, v.displayName);
          router.replace("/");
        })}
        style={{ marginTop: 20 }}
      />
      <Link href={href("/(auth)/sign-in")} asChild>
        <StemButton title="Already have an account?" variant="ghost" />
      </Link>
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
