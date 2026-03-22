import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseApp } from "@/services/firebase/config";
import type { LeaderboardEntry } from "@/types/models";

function db() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFirestore(app);
}

function boardDocId(activityId: string, gradeLevel: string) {
  return `${activityId}__${gradeLevel || "all"}`;
}

export async function upsertLeaderboardEntry(entry: LeaderboardEntry): Promise<void> {
  const firestore = db();
  if (!firestore) throw new Error("Firebase is not configured");
  const parent = boardDocId(entry.activityId, entry.gradeLevel);
  await setDoc(
    doc(firestore, "leaderboards", parent, "entries", entry.id),
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
  onData: (rows: LeaderboardEntry[]) => void,
): () => void {
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
      rows.sort((a, b) => (b.metricValue ?? 0) - (a.metricValue ?? 0));
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
