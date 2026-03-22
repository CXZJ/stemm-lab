import Constants from "expo-constants";

/** True when running inside the Expo Go app (not a dev or production build). */
export function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}
