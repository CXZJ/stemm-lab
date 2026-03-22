import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { isRunningInExpoGo } from "@/lib/expoGo";
import { processSyncQueueOnce } from "@/services/sync/syncEngine";

export const BACKGROUND_SYNC_TASK = "STEMM_LAB_BACKGROUND_SYNC";

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const { processed } = await processSyncQueueOnce();
    return processed > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  if (isRunningInExpoGo()) return;
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (registered) return;
  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
