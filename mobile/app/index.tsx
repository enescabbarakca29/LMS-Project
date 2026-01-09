import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { getToken } from "../src/storage/token";

export default function Index() {
  useEffect(() => {
    (async () => {
      const token = await getToken();
      router.replace(token ? "/(tabs)" : "/login");
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
