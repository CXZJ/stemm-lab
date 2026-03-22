import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Switch, TextInput, StyleSheet, View } from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { getActivityConfig } from "@/activities";
import { CameraCaptureModal } from "@/components/activity/CameraCaptureModal";
import { BreathingFlow } from "@/components/activity/extensions/BreathingFlow";
import { ReactionBoardFlow } from "@/components/activity/extensions/ReactionBoardFlow";
import { RoomNoiseMap } from "@/components/activity/extensions/RoomNoiseMap";
import { SoundMeterPanel } from "@/components/activity/extensions/SoundMeterPanel";
import { StemButton } from "@/components/ui/StemButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { useActivitySubmit, buildReflections } from "@/hooks/useActivitySubmit";
import { useAccelSample } from "@/hooks/useAccelSample";
import { newId } from "@/lib/id";
import { runActivityCalculations } from "@/lib/calculations/runActivityCalculations";
import { upsertLocalAttempt } from "@/services/sqlite/attemptsLocal";
import { useSettingsStore } from "@/store/settingsStore";
import { useTeamStore } from "@/store/teamStore";
import { useAuthStore } from "@/store/authStore";
import type { ActivityConfig, CustomField } from "@/types/activity-config";
import type { ActivityAttempt, SensorReading } from "@/types/models";
import { useStemTheme } from "@/theme/ThemeProvider";
import { minTouch } from "@/theme/tokens";

function buildDefaults(config: ActivityConfig): Record<string, string> {
  const d: Record<string, string> = {};
  for (const f of config.customFields) {
    if (f.type === "boolean") {
      d[f.id] =
        f.defaultValue === true ? "true" : f.defaultValue === false ? "false" : "false";
    } else if (f.defaultValue !== undefined && f.defaultValue !== null) {
      d[f.id] = String(f.defaultValue);
    } else {
      d[f.id] = "";
    }
  }
  return d;
}

function coerceCustomData(
  config: ActivityConfig,
  raw: Record<string, string>,
  advanced: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of config.customFields) {
    if (f.advancedOnly && !advanced) continue;
    const v = raw[f.id];
    if (v === "" || v === undefined) continue;
    if (f.type === "number" || f.type === "timer_sec") {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) out[f.id] = n;
    } else if (f.type === "boolean") {
      out[f.id] = v === "true";
    } else {
      out[f.id] = v;
    }
  }
  return out;
}

function FieldEditor({
  f,
  simple,
  control,
  colors,
}: {
  f: CustomField;
  simple: boolean;
  control: any;
  colors: { text: string; border: string; muted: string };
}) {
  const label = simple && f.labelSimple ? f.labelSimple : f.label;
  if (f.advancedOnly && simple) return null;

  if (f.type === "boolean") {
    return (
      <View style={styles.fieldRow} key={f.id}>
        <StemText variant="body" style={{ flex: 1 }}>
          {label}
        </StemText>
        <Controller
          control={control}
          name={f.id}
          render={({ field: { value, onChange } }) => (
            <Switch
              value={value === "true"}
              onValueChange={(x) => onChange(x ? "true" : "false")}
              accessibilityLabel={label}
            />
          )}
        />
      </View>
    );
  }

  if (f.type === "select" && f.options?.length) {
    return (
      <View key={f.id} style={{ marginBottom: 12 }}>
        <StemText variant="body" style={{ marginBottom: 6 }}>
          {label}
        </StemText>
        <Controller
          control={control}
          name={f.id}
          render={({ field: { value, onChange } }) => (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {f.options!.map((opt) => (
                <StemButton
                  key={opt.value}
                  title={opt.label}
                  variant={value === opt.value ? "primary" : "secondary"}
                  onPress={() => onChange(opt.value)}
                />
              ))}
            </View>
          )}
        />
      </View>
    );
  }

  if (f.type === "textarea") {
    return (
      <View key={f.id} style={{ marginBottom: 12 }}>
        <StemText variant="body" style={{ marginBottom: 6 }}>
          {label}
        </StemText>
        <Controller
          control={control}
          name={f.id}
          render={({ field: { value, onChange } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              multiline
              placeholder={f.placeholder}
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                styles.textArea,
                { color: colors.text, borderColor: colors.border },
              ]}
              accessibilityLabel={label}
            />
          )}
        />
      </View>
    );
  }

  return (
    <View key={f.id} style={{ marginBottom: 12 }}>
      <StemText variant="body" style={{ marginBottom: 6 }}>
        {label}
        {f.unit ? ` (${f.unit})` : ""}
      </StemText>
      <Controller
        control={control}
        name={f.id}
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            keyboardType={f.type === "number" || f.type === "timer_sec" ? "decimal-pad" : "default"}
            placeholder={f.placeholder}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, minHeight: minTouch }]}
            accessibilityLabel={label}
          />
        )}
      />
    </View>
  );
}

