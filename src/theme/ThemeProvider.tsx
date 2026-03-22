import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme, type ColorSchemeName } from "react-native";
import { stemColors } from "@/theme/tokens";
import { useSettingsStore } from "@/store/settingsStore";

export type StemTheme = {
  scheme: "light" | "dark";
  colors: {
    bg: string;
    card: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
    accent: string;
    danger: string;
    success: string;
    warning: string;
  };
};

const Ctx = createContext<StemTheme | null>(null);

function resolveScheme(pref: string, system: ColorSchemeName): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  return system === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useSettingsStore((s) => s.themePreference);
  const scheme = resolveScheme(pref, system);

  const value = useMemo<StemTheme>(() => {
    const dark = scheme === "dark";
    return {
      scheme,
      colors: {
        bg: dark ? stemColors.surfaceDark : stemColors.surface,
        card: dark ? stemColors.cardDark : stemColors.card,
        text: dark ? stemColors.textDark : stemColors.text,
        muted: dark ? stemColors.mutedDark : stemColors.muted,
        border: dark ? stemColors.borderDark : stemColors.border,
        primary: stemColors.primaryLight,
        accent: stemColors.accent,
        danger: stemColors.danger,
        success: stemColors.success,
        warning: stemColors.warning,
      },
    };
  }, [scheme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStemTheme(): StemTheme {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStemTheme outside ThemeProvider");
  return v;
}
