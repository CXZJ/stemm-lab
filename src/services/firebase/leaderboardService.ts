import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseApp } from "@/services/firebase/config";
import { compareLeaderboardMetrics } from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types/models";

function db() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFirestore(app);
}

function boardDocId(activityId: string, gradeLevel: string) {
  return `${activityId}__${gradeLevel || "all"}`;
}

export async function upsertLeaderboardEntry(
  entry: LeaderboardEntry,
  higherIsBetter: boolean,
): Promise<void> {
  const firestore = db();
  if (!firestore) throw new Error("Firebase is not configured");
  const parent = boardDocId(entry.activityId, entry.gradeLevel);
  const ref = doc(firestore, "leaderboards", parent, "entries", entry.id);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const prev = existing.data() as LeaderboardEntry;
    const prevBest = prev.bestScore ?? prev.metricValue;
    const newBest = entry.bestScore ?? entry.metricValue ?? 0;
    if (typeof prevBest === "number" && !Number.isNaN(prevBest) && newBest > 0) {
      entry.bestScore = higherIsBetter ? Math.max(prevBest, newBest) : Math.min(prevBest, newBest);
    } else {
      entry.bestScore = newBest;
    }
    entry.metricValue = entry.bestScore;
    entry.completionCount = Math.max(prev.completionCount ?? 0, entry.completionCount ?? 1);
  } else {
    entry.bestScore = entry.bestScore ?? entry.metricValue ?? 0;
    entry.metricValue = entry.bestScore;
  }

  await setDoc(
    ref,
    {
      ...entry,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeLeaderboard(
  activityId: string,
  gradeLevel: string,
  options: {
    higherIsBetter: boolean;
    onData: (rows: LeaderboardEntry[]) => void;
  },
): () => void {
  const { higherIsBetter, onData } = options;
  if (typeof onData !== "function") {
    console.warn("subscribeLeaderboard: onData callback is missing");
    return () => {};
  }
  const firestore = db();
  if (!firestore) {
    onData([]);
    return () => {};
  }
  const parent = boardDocId(activityId, gradeLevel);
  const q = query(collection(firestore, "leaderboards", parent, "entries"));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => d.data() as LeaderboardEntry);
      rows.sort((a, b) =>
        compareLeaderboardMetrics(a.metricValue ?? 0, b.metricValue ?? 0, higherIsBetter),
      );
      onData(rows);
    },
    () => onData([]),
  );
}

export function subscribeAllGradesLeaderboard(
  activityId: string,
  onData: (rows: LeaderboardEntry[]) => void,
): () => void {
  const firestore = db();
  if (!firestore) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(firestore, "leaderboards", boardDocId(activityId, "all"), "entries"),
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as LeaderboardEntry)),
    () => onData([]),
  );
}
