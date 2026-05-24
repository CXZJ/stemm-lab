import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const KEY = "stemm_settings_v1";

export type ThemePreference = "system" | "light" | "dark";

interface SettingsState {
  primarySchoolMode: boolean;
  themePreference: ThemePreference;
  ttsEnabled: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPrimarySchoolMode: (v: boolean) => Promise<void>;
  setThemePreference: (v: ThemePreference) => Promise<void>;
  setTtsEnabled: (v: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  primarySchoolMode: true,
  themePreference: "system",
  ttsEnabled: false,
  hydrated: false,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      try {
        const j = JSON.parse(raw) as {
          primarySchoolMode?: boolean;
          themePreference?: ThemePreference;
          ttsEnabled?: boolean;
        };
        set({
          primarySchoolMode: j.primarySchoolMode ?? true,
          themePreference: j.themePreference ?? "system",
          ttsEnabled: j.ttsEnabled ?? false,
          hydrated: true,
        });
        return;
      } catch {
        /* ignore */
      }
    }
    set({ hydrated: true });
  },

  setPrimarySchoolMode: async (v) => {
    set({ primarySchoolMode: v });
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        primarySchoolMode: v,
        themePreference: get().themePreference,
        ttsEnabled: get().ttsEnabled,
      }),
    );
  },

  setThemePreference: async (v) => {
    set({ themePreference: v });
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        primarySchoolMode: get().primarySchoolMode,
        themePreference: v,
        ttsEnabled: get().ttsEnabled,
      }),
    );
  },

  setTtsEnabled: async (v) => {
    set({ ttsEnabled: v });
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        primarySchoolMode: get().primarySchoolMode,
        themePreference: get().themePreference,
        ttsEnabled: v,
      }),
    );
  },
}));