import type { User as FirebaseUser } from "firebase/auth";
import { create } from "zustand";
import {
  fetchUserTeamId,
  signInEmail,
  signOutUser,
  signUpEmail,
  subscribeAuth,
} from "@/services/firebase/authService";
import { isFirebaseConfigured } from "@/services/firebase/config";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  teamId: string | undefined;
  initializing: boolean;
  error: string | null;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshTeamId: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  teamId: undefined,
  initializing: true,
  error: null,

  init: () => {
    if (!isFirebaseConfigured()) {
      set({ firebaseUser: null, teamId: undefined, initializing: false });
      return () => {};
    }
    return subscribeAuth(async (u) => {
      let teamId: string | undefined;
      if (u) {
        teamId = await fetchUserTeamId(u.uid);
      }
      set({
        firebaseUser: u,
        teamId,
        initializing: false,
        error: null,
      });
    });
  },

  signIn: async (email, password) => {
    set({ error: null });
    try {
      await signInEmail(email, password);
      await get().refreshTeamId();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Sign in failed" });
      throw e;
    }
  },

  signUp: async (email, password, displayName) => {
    set({ error: null });
    try {
      await signUpEmail(email, password, displayName);
      await get().refreshTeamId();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Sign up failed" });
      throw e;
    }
  },

  signOut: async () => {
    await signOutUser();
    set({ firebaseUser: null, teamId: undefined });
  },

  refreshTeamId: async () => {
    const u = get().firebaseUser;
    if (!u) {
      set({ teamId: undefined });
      return;
    }
    const teamId = await fetchUserTeamId(u.uid);
    set({ teamId });
  },
}));
