import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { t } from "@/src/i18n";

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#2563EB",
        tabBarStyle: {
          backgroundColor: isDark ? "#0B0F19" : "#FFFFFF",
          borderTopColor: isDark ? "#111827" : "#E5E7EB",
        },
        headerStyle: {
          backgroundColor: isDark ? "#0B0F19" : "#FFFFFF",
        },
        headerTitleStyle: {
          color: isDark ? "#F9FAFB" : "#111827",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("courses"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="omr"
        options={{
          title: t("optic"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore", // ✅ i18n key yoksa böyle bırak
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
