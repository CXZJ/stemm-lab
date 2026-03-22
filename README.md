# STEMM Lab

Expo SDK 54 React Native app for upper-primary / lower-high STEMM challenges: teams, timed activities, media and sensor evidence, offline-first SQLite storage, Firebase sync, leaderboards, notifications, and AdMob (test IDs by default).

## Prerequisites

- Node.js 20+
- EAS CLI: either `npm i -g eas-cli` (then run `eas …`) or use **`npx eas-cli …`** so you do not need a global install
- Firebase project (Auth, Firestore, Storage) and optional FCM for push
- Google Maps API keys (iOS + Android) if you use map views outdoors
- AdMob app IDs (use Google test IDs in development)

## Configure environment

1. Copy `.env.example` to `.env`.
2. Fill `EXPO_PUBLIC_FIREBASE_*` from the Firebase web app config.
3. Add Maps keys and AdMob unit IDs as needed.
4. For Android FCM, set `GOOGLE_SERVICES_JSON` to the path of `google-services.json` in EAS secrets or local env when building.

## Run in Expo Dev Client

Managed Expo Go cannot load all native modules used here (Ads, background tasks, full camera pipeline). Use a **development build**:

```bash
npm install
npx expo prebuild
# or skip prebuild and use EAS (npx works if `eas` is not on your PATH):
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
```

Install the build on a device or emulator, then:

```bash
npm run dev:client
```

Open the project from the dev-client app.

## Firebase rules

Sample rules live in `firebase/firestore.rules` and `firebase/storage.rules`. Deploy with the Firebase CLI and tighten further (e.g. custom claims for `teamId`) for production.

## Project layout

- `app/` — Expo Router screens (auth, onboarding, tabs, activities, sync, notifications).
- `src/activities/` — Schema-driven definitions for all seven activities.
- `src/components/activity/` — Shared `ActivityEngine` plus extensions (reaction board, breathing, sound meter, room map).
- `src/services/` — Firebase, SQLite, sync/background, notifications, ads init.
- `src/store/` — Zustand stores (auth, team, settings, notifications).
- `src/lib/calculations/` — Physics helpers used by the activity engine.

## Scripts

| Script            | Purpose                    |
| ----------------- | -------------------------- |
| `npm start`       | Expo Metro bundler         |
| `npm run dev:client` | Start with dev client   |
| `npm run lint`    | ESLint (Expo config)       |

## Notes

- **Web preview**: `expo-sqlite`’s WASM file is not bundled reliably for web; the app uses `database.web.ts` (in-memory + `localStorage`) instead of native SQLite. Background sync and push registration are no-ops on web (`backgroundSync.web.ts`, `notifications.web.ts`).
- **Expo slug** is `my-app` so it stays aligned with the existing EAS project ID in `app.config.js`. The store / home-screen name is still **STEMM Lab** (`name`). To use slug `stemm-lab` instead, create or link a new Expo project (`eas init`) and update `extra.eas.projectId`.
- Offline: attempts and media upload tasks are queued in SQLite and processed when the device is online (`processSyncQueueOnce`, background fetch task).
- Typed routes are relaxed via `src/navigation/href.ts` where dynamic paths are required.
- Replace AdMob test IDs before release and complete platform privacy / consent flows for your region.