export function ActivityEngine({ activityId }: { activityId: string }) {
  const t = useStemTheme();
  const router = useRouter();
  const team = useTeamStore((s) => s.team);
  const user = useAuthStore((s) => s.firebaseUser);
  const simple = useSettingsStore((s) => s.primarySchoolMode);
  const config = getActivityConfig(activityId);
  const defaults = useMemo(() => (config ? buildDefaults(config) : {}), [config]);
  const { control, handleSubmit, reset } = useForm<Record<string, string>>({
    defaultValues: defaults,
  });

  useEffect(() => {
    if (config) reset(buildDefaults(config));
  }, [activityId, config, reset]);

  const [ext, setExt] = useState<Record<string, unknown>>({});
  const [pendingMedia, setPendingMedia] = useState<
    { localUri: string; kind: "photo" | "video" | "audio"; contentType: string }[]
  >([]);
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [reflectionTexts, setReflectionTexts] = useState<Record<string, string>>({});
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [capture, setCapture] = useState<null | "photo" | "video">(null);
  const [elapsed, setElapsed] = useState(0);
  const { submit, busy } = useActivitySubmit(activityId);
  const accel = useAccelSample();

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [activityId]);

  useEffect(() => {
    const m = accel.maxMag;
    if (m == null) return;
    void (async () => {
      const reading: SensorReading = {
        id: await newId(),
        attemptId: "pending",
        sensorType: "accelerometer",
        timestamp: Date.now(),
        values: { magnitude: m },
      };
      setSensors((s) => [...s, reading]);
      setExt((e) => ({
        ...e,
        accelMagnitudeMax: Math.round(m * 1000) / 1000,
        vibrationProxy: Math.round(m * 1000) / 1000,
      }));
    })();
  }, [accel.maxMag]);

  if (!config || !team) {
    return (
      <Screen>
        <StemText variant="body">Missing activity or team.</StemText>
      </Screen>
    );
  }

  const advanced = !simple;
  const limit = config.timer.sessionLimitSec;
  const overLimit = limit != null && elapsed > limit;

  const mergePatch = (patch: Record<string, number | string>) => {
    setExt((e) => ({ ...e, ...patch }));
  };

  const onSaveDraft = handleSubmit(async (raw) => {
    const draftId = `draft_${team.id}_${activityId}`;
    const customData = { ...coerceCustomData(config, raw, advanced), ...ext };
    const partial: ActivityAttempt = {
      id: draftId,
      activityId,
      teamId: team.id,
      teamName: team.name,
      createdByUid: user?.uid ?? "draft",
      gradeLevel: team.gradeLevel,
      syncStatus: "local_only",
      startedAt: Date.now(),
      customData,
      calculations: [],
      sensorReadings: sensors,
      media: [],
      reflections: [],
      ratings: [],
      comments: [],
    };
    await upsertLocalAttempt({
      id: draftId,
      activityId,
      teamId: team.id,
      userId: user?.uid ?? "local",
      payload: partial,
      syncStatus: "local_only",
    });
  });

  const onSubmit = handleSubmit(async (raw) => {
    const attemptId = await newId();
    const customData = { ...coerceCustomData(config, raw, advanced), ...ext };
    const reflections = await buildReflections(
      simple && config.reflectionPromptsSimple?.length
        ? config.reflectionPromptsSimple
        : config.reflectionPrompts,
      reflectionTexts,
      attemptId,
    );
    const calcs = await runActivityCalculations(attemptId, config, customData, advanced);
    await submit({
      attemptId,
      config,
      customData,
      calculations: calcs,
      sensorReadings: sensors,
      pendingMedia,
      reflections,
      ratings:
        stars > 0
          ? [
              {
                id: await newId(),
                attemptId,
                stars,
                createdAt: Date.now(),
              },
            ]
          : [],
      comments:
        comment.trim().length > 0
          ? [
              {
                id: await newId(),
                attemptId,
                teamId: team.id,
                authorUid: user?.uid ?? "local",
                text: comment.trim(),
                createdAt: Date.now(),
              },
            ]
          : [],
      advancedMode: advanced,
      durationSec: elapsed,
    });
    router.replace(href(`/(main)/activity/${activityId}/history`));
  });

  const captureGps = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({});
    const reading: SensorReading = {
      id: await newId(),
      attemptId: "pending",
      sensorType: "location",
      timestamp: Date.now(),
      values: { lat: pos.coords.latitude, lon: pos.coords.longitude },
    };
    setSensors((s) => [...s, reading]);
  };

  const captureAccel = async () => {
    accel.start(2500);
  };

  const dbForMap =
    typeof ext.dbRaw === "number"
      ? ext.dbRaw
      : typeof ext.dbRaw === "string"
        ? parseFloat(ext.dbRaw)
        : null;

  return (
    <Screen
      footer={
        <View style={[styles.footer, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
          <StemButton title="Save draft" variant="secondary" onPress={onSaveDraft} />
          <StemButton
            title="Submit attempt"
            loading={busy}
            onPress={onSubmit}
            disabled={overLimit}
          />
        </View>
      }
    >
      <StemText variant="h1" accessibilityRole="header">
        {config.title}
      </StemText>
      <StemText variant="small" style={{ color: t.colors.muted }}>
        {config.subjectArea}
      </StemText>
      {config.timer.showStopwatch !== false && (
        <StemCard>
          <StemText variant="body">
            Session timer: {Math.floor(elapsed / 60)}:
            {(elapsed % 60).toString().padStart(2, "0")}
          </StemText>
          {limit != null && (
            <StemText variant="caption" style={{ color: overLimit ? t.colors.danger : t.colors.muted }}>
              {simple
                ? `Try to finish your tests in about ${Math.floor(limit / 60)} minutes.`
                : `Session guidance: ${Math.floor(limit / 60)} min (${limit}s) window.`}
            </StemText>
          )}
        </StemCard>
      )}

      <StemCard title={simple ? "What to do" : "Instructions"}>
        <StemText variant="body">{simple ? config.instructionsSimple : config.instructions}</StemText>
      </StemCard>

      <StemCard title={simple ? "Tools" : "Equipment"}>
        {config.equipment.map((item) => (
          <StemText key={item} variant="small">
            • {item}
          </StemText>
        ))}
      </StemCard>

      {config.nativeExtension === "reaction_board" && (
        <ReactionBoardFlow simple={simple} onUpdate={mergePatch} />
      )}
      {config.nativeExtension === "breathing" && (
        <BreathingFlow simple={simple} onUpdate={mergePatch} />
      )}
      {config.nativeExtension === "sound_hunter" && (
        <>
          <SoundMeterPanel onUpdate={mergePatch} />
          <RoomNoiseMap
            dbLevel={dbForMap}
            onPickCell={(x, y) => mergePatch({ roomX: x, roomY: y })}
          />
        </>
      )}

      {config.sensorRequirements.map((req) => (
        <StemCard key={req.id} title={simple ? req.labelSimple ?? req.label : req.label}>
          {req.kind === "gps" && (
            <StemButton title="Tag GPS location" onPress={() => captureGps()} />
          )}
          {(req.kind === "accelerometer" || req.kind === "motion_smoothness") && (
            <StemButton
              title={accel.sampling ? "Sampling…" : "Record 2.5s motion sample"}
              onPress={captureAccel}
              disabled={accel.sampling}
            />
          )}
        </StemCard>
      ))}

      <StemCard title={simple ? "Your measurements" : "Measurements"}>
        {config.customFields.map((f) => (
          <FieldEditor key={f.id} f={f} simple={simple} control={control} colors={t.colors} />
        ))}
      </StemCard>

      <StemCard title={simple ? "Photos & videos" : "Media evidence"}>
        {config.mediaRequirements.map((m) => (
          <View key={m.id} style={{ marginBottom: 8 }}>
            <StemText variant="small">{simple ? m.labelSimple ?? m.label : m.label}</StemText>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              {m.kind !== "audio" && (
                <StemButton title="Photo" variant="secondary" onPress={() => setCapture("photo")} />
              )}
              {m.kind !== "photo" && (
                <StemButton title="Video" variant="secondary" onPress={() => setCapture("video")} />
              )}
            </View>
          </View>
        ))}
        {pendingMedia.length > 0 && (
          <StemText variant="caption">{pendingMedia.length} file(s) ready to upload</StemText>
        )}
      </StemCard>

      <StemCard title={simple ? "Think about it" : "Reflection"}>
        {(simple && config.reflectionPromptsSimple?.length
          ? config.reflectionPromptsSimple
          : config.reflectionPrompts
        ).map((p) => (
          <View key={p} style={{ marginBottom: 10 }}>
            <StemText variant="small" style={{ marginBottom: 4 }}>
              {p}
            </StemText>
            <TextInput
              multiline
              value={reflectionTexts[p] ?? ""}
              onChangeText={(tx) => setReflectionTexts((s) => ({ ...s, [p]: tx }))}
              style={[styles.input, styles.textArea, { color: t.colors.text, borderColor: t.colors.border }]}
              accessibilityLabel={`Reflection: ${p}`}
            />
          </View>
        ))}
      </StemCard>

      <StemCard title={simple ? "Stars" : "Rate this activity"}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: config.ratingMaxStars }, (_, i) => i + 1).map((n) => (
            <StemButton
              key={n}
              title={`${n}★`}
              variant={stars === n ? "primary" : "ghost"}
              onPress={() => setStars(n)}
            />
          ))}
        </View>
      </StemCard>

      <StemCard title="Team comment">
        <TextInput
          multiline
          value={comment}
          onChangeText={setComment}
          style={[styles.input, styles.textArea, { color: t.colors.text, borderColor: t.colors.border }]}
          accessibilityLabel="Team comment"
        />
      </StemCard>

      <CameraCaptureModal
        visible={capture != null}
        mode={capture ?? "photo"}
        onClose={() => setCapture(null)}
        onCaptured={(uri, mode) => {
          const kind = mode;
          setPendingMedia((p) => [
            ...p,
            {
              localUri: uri,
              kind,
              contentType: kind === "photo" ? "image/jpeg" : "video/mp4",
            },
          ]);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    minHeight: minTouch,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    justifyContent: "space-between",
  },
});
