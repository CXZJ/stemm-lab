import {
  ACTIVITY_BY_ID as BY_ID,
  ALL_ACTIVITIES as ALL,
  breathingPace,
  earthquakeStructure,
  handFan,
  humanPerformance,
  parachuteDrop,
  reactionBoard,
  soundPollution,
} from "@/activities/definitions";
import type { ActivityConfig } from "@/types/activity-config";

export {
  ALL as ALL_ACTIVITIES,
  BY_ID as ACTIVITY_BY_ID,
  breathingPace,
  earthquakeStructure,
  handFan,
  humanPerformance,
  parachuteDrop,
  reactionBoard,
  soundPollution,
};

export function getActivityConfig(id: string): ActivityConfig | undefined {
  return BY_ID[id];
}
