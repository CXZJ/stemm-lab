import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AdBanner } from "@/components/AdBanner";
import { View } from "react-native";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function TabsLayout() {
  const t = useStemTheme();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: t.colors.primary,
          tabBarInactiveTintColor: t.colors.muted,
          tabBarStyle: { backgroundColor: t.colors.card, borderTopColor: t.colors.border },
          headerStyle: { backgroundColor: t.colors.card },
          headerTintColor: t.colors.text,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="activities"
          options={{
            title: "Activities",
            tabBarIcon: ({ color, size }) => <Ionicons name="flask" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="team"
          options={{
            title: "Team",
            tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: "Leaderboard",
            tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
          }}
        />
      </Tabs>
      <AdBanner />
    </View>
  );
}
