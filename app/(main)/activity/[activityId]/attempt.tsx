import { useLocalSearchParams } from "expo-router";
import { ActivityEngine } from "@/components/activity/ActivityEngine";

export default function ActivityAttemptScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  if (!activityId) return null;
  return <ActivityEngine activityId={activityId} />;
}
