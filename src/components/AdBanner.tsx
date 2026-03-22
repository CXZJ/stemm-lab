import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { StemText } from "@/components/ui/StemText";
import { isRunningInExpoGo } from "@/lib/expoGo";
import { useStemTheme } from "@/theme/ThemeProvider";

type GoogleAdsModule = typeof import("react-native-google-mobile-ads");

export function AdBanner() {
  const t = useStemTheme();
  const [ads, setAds] = useState<GoogleAdsModule | null>(null);

  useEffect(() => {
    if (isRunningInExpoGo()) return;
    let cancelled = false;
    void import("react-native-google-mobile-ads").then((mod) => {
      if (!cancelled) setAds(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isRunningInExpoGo()) {
    return (
      <View style={[styles.box, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
        <StemText variant="caption" style={{ color: t.colors.muted }}>
          Ads are disabled in Expo Go. Use a dev build for AdMob.
        </StemText>
      </View>
    );
  }

  if (!ads) {
    return (
      <View style={[styles.box, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
        <StemText variant="caption" style={{ color: t.colors.muted }}>
          Loading…
        </StemText>
      </View>
    );
  }

  const { BannerAd, BannerAdSize, TestIds } = ads;
  const androidUnit = process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ?? TestIds.BANNER;
  const iosUnit = process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? TestIds.BANNER;
  const unitId = __DEV__ ? TestIds.BANNER : Platform.select({ ios: iosUnit, default: androidUnit });

  return (
    <View style={[styles.box, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
      <StemText variant="caption" style={{ color: t.colors.muted, marginBottom: 6 }}>
        Advertisement
      </StemText>
      <BannerAd unitId={unitId!} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
  },
});
