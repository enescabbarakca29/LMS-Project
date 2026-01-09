import { Platform } from "react-native";

// Web'de expo-camera hiç import edilmesin diye native ekranı ayrı dosyada tutuyoruz.
export default function OptikTab() {
  if (Platform.OS === "web") {
    const Web = require("./explore.web").default;
    return <Web />;
  }

  const Native = require("./explore.native").default;
  return <Native />;
}
