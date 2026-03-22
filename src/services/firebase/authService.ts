import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseApp } from "@/services/firebase/config";

function auth() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

function db() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFirestore(app);
}

export function subscribeAuth(cb: (user: User | null) => void) {
  const a = auth();
  if (!a) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(a, cb);
}

export async function signUpEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const a = auth();
  if (!a) throw new Error("Firebase is not configured");
  const cred = await createUserWithEmailAndPassword(a, email, password);
  if (displayName)
    await updateProfile(cred.user, { displayName }).catch(() => {});
  const firestore = db();
  if (firestore) {
    await setDoc(
      doc(firestore, "users", cred.user.uid),
      {
        email: cred.user.email,
        displayName,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
  return cred.user;
}

export async function signInEmail(email: string, password: string): Promise<User> {
  const a = auth();
  if (!a) throw new Error("Firebase is not configured");
  const cred = await signInWithEmailAndPassword(a, email, password);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  const a = auth();
  if (!a) return;
  await signOut(a);
}

export async function fetchUserTeamId(uid: string): Promise<string | undefined> {
  const firestore = db();
  if (!firestore) return undefined;
  const snap = await getDoc(doc(firestore, "users", uid));
  const data = snap.data() as { teamId?: string } | undefined;
  return data?.teamId;
}

export async function updateUserTeamId(uid: string, teamId: string): Promise<void> {
  const firestore = db();
  if (!firestore) throw new Error("Firebase is not configured");
  await setDoc(
    doc(firestore, "users", uid),
    { teamId, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
