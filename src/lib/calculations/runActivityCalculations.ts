import type { ActivityConfig, CalculationModule } from "@/types/activity-config";
import type { CalculationResult } from "@/types/models";
import {
  accelerationFromVelocityDistance,
  dragForceEstimate,
  fanStiffnessProxy,
  finalVelocityFromHeight,
  gForceFromStop,
  G,
  netForce,
} from "@/lib/calculations/physics";
import { newId } from "@/lib/id";

function num(data: Record<string, unknown>, key: string): number {
  const v = data[key];
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return parseFloat(v) || 0;
  return 0;
}

function runOne(
  attemptId: string,
  mod: CalculationModule,
  data: Record<string, unknown>,
): CalculationResult | null {
  const inputs = mod.inputFieldIds;
  switch (mod.formulaKey) {
    case "parachute_v_final": {
      const h = num(data, inputs[0] ?? "dropHeightM");
      const v = finalVelocityFromHeight(h);
      return {
        id: "",
        attemptId,
        moduleId: mod.id,
        label: mod.title,
        value: Math.round(v * 1000) / 1000,
        unit: "m/s",
        details: `√(2×9.81×${h}m)`,
      };
    }
    case "parachute_accel": {
      const v = num(data, inputs[0] ?? "impactSpeedMs");
      const d = num(data, inputs[1] ?? "dropHeightM");
      const a = accelerationFromVelocityDistance(v, d);
      return {
        id: "",
        attemptId,
        moduleId: mod.id,
        label: mod.title,
        value: Math.round(a * 1000) / 1000,
        unit: "m/s²",
      };
    }
    case "parachute_net_force": {
      const m = num(data, inputs[0] ?? "massKg");
      const a = num(data, inputs[1] ?? "accelMs2");
      return {
        id: "",
        attemptId,
        moduleId: mod.id,
        label: mod.title,
        value: Math.round(netForce(m, a) * 1000) / 1000,
        unit: "N",
      };
    }
    case "parachute_drag": {
      const m = num(data, inputs[0] ?? "massKg");
      const a = num(data, inputs[1] ?? "measuredAccel");
      const d = dragForceEstimate(m, G, a);
      return {
        id: "",
        attemptId,
        moduleId: mod.id,
        label: mod.title,
        value: Math.round(d * 1000) / 1000,
        unit: "N",
      };
    }
    case "parachute_g_stop": {
      const dv = num(data, inputs[0] ?? "deltaVStop");
      const dt = num(data, inputs[1] ?? "deltaTStop");
      const g = gForceFromStop(dv, dt);
      return {
        id: "",
        attemptId,
        moduleId: mod.id,
        label: mod.title,
        value: Math.round(g * 1000) / 1000,
        unit: "g",
      };
    }
    case "fan_stiffness": {
      const ang = num(data, inputs[0] ?? "bendAngleDeg");
      const dist = num(data, inputs[1] ?? "fanDistanceCm");
      const s = fanStiffnessProxy(ang, dist);
      return {
        id: "",
        attemptId,
        moduleId: mod.id,
        label: mod.title,
        value: Math.round(s * 100) / 100,
        unit: "proxy",
      };
    }
    case "sound_db_adjusted": {
      const raw = num(data, inputs[0] ?? "dbRaw");
      const cal = num(data, inputs[1] ?? "calibrationOffsetDb");
      return {
        id: "",
        attemptId,
        moduleId: mod.id,
        label: mod.title,
        value: Math.round((raw + cal) * 10) / 10,
        unit: "dB (approx)",
      };
    }
    case "breathing_bpm": {
      const breaths = num(data, inputs[0] ?? "breathCount");
      const secs = num(data, inputs[1] ?? "sampleDurationSec");
      if (secs <= 0) return null;
      const bpm = (breaths / secs) * 60;
      return {
        id: "",
        attemptId,
        moduleId: mod.id,
        label: mod.title,
        value: Math.round(bpm * 10) / 10,
        unit: "breaths/min",
      };
    }
    case "reaction_mean_ms": {
      const samples = inputs.map((k) => num(data, k)).filter((n) => n > 0);
      if (!samples.length) return null;
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      return {
        id: "",
        attemptId,
        moduleId: mod.id,
        label: mod.title,
        value: Math.round(mean),
        unit: "ms",
      };
    }
    default:
      return null;
  }
}

export async function runActivityCalculations(
  attemptId: string,
  config: ActivityConfig,
  customData: Record<string, unknown>,
  advancedMode: boolean,
): Promise<CalculationResult[]> {
  const out: CalculationResult[] = [];
  for (const mod of config.calculations) {
    if (mod.advancedOnly && !advancedMode) continue;
    const res = runOne(attemptId, mod, customData);
    if (res) {
      res.id = await newId();
      out.push(res);
    }
  }
  return out;
}
