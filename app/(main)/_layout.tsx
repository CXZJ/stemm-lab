import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="activity/[activityId]/index" options={{ title: "Activity" }} />
      <Stack.Screen name="activity/[activityId]/attempt" options={{ title: "Attempt" }} />
      <Stack.Screen name="activity/[activityId]/history" options={{ title: "History" }} />
      <Stack.Screen name="attempt/[attemptId]/review" options={{ title: "Review" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="sync-queue" options={{ title: "Sync queue" }} />
      <Stack.Screen name="debug" options={{ title: "Debug" }} />
    </Stack>
  );
}
