/** Push / local notifications are not wired for web preview builds. */

export async function ensureNotificationPermissions(): Promise<boolean> {
  return false;
}

export async function registerPushToken(): Promise<string | null> {
  return null;
}

export function addNotificationReceivedListener(_cb: (n: unknown) => void) {
  return { remove: () => {} };
}

export function addNotificationResponseListener(_cb: (r: unknown) => void) {
  return { remove: () => {} };
}
