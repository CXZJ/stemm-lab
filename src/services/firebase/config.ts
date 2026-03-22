import Constants from "expo-constants";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

type FirebaseExtra = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

function fromExpoExtra(): FirebaseExtra | undefined {
  const extra = Constants.expoConfig?.extra as { firebase?: FirebaseExtra } | undefined;
  return extra?.firebase;
}

const extra = fromExpoExtra();

const firebaseConfig = {
  apiKey: extra?.apiKey ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: extra?.authDomain ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: extra?.projectId ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: extra?.storageBucket ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId:
    extra?.messagingSenderId ?? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: extra?.appId ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: extra?.measurementId ?? process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    return app;
  }
  return getApps()[0] ?? null;
}
