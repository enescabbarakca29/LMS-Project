import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "token";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return await AsyncStorage.getItem(KEY);
  }
  const SecureStore = await import("expo-secure-store");
  return await SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(KEY, token);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(KEY);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.deleteItemAsync(KEY);
}
