import {
  fetchUserTeamId,
  signInEmail,
  signOutUser,
  signUpEmail,
  subscribeAuth,
} from "@/services/firebase/authService";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { router } from "expo-router";
import type { User as FirebaseUser } from "firebase/auth";
import { create } from "zustand";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  ready: boolean;
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
  ready: false,
  teamId: undefined,
  initializing: true,
  error: null,

  init: () => {
    if (!isFirebaseConfigured()) {
      set({ firebaseUser: null, teamId: undefined, initializing: false, ready: true });
      return () => {};
    }
    return subscribeAuth(async (u) => {
      let teamId;
      if (u) teamId = await fetchUserTeamId(u.uid);
      set({ firebaseUser: u, teamId, initializing: false, ready: true, error: null });
    });
  },

  signIn: async (email, password) => {
    set({ error: null });
    try {
      await signInEmail(email, password);
      await get().refreshTeamId();
    } catch (e: any) {
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
    try {
      await signOutUser();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      set({ firebaseUser: null, teamId: undefined });
      // FORCE the redirect here
      router.replace("/(auth)/sign-in"); 
    }
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