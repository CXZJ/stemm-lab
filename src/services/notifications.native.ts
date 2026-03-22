import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { isFirebaseConfigured } from "@/services/firebase/config";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

export async function registerPushToken(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "STEMM Lab",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const ok = await ensureNotificationPermissions();
  if (!ok) return null;
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function addNotificationReceivedListener(
  cb: (n: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(cb);
}

export function addNotificationResponseListener(
  cb: (r: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(cb);
}
