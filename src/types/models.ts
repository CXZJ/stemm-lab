/**
 * Firestore-aligned domain models for STEMM Lab.
 */

export type SyncStatus =
  | "local_only"
  | "pending_upload"
  | "uploading"
  | "uploaded"
  | "failed";

export interface User {
  id: string;
  email: string;
  displayName?: string;
  teamId?: string;
  gradeLevel?: string;
  createdAt: number;
}

export interface Team {
  id: string;
  name: string;
  discriminator: string;
  gradeLevel: string;
  memberNames: string[];
  createdByUid: string;
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  firstName: string;
  gradeLevel?: string;
}

export interface ActivityDefinition {
  id: string;
  title: string;
  subjectArea: string;
  description: string;
}

export interface AttemptMedia {
  id: string;
  attemptId: string;
  teamId: string;
  /** Firebase Storage object path (set after upload). */
  storagePath: string;
  contentType: string;
  kind: "video" | "photo" | "audio";
  durationSec?: number;
  createdAt: number;
  /** Local file URI before upload completes (offline-first). */
  localUri?: string;
}

export interface SensorReading {
  id: string;
  attemptId: string;
  sensorType: "accelerometer" | "gyroscope" | "location" | "audio_level";
  timestamp: number;
  values: Record<string, number>;
  rawNote?: string;
}

export interface CalculationResult {
  id: string;
  attemptId: string;
  moduleId: string;
  label: string;
  value: number;
  unit?: string;
  details?: string;
}

export interface Reflection {
  id: string;
  attemptId: string;
  prompt: string;
  text: string;
  createdAt: number;
}

export interface Rating {
  id: string;
  attemptId: string;
  stars: number;
  category?: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  attemptId: string;
  teamId: string;
  authorUid: string;
  authorName?: string;
  text: string;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "challenge" | "leaderboard" | "sync" | "reminder";
  read: boolean;
  createdAt: number;
  data?: Record<string, string>;
}

export interface LeaderboardEntry {
  id: string;
  teamId: string;
  teamName: string;
  activityId: string;
  gradeLevel: string;
  metricValue: number;
  metricLabel: string;
  completionCount: number;
  bestScore: number;
  lastAttemptAt: number;
  updatedAt: number;
}

export interface SyncQueueItem {
  id: string;
  userId: string;
  kind: "attempt" | "media" | "leaderboard";
  attemptId?: string;
  payload: Record<string, unknown>;
  status: SyncStatus;
  retries: number;
  lastError?: string;
  createdAt: number;
}

export interface ActivityAttempt {
  id: string;
  activityId: string;
  teamId: string;
  teamName: string;
  createdByUid: string;
  memberName?: string;
  gradeLevel: string;
  syncStatus: SyncStatus;
  startedAt: number;
  submittedAt?: number;
  durationSec?: number;
  customData: Record<string, unknown>;
  calculations: CalculationResult[];
  sensorReadings: SensorReading[];
  media: AttemptMedia[];
  reflections: Reflection[];
  ratings: Rating[];
  comments: Comment[];
  score?: number;
  duplicateOf?: string;
}
