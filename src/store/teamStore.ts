import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createTeamOnServer, fetchTeam, updateTeamOnServer } from "@/services/firebase/teamService";
import { updateUserTeamId, fetchUserTeamId } from "@/services/firebase/authService";
import type { Team } from "@/types/models";

/** @deprecated Single shared key — migrated to per-user keys on hydrate. */
const LEGACY_KEY = "stemm_team_profile_v1";

function teamKey(uid: string) {
  return `stemm_team_profile_v1_${uid}`;
}

interface TeamState {
  team: Team | null;
  hydrated: boolean;
  activeUid: string | null;
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
  /** Clears in-memory team and removes this user's cached team from the device. */
  clear: () => Promise<void>;
  /** Clears in-memory team when signing out (keeps per-user cache for next login). */
  resetForSignOut: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  team: null,
  hydrated: false,
  activeUid: null,

  hydrate: async (uid?: string) => {
    if (!uid) {
      set({ team: null, hydrated: true, activeUid: null });
      return;
    }

    set({ hydrated: false, activeUid: uid });

    let serverTeamId: string | undefined;
    try {
      serverTeamId = await fetchUserTeamId(uid);
    } catch {
      /* offline — use local cache if it matches uid */
    }

    const migrateLegacyCache = async (): Promise<Team | null> => {
      const legacy = await AsyncStorage.getItem(LEGACY_KEY);
      if (!legacy) return null;
      try {
        const parsed = JSON.parse(legacy) as Team;
        const ok =
          parsed.createdByUid === uid ||
          (serverTeamId != null && parsed.id === serverTeamId);
        await AsyncStorage.removeItem(LEGACY_KEY);
        if (!ok) return null;
        await AsyncStorage.setItem(teamKey(uid), legacy);
        return parsed;
      } catch {
        await AsyncStorage.removeItem(LEGACY_KEY);
        return null;
      }
    };

    const raw =
      (await AsyncStorage.getItem(teamKey(uid))) ??
      (await migrateLegacyCache().then((t) => (t ? JSON.stringify(t) : null)));

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Team;
        if (serverTeamId && parsed.id !== serverTeamId) {
          await AsyncStorage.removeItem(teamKey(uid));
        } else {
          set({ team: parsed, hydrated: true, activeUid: uid });
          return;
        }
      } catch {
        await AsyncStorage.removeItem(teamKey(uid));
      }
    }

    if (serverTeamId) {
      try {
        const remote = await fetchTeam(serverTeamId);
        if (remote) {
          await AsyncStorage.setItem(teamKey(uid), JSON.stringify(remote));
          set({ team: remote, hydrated: true, activeUid: uid });
          return;
        }
      } catch {
        /* offline and no valid cache */
      }
    }

    set({ team: null, hydrated: true, activeUid: uid });
  },

  saveLocalTeam: async (team) => {
    const uid = get().activeUid ?? team.createdByUid;
    if (uid) {
      await AsyncStorage.setItem(teamKey(uid), JSON.stringify(team));
    }
    set({ team });
  },

  createTeam: async ({ name, gradeLevel, memberNames, uid, useRemote }) => {
    set({ activeUid: uid });
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
    set({ hydrated: true, activeUid: uid });
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
    const uid = get().activeUid;
    if (uid) {
      await AsyncStorage.removeItem(teamKey(uid));
    }
    set({ team: null, hydrated: true, activeUid: uid });
  },

  resetForSignOut: () => {
    set({ team: null, hydrated: false, activeUid: null });
  },
}));

export async function refreshTeamFromServer(teamId: string): Promise<void> {
  const remote = await fetchTeam(teamId);
  if (!remote) return;
  const uid = useTeamStore.getState().activeUid;
  if (uid) {
    await AsyncStorage.setItem(teamKey(uid), JSON.stringify(remote));
  }
  useTeamStore.setState({ team: remote });
}
