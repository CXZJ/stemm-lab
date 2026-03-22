/**
 * Schema-driven activity definitions consumed by the shared activity engine.
 */

export type MediaKind = "video" | "photo" | "audio";

export interface MediaRequirement {
  id: string;
  kind: MediaKind;
  required: boolean;
  label: string;
  labelSimple?: string;
}

export type SensorKind =
  | "gps"
  | "accelerometer"
  | "gyroscope"
  | "audio_meter"
  | "motion_smoothness";

export interface SensorRequirement {
  id: string;
  kind: SensorKind;
  required: boolean;
  label: string;
  labelSimple?: string;
}

export type CustomFieldType =
  | "number"
  | "text"
  | "textarea"
  | "select"
  | "boolean"
  | "timer_sec";

export interface CustomFieldOption {
  value: string;
  label: string;
}

export interface CustomField {
  id: string;
  label: string;
  labelSimple?: string;
  type: CustomFieldType;
  unit?: string;
  options?: CustomFieldOption[];
  advancedOnly?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string | number | boolean;
}

export interface TimerSettings {
  sessionLimitSec?: number;
  showStopwatch?: boolean;
  showCountdown?: boolean;
  countdownSec?: number;
}

export interface CalculationModule {
  id: string;
  title: string;
  titleSimple?: string;
  /** Key handled in lib/calculations */
  formulaKey: string;
  inputFieldIds: string[];
  advancedOnly?: boolean;
}

export interface LeaderboardScoring {
  /** Field path in customData used for sorting */
  metricFieldId: string;
  higherIsBetter: boolean;
  pointsPerCompletion?: number;
  pointsForImprovement?: number;
}

export interface ActivityConfig {
  id: string;
  title: string;
  subjectArea: string;
  description: string;
  descriptionSimple: string;
  equipment: string[];
  instructions: string;
  instructionsSimple: string;
  timer: TimerSettings;
  mediaRequirements: MediaRequirement[];
  sensorRequirements: SensorRequirement[];
  customFields: CustomField[];
  calculations: CalculationModule[];
  reflectionPrompts: string[];
  reflectionPromptsSimple?: string[];
  ratingMaxStars: number;
  leaderboard: LeaderboardScoring;
  /** Optional native UI extension id */
  nativeExtension?: "reaction_board" | "breathing" | "sound_hunter" | "room_map";
}
