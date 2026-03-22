/* eslint-env node */
const path = require("path");

/**
 * Load `.env` before reading any process.env below (same resolution as `expo start`).
 * If variables are missing in the app, confirm `.env` is saved to disk (not only in the editor).
 */
try {
  const { loadProjectEnv } = require("@expo/env");
  loadProjectEnv(path.resolve(__dirname), { silent: true });
} catch {
  /* optional during odd tooling contexts */
}

function firebaseExtra() {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
  };
}

/**
 * STEMM Lab — Expo config for Dev Client (camera, sensors, ads, maps, notifications).
 * Set EXPO_PUBLIC_* and AdMob app IDs in .env (see .env.example).
 */
module.exports = ({ config }) => ({
  ...config,
  name: "STEMM Lab",
  // Must match the slug of the Expo project for extra.eas.projectId (expo.dev/projects/…).
  slug: "my-app",
  version: "1.0.0",
  scheme: "stemm-lab",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.stemmlab.app",
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ?? "",
    },
    infoPlist: {
      UIBackgroundModes: ["fetch", "remote-notification"],
    },
  },
  android: {
    package: "com.stemmlab.app",
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? "",
      },
    },
    adaptiveIcon: {
      backgroundColor: "#1B4D3E",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? undefined,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#1B4D3E",
        dark: { backgroundColor: "#0D2818" },
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "STEMM Lab needs camera access to record experiment videos and photos.",
        microphonePermission:
          "STEMM Lab needs the microphone for sound activities and video audio.",
        recordAudioAndroid: true,
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "STEMM Lab uses your location to tag measurements on a map.",
        locationWhenInUsePermission:
          "STEMM Lab uses your location to tag measurements on a map.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#1B4D3E",
        sounds: [],
        mode: "production",
      },
    ],
    "expo-sqlite",
    [
      "expo-build-properties",
      {
        android: { compileSdkVersion: 35, targetSdkVersion: 35, minSdkVersion: 24 },
        ios: { deploymentTarget: "15.1" },
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId:
          process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ??
          "ca-app-pub-3940256099942544~3347511713",
        iosAppId:
          process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ??
          "ca-app-pub-3940256099942544~1458002511",
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ?? "9ec7891e-78e2-42fc-b9b0-68afaa8bb782",
    },
    /** Mirrored from EXPO_PUBLIC_FIREBASE_* so the app reads config even if Metro omits env inlining. */
    firebase: firebaseExtra(),
  },
  owner: config.owner,
});
