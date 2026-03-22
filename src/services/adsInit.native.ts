import { isRunningInExpoGo } from "@/lib/expoGo";

export async function initMobileAds(): Promise<void> {
  if (isRunningInExpoGo()) return;
  const { default: mobileAds } = await import("react-native-google-mobile-ads");
  await mobileAds().initialize().catch(() => {});
}
