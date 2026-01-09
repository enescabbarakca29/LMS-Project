import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "lms_biometric_enabled_v1";

export async function getBiometricEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === "1";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, enabled ? "1" : "0");
}
