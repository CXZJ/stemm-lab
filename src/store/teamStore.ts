import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createTeamOnServer, fetchTeam, updateTeamOnServer } from "@/services/firebase/teamService";
import { updateUserTeamId, fetchUserTeamId } from "@/services/firebase/authService";
import type { Team } from "@/types/models";

const KEY = "stemm_team_profile_v1";

interface TeamState {
  team: Team | null;
  hydrated: boolean;
  hydrate: (uid?: string) => Promise<void>;
  saveLocalTeam: (team: Team) => Promise<void>;
  createTeam: (input: {
    name: string;
    gradeLevel: string;
    memberNames: string[];
    uid: string;
    useRemote: boolean;
  }) => Promise<Team>;
  updateTeam: (patch: Partial<Pick<Team, "name" | "gradeLevel" | "memberNames">>) => Promise<void>;
  clear: () => Promise<void>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  team: null,
  hydrated: false,

  hydrate: async (uid?: string) => {
    console.log("[teamStore] hydrate() called");
    const raw = await AsyncStorage.getItem(KEY);
    console.log("[teamStore] raw value from AsyncStorage:", raw);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Team;
        console.log("[teamStore] parsed team:", parsed);
        set({ team: parsed, hydrated: true });
        return;
      } catch (e) {
        console.log("[teamStore] JSON parse error:", e);
      }
    }

    // AsyncStorage empty — fall back to Firebase
    if (uid) {
      try {
        console.log("[teamStore] no local team, checking Firebase for uid:", uid);
        const teamId = await fetchUserTeamId(uid);
        if (teamId) {
          const remote = await fetchTeam(teamId);
          if (remote) {
            console.log("[teamStore] synced team from Firebase:", remote);
            await AsyncStorage.setItem(KEY, JSON.stringify(remote));
            set({ team: remote, hydrated: true });
            return;
          }
        }
      } catch (e) {
        console.log("[teamStore] Firebase fallback error:", e);
      }
    }

    console.log("[teamStore] no team found anywhere, setting hydrated=true with null");
    set({ team: null, hydrated: true });
  },

  saveLocalTeam: async (team) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(team));
    set({ team });
  },

  createTeam: async ({ name, gradeLevel, memberNames, uid, useRemote }) => {
    let team: Team;
    if (useRemote) {
      team = await createTeamOnServer({
        name,
        gradeLevel,
        memberNames,
        createdByUid: uid,
      });
      await updateUserTeamId(uid, team.id);
    } else {
      const discriminator = Math.random().toString(36).slice(2, 8).toUpperCase();
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 20);
      team = {
        id: `${slug}-${discriminator}`,
        name,
        discriminator,
        gradeLevel,
        memberNames,
        createdByUid: uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    await get().saveLocalTeam(team);
    return team;
  },

  updateTeam: async (patch) => {
    const t = get().team;
    if (!t) return;
    const next = { ...t, ...patch, updatedAt: Date.now() };
    await get().saveLocalTeam(next);
    try {
      await updateTeamOnServer(t.id, patch);
    } catch {
      /* offline */
    }
  },

  clear: async () => {
    await AsyncStorage.removeItem(KEY);
    set({ team: null });
  },
}));

export async function refreshTeamFromServer(teamId: string): Promise<void> {
  const remote = await fetchTeam(teamId);
  if (remote) {
    await AsyncStorage.setItem(KEY, JSON.stringify(remote));
    useTeamStore.setState({ team: remote });
  }
}
