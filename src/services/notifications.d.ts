export declare function ensureNotificationPermissions(): Promise<boolean>;
export declare function registerPushToken(): Promise<string | null>;
export declare function addNotificationReceivedListener(
  cb: (n: unknown) => void,
): { remove: () => void };
export declare function addNotificationResponseListener(
  cb: (r: unknown) => void,
): { remove: () => void };
