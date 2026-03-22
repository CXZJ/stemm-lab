import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseApp } from "@/services/firebase/config";
import type { Team } from "@/types/models";
import { newId, slugify } from "@/lib/id";

function db() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFirestore(app);
}

export async function createTeamOnServer(input: {
  name: string;
  gradeLevel: string;
  memberNames: string[];
  createdByUid: string;
}): Promise<Team> {
  const firestore = db();
  if (!firestore) throw new Error("Firebase is not configured");
  const discriminator = (await newId()).slice(0, 6).toUpperCase();
  const base = slugify(input.name) || "team";
  const id = `${base}-${discriminator}`;
  const team: Team = {
    id,
    name: input.name,
    discriminator,
    gradeLevel: input.gradeLevel,
    memberNames: input.memberNames,
    createdByUid: input.createdByUid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(doc(firestore, "teams", id), {
    ...team,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  for (let i = 0; i < input.memberNames.length; i++) {
    const memberId = `${id}_${i}`;
    await setDoc(doc(firestore, "teamMembers", memberId), {
      id: memberId,
      teamId: id,
      userId: input.createdByUid,
      firstName: input.memberNames[i],
      gradeLevel: input.gradeLevel,
      createdAt: serverTimestamp(),
    });
  }
  return team;
}

export async function fetchTeam(teamId: string): Promise<Team | null> {
  const firestore = db();
  if (!firestore) return null;
  const snap = await getDoc(doc(firestore, "teams", teamId));
  if (!snap.exists()) return null;
  const d = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    name: String(d.name ?? ""),
    discriminator: String(d.discriminator ?? ""),
    gradeLevel: String(d.gradeLevel ?? ""),
    memberNames: Array.isArray(d.memberNames) ? (d.memberNames as string[]) : [],
    createdByUid: String(d.createdByUid ?? ""),
    createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
  };
}

export async function updateTeamOnServer(
  teamId: string,
  patch: Partial<Pick<Team, "name" | "gradeLevel" | "memberNames">>,
): Promise<void> {
  const firestore = db();
  if (!firestore) throw new Error("Firebase is not configured");
  await updateDoc(doc(firestore, "teams", teamId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}
