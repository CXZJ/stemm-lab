import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebaseApp } from "@/services/firebase/config";
import type { ActivityAttempt } from "@/types/models";

function db() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFirestore(app);
}

export async function saveAttemptRemote(attempt: ActivityAttempt): Promise<void> {
  const firestore = db();
  if (!firestore) throw new Error("Firebase is not configured");
  const payload = JSON.parse(JSON.stringify(attempt)) as ActivityAttempt;
  await setDoc(doc(firestore, "attempts", attempt.id), {
    ...payload,
    submittedAt: payload.submittedAt ?? Date.now(),
    updatedAt: serverTimestamp(),
  });
}

export async function loadAttemptsForTeamActivity(
  teamId: string,
  activityId: string,
  max = 50,
): Promise<ActivityAttempt[]> {
  const firestore = db();
  if (!firestore) return [];
  const q = query(
    collection(firestore, "attempts"),
    where("teamId", "==", teamId),
    where("activityId", "==", activityId),
    limit(max),
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => d.data() as ActivityAttempt);
  return rows.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}

export function subscribeAttempts(
  teamId: string,
  activityId: string,
  onData: (rows: ActivityAttempt[]) => void,
): () => void {
  const firestore = db();
  if (!firestore) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(firestore, "attempts"),
    where("teamId", "==", teamId),
    where("activityId", "==", activityId),
    limit(30),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => d.data() as ActivityAttempt);
      rows.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
      onData(rows);
    },
    () => onData([]),
  );
}
